# -*- coding: utf-8 -*-
"""
HeliXpert Dynamic Query Engine
Parses natural language questions into SQL and returns answers from the DB.
Zero hardcoded answers — everything comes from the live dataset.

DB schema (confirmed):
  helicopters        : helicopter_id, model, manufacturer, variant, helicopter_type,
                       rotor_configuration, country, data_status, source_id
  sensor_parameters  : id, trq_measured, oat, mgt, pa, ias, np, ng, faulty, trq_margin, source_id
  maintenance_records: IDENT, PROBLEM, PROBLEM_TYPE, LOCATION, PROBLEM_PART,
                       TAGGEDPROBLEM, EFFECT, ACTION, ACTION_TYPE, INSTALL_REPLACE_WITH,
                       ACTION_PART, TAGGEDACTION, CAUSE, source_id
  components         : component_id, component_type, component_name, description, source_type
  faults_summary     : dataset_id, observation_id, fault_type, health_state, confidence,
                       detection_method, source_id
"""
from __future__ import annotations

import re
import logging
from typing import Any, Dict, List, Optional

from backend.ai.sql_agent import execute_safe_sql

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Schema definition — single source of truth
# ---------------------------------------------------------------------------

SCHEMA: Dict[str, Dict] = {
    "helicopters": {
        "table":   "helicopters",
        "columns": ["helicopter_id", "model", "manufacturer", "variant",
                    "helicopter_type", "rotor_configuration", "country", "data_status"],
        "display": ["model", "manufacturer", "variant", "helicopter_type", "country"],
        "label":   {"en": "helicopters", "hi": "हेलीकॉप्टर", "kn": "ಹೆಲಿಕಾಪ್ಟರ್‌ಗಳು"},
        # Keywords — more specific first; avoids false-positive matches
        "keywords": [
            "helicopter", "aircraft", "fleet", "airframe", "rotorcraft",
            "हेलीकॉप्टर", "विमान", "ಹೆಲಿಕಾಪ್ಟರ್", "ವಿಮಾನ",
        ],
    },
    "sensors": {
        "table":   "sensor_parameters",
        "columns": ["id", "mgt", "oat", "trq_measured", "trq_margin", "ng", "np",
                    "pa", "ias", "faulty"],
        "display": ["id", "mgt", "oat", "trq_measured", "trq_margin", "ng", "np", "faulty"],
        "label":   {"en": "sensor observations", "hi": "सेंसर अवलोकन", "kn": "ಸೆನ್ಸರ್ ಅವಲೋಕನಗಳು"},
        "keywords": [
            "sensor", "observation", "reading", "telemetry", "phm",
            "mgt", "oat", "torque", "trq", "ng", "np", "turbine", "engine health",
            "faulty", "fault", "anomaly", "defect", "healthy", "unhealthy",
            "सेंसर", "तापमान", "टॉर्क", "ಸೆನ್ಸರ್", "ತಾಪಮಾನ", "ಟಾರ್ಕ್",
        ],
    },
    "maintenance": {
        "table":   "maintenance_records",
        "columns": ["IDENT", "PROBLEM", "PROBLEM_TYPE", "LOCATION", "PROBLEM_PART",
                    "TAGGEDPROBLEM", "EFFECT", "ACTION", "ACTION_TYPE",
                    "INSTALL_REPLACE_WITH", "ACTION_PART", "TAGGEDACTION", "CAUSE"],
        "display": ["IDENT", "PROBLEM", "PROBLEM_TYPE", "LOCATION", "ACTION", "CAUSE"],
        "label":   {"en": "maintenance records", "hi": "रखरखाव रिकॉर्ड", "kn": "ನಿರ್ವಹಣೆ ದಾಖಲೆಗಳು"},
        "keywords": [
            "maintenance", "repair", "logbook", "log book", "problem", "action",
            "cause", "effect", "corrective", "fix", "replaced", "removed",
            "रखरखाव", "मरम्मत", "समस्या", "ನಿರ್ವಹಣೆ", "ದುರಸ್ತಿ",
        ],
    },
    "components": {
        "table":   "components",
        "columns": ["component_id", "component_type", "component_name", "description", "source_type"],
        "display": ["component_type", "component_name", "description"],
        "label":   {"en": "components", "hi": "घटक", "kn": "ಘಟಕಗಳು"},
        "keywords": [
            "component", "part", "rotor", "gear", "blade", "cowl",
            "transmission", "hydraulic", "fuel", "avionics", "landing",
            "घटक", "भाग", "ಘಟಕ", "ಭಾಗ",
        ],
    },
    "faults": {
        "table":   "faults_summary",
        "columns": ["dataset_id", "observation_id", "fault_type", "health_state",
                    "confidence", "detection_method"],
        "display": ["observation_id", "fault_type", "health_state", "confidence"],
        "label":   {"en": "fault records", "hi": "दोष रिकॉर्ड", "kn": "ದೋಷ ದಾಖಲೆಗಳು"},
        "keywords": [
            "fault summary", "fault record", "health state",
        ],
    },
}

# ---------------------------------------------------------------------------
# Operation patterns — checked in priority order
# ---------------------------------------------------------------------------

_OP_PATTERNS: Dict[str, List[str]] = {
    "COUNT":    ["how many", "count", "total number", "number of", "कितने", "संख्या", "ಎಷ್ಟು", "ಸಂಖ್ಯೆ"],
    "AVERAGE":  ["average", "avg", "mean", "औसत", "माध्य", "ಸರಾಸರಿ"],
    "MAX":      ["maximum", "highest", "max", "peak", "top", "अधिकतम", "ಗರಿಷ್ಠ"],
    "MIN":      ["minimum", "lowest", "min", "bottom", "न्यूनतम", "ಕನಿಷ್ಠ"],
    "TREND":    ["trend", "over time", "change", "distribution", "breakdown", "spread"],
    "GROUP_BY": ["by type", "by category", "by location", "by manufacturer", "by model",
                 "each type", "per type", "group by", "grouped", "प्रकार से", "ಪ್ರಕಾರ"],
    "SEARCH":   ["search", "find", "lookup", "where", "with problem", "related to",
                 "about", "containing", "ढूंढो", "खोज", "ಹುಡುಕು"],
    "DESCRIBE": ["describe", "what is", "tell me about", "explain", "detail",
                 "विवरण", "बताओ", "ವಿವರಣೆ"],
    "LIST":     ["list", "show", "display", "give me", "what are", "सूची", "दिखाओ", "ಪಟ್ಟಿ"],
}

# Sensor metric aliases
_METRIC_MAP: Dict[str, str] = {
    "mgt":          "mgt",
    "mean gas temperature": "mgt",
    "gas temperature":  "mgt",
    "temperature":  "mgt",
    "oat":          "oat",
    "outside air":  "oat",
    "ambient":      "oat",
    "torque":       "trq_measured",
    "trq":          "trq_measured",
    "trq_measured": "trq_measured",
    "torque margin":"trq_margin",
    "trq_margin":   "trq_margin",
    "margin":       "trq_margin",
    "ng":           "ng",
    "gas generator":"ng",
    "compressor speed": "ng",
    "np":           "np",
    "power turbine":"np",
    "turbine speed":"np",
    "pa":           "pa",
    "pressure altitude": "pa",
    "altitude":     "pa",
    "ias":          "ias",
    "airspeed":     "ias",
    "indicated airspeed": "ias",
}

# Maintenance column aliases for SEARCH/FILTER
_MAINT_FIELD_MAP: Dict[str, str] = {
    "problem":       "PROBLEM",
    "issue":         "PROBLEM",
    "fault":         "PROBLEM",
    "action":        "ACTION",
    "fix":           "ACTION",
    "repair":        "ACTION",
    "cause":         "CAUSE",
    "reason":        "CAUSE",
    "location":      "LOCATION",
    "where":         "LOCATION",
    "part":          "PROBLEM_PART",
    "component":     "PROBLEM_PART",
    "type":          "PROBLEM_TYPE",
    "category":      "PROBLEM_TYPE",
    "effect":        "EFFECT",
    "impact":        "EFFECT",
    "install":       "INSTALL_REPLACE_WITH",
    "replace":       "INSTALL_REPLACE_WITH",
}

# Helicopter column aliases
_HELI_FILTER_MAP: Dict[str, str] = {
    "airbus":       ("manufacturer", "Airbus"),
    "boeing":       ("manufacturer", "Boeing"),
    "sikorsky":     ("manufacturer", "Sikorsky"),
    "bell":         ("manufacturer", "Bell"),
    "eurocopter":   ("manufacturer", "Eurocopter"),
    "leonardo":     ("manufacturer", "Leonardo"),
    "mil":          ("manufacturer", "Mil"),
    "robinson":     ("manufacturer", "Robinson"),
    "light":        ("helicopter_type", "Light"),
    "medium":       ("helicopter_type", "Medium"),
    "heavy":        ("helicopter_type", "Heavy"),
    "military":     ("helicopter_type", "Military"),
    "civil":        ("helicopter_type", "Civil"),
}


class DynamicQueryEngine:
    """
    Converts natural-language questions into SQL and returns live DB results.
    No answer is ever hardcoded — every fact comes from the database.
    """

    def __init__(self, db_path: str):
        self.db_path = db_path  # kept for compatibility; sql_agent uses its own path

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _q(self, text: str) -> str:
        return text.lower().strip()

    def _detect_entity(self, query: str) -> Optional[Dict]:
        """
        Detect which table the question is about.
        Iterates in specificity order: faults → sensors → maintenance → components → helicopters.
        This order prevents 'engine' (sensor keyword) from matching 'helicopters' first.
        """
        priority = ["faults", "sensors", "maintenance", "components", "helicopters"]
        for name in priority:
            info = SCHEMA[name]
            for kw in info["keywords"]:
                if kw in query:
                    return {"name": name, **info}
        return None

    def _detect_operation(self, query: str) -> str:
        """Detect operation in priority order so COUNT always beats LIST."""
        for op in ["COUNT", "AVERAGE", "MAX", "MIN", "TREND", "GROUP_BY", "SEARCH", "DESCRIBE", "LIST"]:
            for pat in _OP_PATTERNS[op]:
                if pat in query:
                    return op
        return "LIST"

    def _detect_metric(self, query: str) -> Optional[str]:
        for alias, col in _METRIC_MAP.items():
            if alias in query:
                return col
        return None

    def _detect_group_by_field(self, query: str, entity_name: str) -> Optional[str]:
        if entity_name == "sensors":
            # Only group by fault when explicitly asking for a breakdown/distribution
            if any(t in query for t in ["by fault", "by health", "fault status",
                                         "health status", "group by", "breakdown",
                                         "distribution", "by faulty"]):
                return "faulty"
        if entity_name == "maintenance":
            if any(t in query for t in ["by type", "by category", "each type"]):
                return "PROBLEM_TYPE"
            if any(t in query for t in ["by location", "each location"]):
                return "LOCATION"
            if any(t in query for t in ["by cause", "each cause"]):
                return "CAUSE"
            if "action type" in query:
                return "ACTION_TYPE"
        if entity_name == "helicopters":
            if any(t in query for t in ["by manufacturer", "each manufacturer",
                                         "by maker", "by brand"]):
                return "manufacturer"
            if any(t in query for t in ["by type", "each type", "by category"]):
                return "helicopter_type"
            if any(t in query for t in ["by country", "each country"]):
                return "country"
        if entity_name == "components":
            if any(t in query for t in ["by type", "each type", "by category"]):
                return "component_type"
        return None

    def _build_where(self, query: str, entity_name: str) -> str:
        """Build a WHERE clause from natural language filters."""
        clauses = []

        if entity_name == "sensors":
            if any(t in query for t in ["faulty", "fault", "defect", "anomaly", "bad"]):
                clauses.append("faulty = 1")
            if any(t in query for t in ["healthy", "normal", "good", "nominal"]):
                clauses.append("faulty = 0")

        if entity_name == "helicopters":
            for kw, (col, val) in _HELI_FILTER_MAP.items():
                if kw in query:
                    clauses.append(f"LOWER({col}) LIKE '%{val.lower()}%'")
                    break

        if entity_name == "maintenance":
            # Search for a quoted term or a keyword after "with" / "about" / "for"
            m = re.search(r'"([^"]+)"', query)
            if m:
                term = m.group(1).replace("'", "''")
                clauses.append(
                    f"(PROBLEM LIKE '%{term}%' OR ACTION LIKE '%{term}%' "
                    f"OR CAUSE LIKE '%{term}%' OR LOCATION LIKE '%{term}%')"
                )
            else:
                for trigger in ["about", "with", "for", "related to", "involving", "containing"]:
                    pat = rf'{trigger}\s+([a-z][a-z0-9 ]{{2,30}}?)(?:\s+(?:in|at|on|of|and|\.|$)|\s*$)'
                    m2 = re.search(pat, query)
                    if m2:
                        term = m2.group(1).strip().replace("'", "''")
                        if len(term) > 2:
                            clauses.append(
                                f"(PROBLEM LIKE '%{term}%' OR ACTION LIKE '%{term}%' "
                                f"OR CAUSE LIKE '%{term}%' OR LOCATION LIKE '%{term}%')"
                            )
                        break

        return ("WHERE " + " AND ".join(clauses)) if clauses else ""

    def _get_count(self, table: str, where: str = "") -> int:
        """Get real COUNT(*) from DB."""
        result = execute_safe_sql(f"SELECT COUNT(*) AS total FROM {table} {where}")
        if result.get("success") and result.get("data"):
            return result["data"][0].get("total", 0)
        return 0

    # ------------------------------------------------------------------
    # SQL generation
    # ------------------------------------------------------------------

    def _build_sql(self, op: str, entity: Dict, where: str,
                   metric: Optional[str], group_field: Optional[str]) -> str:
        table   = entity["table"]
        display = ", ".join(entity["display"])

        if op == "COUNT":
            return f"SELECT COUNT(*) AS total FROM {table} {where}"

        if op == "AVERAGE":
            if metric:
                return (f"SELECT "
                        f"ROUND(AVG({metric}), 2) AS average, "
                        f"ROUND(MIN({metric}), 2) AS minimum, "
                        f"ROUND(MAX({metric}), 2) AS maximum, "
                        f"COUNT(*) AS observations "
                        f"FROM {table} {where}")
            # No specific metric — return averages for all numeric columns
            if entity["name"] == "sensors":
                return (f"SELECT "
                        f"ROUND(AVG(mgt),2) AS avg_mgt, "
                        f"ROUND(AVG(oat),2) AS avg_oat, "
                        f"ROUND(AVG(trq_measured),2) AS avg_torque, "
                        f"ROUND(AVG(trq_margin),2) AS avg_trq_margin, "
                        f"ROUND(AVG(ng),2) AS avg_ng, "
                        f"ROUND(AVG(np),2) AS avg_np, "
                        f"COUNT(*) AS observations "
                        f"FROM {table} {where}")
            return f"SELECT {display} FROM {table} {where} LIMIT 50"

        if op in ("MAX", "MIN"):
            order = "DESC" if op == "MAX" else "ASC"
            col   = metric if metric else (
                "mgt" if entity["name"] == "sensors" else entity["display"][0]
            )
            return f"SELECT {display} FROM {table} {where} ORDER BY {col} {order} LIMIT 20"

        if op == "GROUP_BY":
            field = group_field or entity["display"][0]
            return (f"SELECT {field}, COUNT(*) AS count "
                    f"FROM {table} {where} "
                    f"GROUP BY {field} ORDER BY count DESC")

        if op == "TREND":
            if entity["name"] == "sensors":
                col = metric or "mgt"
                return (f"SELECT id, {col}, faulty FROM {table} {where} "
                        f"ORDER BY id LIMIT 200")
            return f"SELECT {display} FROM {table} {where} LIMIT 100"

        if op == "SEARCH":
            return f"SELECT {display} FROM {table} {where} LIMIT 50"

        if op == "DESCRIBE":
            if entity["name"] == "components":
                return f"SELECT component_name, component_type, description FROM {table} {where} LIMIT 20"
            return f"SELECT {display} FROM {table} {where} LIMIT 20"

        # LIST (default)
        return f"SELECT {display} FROM {table} {where} LIMIT 50"

    # ------------------------------------------------------------------
    # Explanation generation — always uses real DB counts
    # ------------------------------------------------------------------

    def _explain(self, op: str, entity: Dict, data: List[Dict],
                 where: str, metric: Optional[str], lang: str) -> str:
        lbl   = entity["label"].get(lang, entity["label"]["en"])
        total = self._get_count(entity["table"], where)
        shown = len(data)

        if not data:
            msgs = {
                "en": f"No {lbl} found matching your query.",
                "hi": f"आपके प्रश्न से मेल खाने वाला कोई {lbl} नहीं मिला।",
                "kn": f"ನಿಮ್ಮ ಪ್ರಶ್ನೆಗೆ ಹೊಂದಾಣಿಕೆಯ {lbl} ಕಂಡುಬಂದಿಲ್ಲ.",
            }
            return msgs.get(lang, msgs["en"])

        if op == "COUNT":
            n = data[0].get("total", total)
            if lang == "hi":
                return f"डेटाबेस में **{n:,} {lbl}** हैं।"
            if lang == "kn":
                return f"ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ **{n:,} {lbl}** ಇವೆ."
            return f"There are **{n:,} {lbl}** in the database."

        if op == "AVERAGE":
            row = data[0]
            if metric:
                avg = row.get("average", "N/A")
                mn  = row.get("minimum", "N/A")
                mx  = row.get("maximum", "N/A")
                obs = row.get("observations", total)
                if lang == "hi":
                    return (f"{lbl} के लिए {metric.upper()}: "
                            f"औसत **{avg}**, न्यूनतम {mn}, अधिकतम {mx} "
                            f"({obs:,} अवलोकनों पर आधारित)।")
                if lang == "kn":
                    return (f"{lbl} ಗೆ {metric.upper()}: "
                            f"ಸರಾಸರಿ **{avg}**, ಕನಿಷ್ಠ {mn}, ಗರಿಷ್ಠ {mx} "
                            f"({obs:,} ಅವಲೋಕನಗಳ ಆಧಾರದ ಮೇಲೆ).")
                return (f"For {lbl} — {metric.upper()}: "
                        f"avg **{avg}**, min {mn}, max {mx} "
                        f"(across {obs:,} observations).")
            # All-metrics average
            parts = [f"{k.replace('avg_','').upper()} = **{v}**"
                     for k, v in row.items() if k.startswith("avg_") and v is not None]
            return f"Average sensor values ({row.get('observations',total):,} obs): " + ", ".join(parts) + "."

        if op == "GROUP_BY":
            lines = [f"  • {list(r.values())[0]}: **{list(r.values())[1]:,}**" for r in data]
            header = {
                "en": f"**{lbl} breakdown:**",
                "hi": f"**{lbl} श्रेणीवार:**",
                "kn": f"**{lbl} ವರ್ಗ ಅನುಸಾರ:**",
            }
            return header.get(lang, header["en"]) + "\n" + "\n".join(lines)

        if op in ("MAX", "MIN"):
            label = ("highest" if op == "MAX" else "lowest") if lang == "en" else \
                    ("उच्चतम" if op == "MAX" else "निम्नतम") if lang == "hi" else \
                    ("ಅತ್ಯಧಿಕ" if op == "MAX" else "ಕನಿಷ್ಠ")
            col = metric or ""
            if lang == "hi":
                return f"{col.upper()} के {label} मानों वाले **{shown} {lbl}** दिखाए गए हैं।"
            if lang == "kn":
                return f"{col.upper()} ನ {label} ಮೌಲ್ಯಗಳನ್ನು ಹೊಂದಿರುವ **{shown} {lbl}** ತೋರಿಸಲಾಗಿದೆ."
            return f"Showing **{shown} {lbl}** with the {label} {col.upper()} values."

        if op == "TREND":
            if lang == "hi":
                return f"**{shown} {lbl}** के ट्रेंड डेटा दिखाए गए हैं (कुल {total:,} में से)।"
            if lang == "kn":
                return f"**{shown} {lbl}** ನ ಟ್ರೆಂಡ್ ಡೇಟಾ ತೋರಿಸಲಾಗಿದೆ (ಒಟ್ಟು {total:,} ರಲ್ಲಿ)."
            return f"Trend data for **{shown} {lbl}** (out of {total:,} total)."

        # LIST / SEARCH / DESCRIBE / default
        if total > shown:
            if lang == "hi":
                return f"डेटाबेस में कुल **{total:,} {lbl}** हैं। यहाँ {shown} दिखाए गए हैं।"
            if lang == "kn":
                return f"ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ಒಟ್ಟು **{total:,} {lbl}** ಇವೆ. {shown} ತೋರಿಸಲಾಗಿದೆ."
            return f"There are **{total:,} {lbl}** in the database. Showing {shown} results."
        if lang == "hi":
            return f"**{total:,} {lbl}** मिले।"
        if lang == "kn":
            return f"**{total:,} {lbl}** ಕಂಡುಬಂದಿವೆ."
        return f"Found **{total:,} {lbl}**."

    # ------------------------------------------------------------------
    # Chart type selector
    # ------------------------------------------------------------------

    def _chart_type(self, op: str, entity_name: str) -> str:
        if op == "GROUP_BY":
            return "bar"
        if op == "TREND":
            return "line"
        if op in ("LIST", "SEARCH", "MAX", "MIN", "DESCRIBE"):
            return "table"
        return "none"

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------

    def execute_query(self, question: str, language: str = "en") -> Dict[str, Any]:
        """
        Full pipeline: parse → SQL → execute → explain.
        All answers come from the live database.
        """
        lang  = language if language in ("en", "hi", "kn") else "en"
        query = question.lower().strip()

        try:
            # 1 — Detect entity
            entity = self._detect_entity(query)
            if not entity:
                return self._unknown(question, lang)

            # 2 — Detect operation
            op = self._detect_operation(query)

            # 3 — Build filters
            where = self._build_where(query, entity["name"])

            # 4 — Detect metric (for sensor aggregations)
            metric = self._detect_metric(query) if entity["name"] == "sensors" else None

            # 5 — Detect GROUP BY field
            group_field = self._detect_group_by_field(query, entity["name"])
            # Only upgrade to GROUP_BY when the user is explicitly asking for a breakdown,
            # not when they just want a filtered list or count
            if group_field and op not in ("COUNT", "AVERAGE", "MAX", "MIN", "TREND",
                                           "SEARCH", "DESCRIBE"):
                op = "GROUP_BY"

            # 6 — Generate SQL
            sql = self._build_sql(op, entity, where, metric, group_field)

            # 7 — Execute
            result = execute_safe_sql(sql)
            if not result.get("success"):
                return {
                    "question": question, "intent": op,
                    "sql": sql, "isValid": False,
                    "queryResult": result,
                    "explanation": f"Query error: {result.get('error')}",
                    "chartType": "none", "chartData": [],
                    "source": "dynamic_query_engine",
                }

            data = result.get("data", [])

            # 8 — Generate natural-language explanation from real data
            explanation = self._explain(op, entity, data, where, metric, lang)

            return {
                "question":    question,
                "intent":      op,
                "sql":         sql,
                "isValid":     True,
                "queryResult": result,
                "explanation": explanation,
                "chartType":   self._chart_type(op, entity["name"]),
                "chartData":   data,
                "source":      "dynamic_query_engine",
                "entity":      entity["name"],
            }

        except Exception as e:
            logger.error(f"DynamicQueryEngine error: {e}", exc_info=True)
            return {
                "question": question, "intent": "ERROR",
                "sql": None, "isValid": False,
                "queryResult": None,
                "explanation": f"An error occurred processing your query: {e}",
                "chartType": "none", "chartData": [],
                "source": "dynamic_query_engine",
            }

    def _unknown(self, question: str, lang: str) -> Dict[str, Any]:
        msgs = {
            "en": ("I couldn't identify which dataset your question is about. "
                   "Try asking about helicopters, sensor observations, maintenance records, or components."),
            "hi": "मैं पहचान नहीं कर सका कि आपका प्रश्न किस डेटासेट के बारे में है।",
            "kn": "ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಯಾವ ಡೇಟಾಸೆಟ್ ಬಗ್ಗೆ ಎಂದು ಗುರುತಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.",
        }
        return {
            "question": question, "intent": "UNKNOWN",
            "sql": None, "isValid": False,
            "queryResult": None,
            "explanation": msgs.get(lang, msgs["en"]),
            "chartType": "none", "chartData": [],
            "source": "dynamic_query_engine",
        }
