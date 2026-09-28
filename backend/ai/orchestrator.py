# -*- coding: utf-8 -*-
"""
HeliXpert AI Orchestrator v5
- NLP mode:  data questions → DynamicQueryEngine (SQL); knowledge → Ollama or offline KB
- RAG mode:  retrieve DB context → Ollama synthesises; fallback = raw rows
- Offline KB: built-in technical helicopter knowledge (no Ollama required)
- All data answers come from the live database — nothing hardcoded
- Stats refreshed on every query call so they are never stale

DB schema (confirmed):
  helicopters        : helicopter_id, model, manufacturer, variant, helicopter_type,
                       rotor_configuration, country, data_status, source_id
  sensor_parameters  : id, trq_measured, oat, mgt, pa, ias, np, ng, faulty, trq_margin, source_id
  maintenance_records: IDENT, PROBLEM, PROBLEM_TYPE, LOCATION, PROBLEM_PART,
                       TAGGEDPROBLEM, EFFECT, ACTION, ACTION_TYPE, INSTALL_REPLACE_WITH,
                       ACTION_PART, TAGGEDACTION, CAUSE, source_id
  components         : component_id, component_type, component_name, description, source_type
  faults_summary     : dataset_id, observation_id, fault_type, health_state,
                       confidence, detection_method, source_id
"""
from __future__ import annotations

import re
import sqlite3
import os
import logging
from typing import Optional

from backend.ai.sql_agent import execute_safe_sql
from backend.ai.schema_metadata import get_schema_summary
from backend.ai.ollama_client import OllamaClient
from backend.ai.dynamic_query_engine import DynamicQueryEngine

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH  = os.path.join(BASE_DIR, 'data', 'database', 'helixpert.db')

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Language helpers
# ---------------------------------------------------------------------------

def _norm_lang(language: str) -> str:
    if not language:
        return 'en'
    l = str(language).strip().lower()
    if l.startswith('hi'): return 'hi'
    if l.startswith('kn'): return 'kn'
    return 'en'

_LANG_INSTR = {
    'en': "Respond in English. Be concise and professional.",
    'hi': "केवल हिंदी में उत्तर दें। स्पष्ट और संक्षिप्त रहें।",
    'kn': "ಕನ್ನಡದಲ್ಲಿ ಮಾತ್ರ ಉತ್ತರಿಸಿ। ಸ್ಪಷ್ಟ ಮತ್ತು ಸಂಕ್ಷಿಪ್ತವಾಗಿರಿ।",
}

def _loc(lang: str, en: str, hi: str, kn: str) -> str:
    if lang == 'hi': return hi
    if lang == 'kn': return kn
    return en


# ---------------------------------------------------------------------------
# Live DB stats — always queried fresh, never cached stale values
# ---------------------------------------------------------------------------

def _live_stats() -> dict:
    """Query the DB for current record counts. Returns zeros on error."""
    stats = {"helicopters": 0, "sensors": 0, "maintenance": 0, "components": 0,
             "healthy": 0, "faulty": 0}
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        stats["helicopters"]  = c.execute("SELECT COUNT(*) FROM helicopters").fetchone()[0]
        stats["sensors"]      = c.execute("SELECT COUNT(*) FROM sensor_parameters").fetchone()[0]
        stats["maintenance"]  = c.execute("SELECT COUNT(*) FROM maintenance_records").fetchone()[0]
        stats["components"]   = c.execute("SELECT COUNT(*) FROM components").fetchone()[0]
        stats["healthy"]      = c.execute("SELECT COUNT(*) FROM sensor_parameters WHERE faulty=0").fetchone()[0]
        stats["faulty"]       = c.execute("SELECT COUNT(*) FROM sensor_parameters WHERE faulty=1").fetchone()[0]
        conn.close()
    except Exception as e:
        logger.warning(f"_live_stats error: {e}")
    return stats


# ---------------------------------------------------------------------------
# Offline helicopter knowledge base
# ---------------------------------------------------------------------------

_KB: list = [
    (r'\bmgt\b|mean gas temperature|turbine inlet temp',
     "MGT (Mean Gas Temperature) is the temperature of exhaust gases measured at the turbine inlet of a helicopter turboshaft engine. "
     "It is one of the most important engine health indicators — elevated MGT can indicate compressor fouling, turbine blade damage, or fuel system issues. "
     "Normal operating range is typically 600–900 °C depending on the engine model and operating conditions."),

    (r'turboshaft|turboshaft engine',
     "A turboshaft engine is a gas turbine that converts combustion energy into shaft power rather than thrust. "
     "It is the standard powerplant for helicopters, driving the main and tail rotors through a gearbox/transmission. "
     "Key monitored parameters include MGT, Ng (gas generator speed), Np (power turbine speed), torque, and OAT."),

    (r'engine cowl|cowling|engine cover',
     "The engine cowling is the aerodynamic cover enclosing the helicopter engine. "
     "It protects the engine from foreign-object damage and environmental exposure, and provides access panels for maintenance. "
     "Common defects: dents, cracks at stress concentrations, oil staining from leaks, and composite delamination. "
     "Inspect for secure fasteners and no fluid staining before flight."),

    (r'main rotor|rotor blade|rotor system',
     "The main rotor is the primary lift-generating system. Blades are typically composite or aluminium alloy. "
     "Common defects: leading-edge erosion, delamination, surface cracks, and tip-cap damage. "
     "Rotor track and balance must be maintained to minimise vibration."),

    (r'tail rotor|fenestron|anti.?torque',
     "The tail rotor provides anti-torque force to counteract main rotor torque and enable yaw control. "
     "It runs at high RPM and is vulnerable to ground strikes, FOD, and bearing wear. "
     "A fenestron (ducted fan) is used on some Airbus helicopters such as the H135."),

    (r'transmission|gearbox|main gearbox|\bmgb\b',
     "The main gearbox reduces engine shaft speed to the lower RPM needed by the rotor. "
     "Loss of lubrication can lead to catastrophic failure within minutes, so it is critical. "
     "Monitoring includes chip detectors, oil temperature, oil pressure, and vibration analysis."),

    (r'landing gear|skid|undercarriage',
     "Helicopter landing gear is typically skid-type or wheeled. "
     "Skids are aluminium or steel tubes; common issues include bent cross-tubes from hard landings and corrosion at attachment points. "
     "Post-hard-landing inspections are mandatory before further flight."),

    (r'hydraulic system|hydraulic pump',
     "The hydraulic system provides power-assisted flight control. "
     "Failure can result in very high control forces or loss of control authority. "
     "Regular checks: fluid level, leaks at fittings and actuators, filter condition. "
     "Fluid contamination is a common maintenance issue."),

    (r'\btorque\b|\btrq\b|torque margin',
     "Torque is the rotational force transmitted from the engine through the transmission to the rotor. "
     "Torque margin is the difference between available and used torque — a low or negative margin means the engine is at or beyond its limit. "
     "The PHM dataset tracks trq_measured (actual) and trq_margin (available headroom)."),

    (r'\boat\b|outside air temperature|ambient temperature',
     "OAT (Outside Air Temperature) is the ambient air temperature. "
     "Higher OAT reduces air density, reducing both engine power and rotor lift. "
     "Hot-and-high conditions are the most critical performance-limiting scenario for helicopters."),

    (r'\bng\b|gas generator speed|compressor speed|\bn1\b',
     "Ng is the gas generator (compressor) speed, expressed as a percentage of design maximum RPM. "
     "Low Ng at a given power setting can indicate compressor fouling or bleed air extraction issues."),

    (r'\bnp\b|power turbine speed|\bn2\b|free turbine',
     "Np is the free power turbine speed. In a free-turbine engine it drives the rotor and is aerodynamically, "
     "not mechanically, coupled to the gas generator. Np is governed to a constant value in flight to maintain rotor RPM."),

    (r'pressure altitude|\bpa\b',
     "Pressure altitude is the altitude above the standard datum plane (sea level at 1013.25 hPa). "
     "Higher pressure altitude means lower air density, which reduces helicopter performance."),

    (r'indicated airspeed|\bias\b',
     "Indicated Airspeed (IAS) is the speed shown on the airspeed indicator, uncorrected for position or instrument error. "
     "For helicopters it is important for autorotation limits, VNE (never-exceed speed), and retreating blade stall avoidance."),

    (r'inspect|inspection|pre.?flight|daily check',
     "Helicopter inspections follow a layered schedule: pre-flight checks before every flight, daily inspections, and periodic inspections at defined flight hours. "
     "Pre-flight covers control continuity, fluid levels, rotor blade condition, visible structural integrity, and secure access panels. "
     "All discrepancies must be documented in the maintenance logbook before flight."),

    (r'maintenance|scheduled maintenance|\bmx\b',
     "Helicopter maintenance follows the manufacturer's Maintenance Manual on a time/cycle-based schedule. "
     "Key intervals: 100-hour inspections, component TBO (time between overhaul), and on-condition monitoring for modern platforms. "
     "All maintenance must be performed by licensed AMEs and recorded in the aircraft logbook."),

    (r'phm|prognostics|health monitoring|condition monitoring',
     "PHM (Prognostics and Health Management) uses sensor data to predict failures before they occur. "
     "For helicopter turboshaft engines, monitored parameters include MGT, Ng, Np, torque, OAT, and vibration. "
     "The HeliXpert dataset contains 742,000+ sensor observations from the PHM 2024 challenge with fault labels."),

    (r'helixpert|what (can|does) (you|this) (do|know)|capabilities|features',
     "HeliXpert AI is an offline helicopter intelligence platform. "
     "It can answer questions about: helicopter fleet data, PHM sensor observations, engine health, "
     "maintenance records (problems, actions, causes, locations), and component taxonomy. "
     "It uses a live SQLite database — all data answers come from the actual dataset, never from hardcoded values. "
     "It works fully offline without any internet connection."),
]

def _offline_kb_lookup(question: str) -> Optional[str]:
    q = question.lower()
    for pattern, answer in _KB:
        if re.search(pattern, q, re.IGNORECASE):
            return answer
    return None


# ---------------------------------------------------------------------------
# Data-query classifier
# Detects questions that should be answered from the DB (not the KB / LLM)
# ---------------------------------------------------------------------------

_DATA_VERBS = re.compile(
    r'\b(how many|count|list|show|display|give me|find|fetch|search|average|avg|mean|'
    r'maximum|minimum|highest|lowest|total|top|bottom|trend|chart|table|breakdown|'
    r'distribution|group|which|what are|कितने|सूची|दिखाओ|खोज|ಎಷ್ಟು|ಪಟ್ಟಿ|ತೋರಿಸಿ|ಹುಡುಕು)\b',
    re.IGNORECASE,
)
_DB_ENTITIES = re.compile(
    r'\b(helicopter|sensor|maintenance|component|mgt|torque|oat|ng|np|faulty|fault|'
    r'logbook|record|observation|reading|fleet|model|manufacturer|problem|action|cause|'
    r'location|repair|engine health|telemetry|phm|trq|margin|altitude|airspeed|'
    r'हेलीकॉप्टर|सेंसर|रखरखाव|घटक|समस्या|ಹೆಲಿಕಾಪ್ಟರ್|ಸೆನ್ಸರ್|ನಿರ್ವಹಣೆ|ಘಟಕ)\b',
    re.IGNORECASE,
)

def _is_data_query(question: str) -> bool:
    return bool(_DATA_VERBS.search(question)) and bool(_DB_ENTITIES.search(question))


# ---------------------------------------------------------------------------
# Context retrieval — returns raw DB rows for RAG / fallback
# Always uses real COUNT(*), never hardcoded numbers
# ---------------------------------------------------------------------------

def _retrieve_context(question: str) -> dict:
    q = question.lower()

    # ── Count-only questions ──────────────────────────────────────────────
    is_count = any(t in q for t in ["how many", "count", "total", "number of",
                                     "कितने", "ಎಷ್ಟು"])

    if is_count:
        if any(t in q for t in ["sensor", "observation", "reading", "telemetry",
                                  "phm", "सेंसर", "ಸೆನ್ಸರ್"]):
            sql = ("SELECT COUNT(*) AS total, "
                   "SUM(CASE WHEN faulty=0 THEN 1 ELSE 0 END) AS healthy, "
                   "SUM(CASE WHEN faulty=1 THEN 1 ELSE 0 END) AS faulty "
                   "FROM sensor_parameters")
            return {"sql": sql, "rows": execute_safe_sql(sql).get("data", []),
                    "table": "_count_sensors", "total": 0}

        if any(t in q for t in ["maintenance", "repair", "logbook", "record",
                                  "रखरखाव", "ನಿರ್ವಹಣೆ"]):
            sql = "SELECT COUNT(*) AS total FROM maintenance_records"
            return {"sql": sql, "rows": execute_safe_sql(sql).get("data", []),
                    "table": "_count_maintenance", "total": 0}

        if any(t in q for t in ["helicopter", "aircraft", "fleet",
                                  "हेलीकॉप्टर", "ಹೆಲಿಕಾಪ್ಟರ್"]):
            sql = "SELECT COUNT(*) AS total FROM helicopters"
            return {"sql": sql, "rows": execute_safe_sql(sql).get("data", []),
                    "table": "_count_helicopters", "total": 0}

        if any(t in q for t in ["component", "part", "घटक", "ಘಟಕ"]):
            sql = "SELECT COUNT(*) AS total FROM components"
            return {"sql": sql, "rows": execute_safe_sql(sql).get("data", []),
                    "table": "_count_components", "total": 0}

        if any(t in q for t in ["faulty", "fault", "anomaly", "defect"]):
            sql = ("SELECT "
                   "SUM(CASE WHEN faulty=1 THEN 1 ELSE 0 END) AS faulty_count, "
                   "SUM(CASE WHEN faulty=0 THEN 1 ELSE 0 END) AS healthy_count, "
                   "COUNT(*) AS total "
                   "FROM sensor_parameters")
            return {"sql": sql, "rows": execute_safe_sql(sql).get("data", []),
                    "table": "_count_faults", "total": 0}

    # ── Sensor / PHM parameter questions ─────────────────────────────────
    if any(t in q for t in ["mgt", "mean gas", "gas temperature", "turbine temp",
                              "engine temp", "इंजन", "तापमान", "ಎಂಜಿನ್"]):
        if any(t in q for t in ["average", "avg", "mean", "औसत", "ಸರಾಸರಿ"]):
            sql = ("SELECT ROUND(AVG(mgt),2) AS average, "
                   "ROUND(MIN(mgt),2) AS minimum, ROUND(MAX(mgt),2) AS maximum, "
                   "COUNT(*) AS observations FROM sensor_parameters")
        elif any(t in q for t in ["highest", "max", "peak", "top"]):
            sql = ("SELECT id, mgt, oat, trq_measured, ng, np, faulty "
                   "FROM sensor_parameters ORDER BY mgt DESC LIMIT 10")
        elif any(t in q for t in ["faulty", "fault"]):
            sql = ("SELECT ROUND(AVG(mgt),2) AS average, ROUND(MIN(mgt),2) AS minimum, "
                   "ROUND(MAX(mgt),2) AS maximum, COUNT(*) AS faulty_observations "
                   "FROM sensor_parameters WHERE faulty=1")
        else:
            sql = ("SELECT ROUND(AVG(mgt),2) AS average, "
                   "ROUND(MIN(mgt),2) AS minimum, ROUND(MAX(mgt),2) AS maximum, "
                   "COUNT(*) AS observations FROM sensor_parameters")
        return {"sql": sql, "rows": execute_safe_sql(sql).get("data", []),
                "table": "sensor_parameters", "total": 0}

    if any(t in q for t in ["torque", "trq", "टॉर्क", "ಟಾರ್ಕ್"]):
        sql = ("SELECT ROUND(AVG(trq_measured),2) AS avg_torque, "
               "ROUND(MIN(trq_measured),2) AS min_torque, "
               "ROUND(MAX(trq_measured),2) AS max_torque, "
               "ROUND(AVG(trq_margin),2) AS avg_margin, "
               "COUNT(*) AS observations FROM sensor_parameters")
        return {"sql": sql, "rows": execute_safe_sql(sql).get("data", []),
                "table": "sensor_parameters", "total": 0}

    if any(t in q for t in ["oat", "outside air", "ambient temp",
                              "बाहरी", "ಹೊರಗಿನ"]):
        sql = ("SELECT ROUND(AVG(oat),2) AS average, "
               "ROUND(MIN(oat),2) AS minimum, ROUND(MAX(oat),2) AS maximum, "
               "COUNT(*) AS observations FROM sensor_parameters")
        return {"sql": sql, "rows": execute_safe_sql(sql).get("data", []),
                "table": "sensor_parameters", "total": 0}

    if any(t in q for t in [" ng ", "gas generator speed", "compressor speed"]):
        sql = ("SELECT ROUND(AVG(ng),2) AS average, "
               "ROUND(MIN(ng),2) AS minimum, ROUND(MAX(ng),2) AS maximum, "
               "COUNT(*) AS observations FROM sensor_parameters")
        return {"sql": sql, "rows": execute_safe_sql(sql).get("data", []),
                "table": "sensor_parameters", "total": 0}

    if any(t in q for t in [" np ", "power turbine speed", "free turbine"]):
        sql = ("SELECT ROUND(AVG(np),2) AS average, "
               "ROUND(MIN(np),2) AS minimum, ROUND(MAX(np),2) AS maximum, "
               "COUNT(*) AS observations FROM sensor_parameters")
        return {"sql": sql, "rows": execute_safe_sql(sql).get("data", []),
                "table": "sensor_parameters", "total": 0}

    if any(t in q for t in ["pressure altitude", " pa ", "altitude"]):
        sql = ("SELECT ROUND(AVG(pa),2) AS average, "
               "ROUND(MIN(pa),2) AS minimum, ROUND(MAX(pa),2) AS maximum, "
               "COUNT(*) AS observations FROM sensor_parameters")
        return {"sql": sql, "rows": execute_safe_sql(sql).get("data", []),
                "table": "sensor_parameters", "total": 0}

    if any(t in q for t in ["airspeed", " ias ", "indicated airspeed"]):
        sql = ("SELECT ROUND(AVG(ias),2) AS average, "
               "ROUND(MIN(ias),2) AS minimum, ROUND(MAX(ias),2) AS maximum, "
               "COUNT(*) AS observations FROM sensor_parameters")
        return {"sql": sql, "rows": execute_safe_sql(sql).get("data", []),
                "table": "sensor_parameters", "total": 0}

    if any(t in q for t in ["faulty", "fault", "anomaly", "defect",
                              "दोष", "ದೋಷ"]):
        sql = ("SELECT faulty, COUNT(*) AS count "
               "FROM sensor_parameters GROUP BY faulty")
        return {"sql": sql, "rows": execute_safe_sql(sql).get("data", []),
                "table": "sensor_parameters", "total": 0}

    if any(t in q for t in ["sensor", "observation", "reading", "telemetry",
                              "phm", "engine health"]):
        sql = ("SELECT id, mgt, oat, trq_measured, trq_margin, ng, np, faulty "
               "FROM sensor_parameters ORDER BY id LIMIT 20")
        count_r = execute_safe_sql("SELECT COUNT(*) AS total FROM sensor_parameters")
        total = count_r["data"][0]["total"] if count_r.get("data") else 0
        return {"sql": sql, "rows": execute_safe_sql(sql).get("data", []),
                "table": "sensor_parameters", "total": total}

    # ── Maintenance questions ─────────────────────────────────────────────
    if any(t in q for t in ["maintenance", "repair", "logbook", "problem",
                              "action", "cause", "effect", "location",
                              "रखरखाव", "मरम्मत", "ನಿರ್ವಹಣೆ", "ದುರಸ್ತಿ"]):
        count_r = execute_safe_sql("SELECT COUNT(*) AS total FROM maintenance_records")
        total = count_r["data"][0]["total"] if count_r.get("data") else 0

        # If asking about a specific problem type
        if "type" in q or "category" in q:
            sql = ("SELECT PROBLEM_TYPE, COUNT(*) AS count "
                   "FROM maintenance_records "
                   "WHERE PROBLEM_TYPE IS NOT NULL AND PROBLEM_TYPE != '' "
                   "GROUP BY PROBLEM_TYPE ORDER BY count DESC")
        elif "cause" in q:
            sql = ("SELECT CAUSE, COUNT(*) AS count "
                   "FROM maintenance_records "
                   "WHERE CAUSE IS NOT NULL AND CAUSE != '' "
                   "GROUP BY CAUSE ORDER BY count DESC LIMIT 20")
        elif "location" in q:
            sql = ("SELECT LOCATION, COUNT(*) AS count "
                   "FROM maintenance_records "
                   "WHERE LOCATION IS NOT NULL AND LOCATION != '' "
                   "GROUP BY LOCATION ORDER BY count DESC LIMIT 20")
        else:
            sql = ("SELECT IDENT, PROBLEM, PROBLEM_TYPE, LOCATION, ACTION, CAUSE "
                   "FROM maintenance_records LIMIT 10")

        return {"sql": sql, "rows": execute_safe_sql(sql).get("data", []),
                "table": "maintenance_records", "total": total}

    # ── Helicopter questions ──────────────────────────────────────────────
    if any(t in q for t in ["helicopter", "aircraft", "model", "fleet",
                              "manufacturer", "हेलीकॉप्टर", "ಹೆಲಿಕಾಪ್ಟರ್"]):
        if "manufacturer" in q or "maker" in q or "brand" in q:
            sql = ("SELECT manufacturer, COUNT(*) AS count "
                   "FROM helicopters GROUP BY manufacturer ORDER BY count DESC")
        elif "type" in q or "category" in q:
            sql = ("SELECT helicopter_type, COUNT(*) AS count "
                   "FROM helicopters GROUP BY helicopter_type ORDER BY count DESC")
        elif "country" in q:
            sql = ("SELECT country, COUNT(*) AS count "
                   "FROM helicopters GROUP BY country ORDER BY count DESC")
        else:
            sql = ("SELECT model, manufacturer, variant, helicopter_type, country "
                   "FROM helicopters ORDER BY model")
        return {"sql": sql, "rows": execute_safe_sql(sql).get("data", []),
                "table": "helicopters", "total": 0}

    # ── Component questions ───────────────────────────────────────────────
    if any(t in q for t in ["component", "part", "rotor", "cowling", "gear",
                              "blade", "घटक", "ಘಟಕ"]):
        if "type" in q or "category" in q:
            sql = ("SELECT component_type, COUNT(*) AS count "
                   "FROM components GROUP BY component_type ORDER BY count DESC")
        else:
            sql = ("SELECT component_type, component_name, description "
                   "FROM components ORDER BY component_type")
        return {"sql": sql, "rows": execute_safe_sql(sql).get("data", []),
                "table": "components", "total": 0}

    # ── Summary fallback ─────────────────────────────────────────────────
    sql = ("SELECT "
           "(SELECT COUNT(*) FROM helicopters)         AS helicopters, "
           "(SELECT COUNT(*) FROM sensor_parameters)   AS sensor_readings, "
           "(SELECT COUNT(*) FROM maintenance_records) AS maintenance_records, "
           "(SELECT COUNT(*) FROM components)          AS components, "
           "(SELECT SUM(CASE WHEN faulty=1 THEN 1 ELSE 0 END) FROM sensor_parameters) AS faulty_readings, "
           "(SELECT SUM(CASE WHEN faulty=0 THEN 1 ELSE 0 END) FROM sensor_parameters) AS healthy_readings")
    return {"sql": sql, "rows": execute_safe_sql(sql).get("data", []),
            "table": "summary", "total": 0}


# ---------------------------------------------------------------------------
# Format DB rows into readable text
# ---------------------------------------------------------------------------

def _fmt(rows: list, table: str, total: int = 0) -> str:
    if not rows:
        return "No matching records found."

    r = rows[0]

    # Special count-only tables
    if table == "_count_sensors":
        t = r.get("total", 0)
        h = r.get("healthy", 0)
        f = r.get("faulty", 0)
        return (f"There are **{t:,} sensor observations** in the database "
                f"({h:,} healthy, {f:,} faulty).")
    if table == "_count_maintenance":
        return f"There are **{r.get('total',0):,} maintenance records** in the database."
    if table == "_count_helicopters":
        return f"There are **{r.get('total',0)} helicopters** in the database."
    if table == "_count_components":
        return f"There are **{r.get('total',0)} components** in the database."
    if table == "_count_faults":
        return (f"Fault breakdown: **{r.get('faulty_count',0):,} faulty** and "
                f"**{r.get('healthy_count',0):,} healthy** sensor observations "
                f"(total {r.get('total',0):,}).")

    if table == "summary":
        return (
            f"Database summary: "
            f"**{r.get('helicopters',0)} helicopters**, "
            f"**{r.get('sensor_readings',0):,} sensor readings** "
            f"({r.get('healthy_readings',0):,} healthy / {r.get('faulty_readings',0):,} faulty), "
            f"**{r.get('maintenance_records',0):,} maintenance records**, "
            f"**{r.get('components',0)} components**."
        )

    # Regular rows
    lines = []
    for i, row in enumerate(rows[:10], 1):
        lines.append("  " + str(i) + ". " +
                     ", ".join(f"{k}: {v}" for k, v in row.items() if v is not None))
    shown = len(rows)
    if total and total > shown:
        lines.append(f"\n  ... and {total - shown:,} more (total: {total:,}).")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Conversation history
# ---------------------------------------------------------------------------

_history: list = []
_MAX_H = 6

def _add_history(user: str, assistant: str) -> None:
    _history.append({"role": "user",      "content": user})
    _history.append({"role": "assistant", "content": assistant})
    while len(_history) > _MAX_H * 2:
        _history.pop(0)

def _build_prompt(system: str, question: str) -> str:
    parts = [system, ""]
    for turn in _history[-(  _MAX_H * 2):]:
        parts.append(("User" if turn["role"] == "user" else "Assistant") +
                     ": " + turn["content"])
    parts.append(f"User: {question}")
    parts.append("Assistant:")
    return "\n".join(parts)

def _system_prompt(stats: dict, lang: str) -> str:
    return (
        "You are HeliXpert AI, an expert helicopter maintenance and technical intelligence assistant.\n\n"
        f"Live database: {stats.get('helicopters',0)} helicopters, "
        f"{stats.get('sensors',0):,} engine sensor readings "
        f"({stats.get('healthy',0):,} healthy / {stats.get('faulty',0):,} faulty), "
        f"{stats.get('maintenance',0):,} maintenance records, "
        f"{stats.get('components',0)} components.\n\n"
        "Rules:\n"
        "1. Answer helicopter questions accurately and concisely.\n"
        "2. Use the provided database context for all data questions — never fabricate numbers.\n"
        "3. Use your technical knowledge for definitions, explanations, and procedures.\n"
        "4. Resolve pronouns like 'it' from prior conversation turns.\n"
        "5. If you don't know something, say so clearly.\n\n"
        + _LANG_INSTR.get(lang, _LANG_INSTR['en'])
    )


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

class AiOrchestrator:

    def __init__(self):
        self.schema  = get_schema_summary()
        self.ollama  = OllamaClient()
        self.dynamic = DynamicQueryEngine(DB_PATH)
        # Load initial stats (refreshed on every query)
        self._stats = _live_stats()
        logger.info(
            f"AiOrchestrator v5 ready | stats={self._stats} | model={self.ollama.model_name}"
        )

    def _refresh_stats(self) -> None:
        """Refresh DB stats so answers always reflect the live dataset."""
        self._stats = _live_stats()

    def check_ollama_status(self) -> dict:
        try:
            import requests
            r = requests.get("http://localhost:11434/api/tags", timeout=2)
            if r.status_code == 200:
                models = [m.get("name", "") for m in r.json().get("models", [])]
                model  = next((m for m in models if "llama" in m.lower()),
                              models[0] if models else None)
                return {"available": True, "model": model, "models": models}
        except Exception:
            pass
        return {"available": False, "model": None, "models": []}

    def _call_ollama(self, question: str, lang: str, ctx: str = "") -> Optional[str]:
        """Call Ollama with conversation history and optional DB context."""
        try:
            system = _system_prompt(self._stats, lang)
            q = (f"Relevant database data:\n{ctx}\n\nQuestion: {question}"
                 if ctx else question)
            prompt = _build_prompt(system, q)
            resp = self.ollama.call_ollama(prompt, timeout=45)
            return resp.strip() if resp and resp.strip() else None
        except Exception as e:
            logger.warning(f"Ollama call failed: {e}")
            return None

    def _sql_answer(self, question: str, lang: str) -> dict:
        """
        Answer a data question.
        1. Try DynamicQueryEngine (NLP → SQL).
        2. Fallback to _retrieve_context rule-based SQL.
        All answers come from live DB — nothing is hardcoded.
        """
        # Refresh stats so the system prompt is always current
        self._refresh_stats()

        # 1 — DynamicQueryEngine
        try:
            dyn = self.dynamic.execute_query(question, language=lang)
            if dyn.get("isValid") and dyn.get("intent") not in ("UNKNOWN", "ERROR", None):
                dyn["mode"]   = "nlp"
                dyn["source"] = "dynamic_sql"
                return dyn
        except Exception as e:
            logger.warning(f"DynamicQueryEngine failed: {e}")

        # 2 — Rule-based context retrieval
        ctx = _retrieve_context(question)
        exp = _fmt(ctx["rows"], ctx["table"], ctx.get("total", 0))

        # If Ollama is available, synthesise a natural answer from the raw rows
        if self.ollama.is_available() and ctx["rows"]:
            ollama_resp = self._call_ollama(question, lang, ctx=exp)
            if ollama_resp:
                _add_history(question, ollama_resp)
                return {
                    "question":    question, "intent": "DATA_QUERY",
                    "sql":         ctx["sql"], "isValid": True,
                    "queryResult": {"data": ctx["rows"]},
                    "explanation": ollama_resp,
                    "chartType":   "table", "chartData": ctx["rows"],
                    "source":      "ollama+sql", "mode": "nlp",
                }

        _add_history(question, exp)
        return {
            "question":    question, "intent": "DATA_QUERY",
            "sql":         ctx["sql"], "isValid": True,
            "queryResult": {"data": ctx["rows"]},
            "explanation": exp,
            "chartType":   "table" if ctx["table"] != "summary" else "none",
            "chartData":   ctx["rows"],
            "source":      "sql_engine", "mode": "nlp", "isDatasetPending": False,
        }

    # ------------------------------------------------------------------ NLP
    def process_nlp(self, question: str, language: str = 'en') -> dict:
        lang = _norm_lang(language)
        self._refresh_stats()

        # 1 — Data queries → SQL engine (works fully offline)
        if _is_data_query(question):
            res = self._sql_answer(question, lang)
            _add_history(question, res.get("explanation", ""))
            return res

        # 2 — Knowledge questions: try Ollama first
        if self.ollama.is_available():
            resp = self._call_ollama(question, lang)
            if resp:
                _add_history(question, resp)
                return {
                    "question": question, "intent": "NLP_KNOWLEDGE",
                    "sql": None, "isValid": True, "queryResult": None,
                    "explanation": resp,
                    "chartType": "none", "chartData": [],
                    "source": "ollama", "mode": "nlp", "language": lang,
                    "isDatasetPending": False,
                }

        # 3 — Offline built-in knowledge base
        kb_ans = _offline_kb_lookup(question)
        if kb_ans:
            _add_history(question, kb_ans)
            return {
                "question": question, "intent": "NLP_KB",
                "sql": None, "isValid": True, "queryResult": None,
                "explanation": kb_ans,
                "chartType": "none", "chartData": [],
                "source": "offline_kb", "mode": "nlp", "language": lang,
                "isDatasetPending": False,
            }

        # 4 — Try to pull related DB rows as context even for borderline questions
        ctx = _retrieve_context(question)
        if ctx["rows"] and ctx["table"] != "summary":
            exp = _fmt(ctx["rows"], ctx["table"], ctx.get("total", 0))
            _add_history(question, exp)
            return {
                "question": question, "intent": "NLP_DB_FALLBACK",
                "sql": ctx["sql"], "isValid": True,
                "queryResult": {"data": ctx["rows"]},
                "explanation": exp,
                "chartType": "table", "chartData": ctx["rows"],
                "source": "sql_fallback", "mode": "nlp", "language": lang,
                "isDatasetPending": False,
            }

        # 5 — Honest fallback
        msg = _loc(lang,
            "I don't have enough information to answer that question fully offline. "
            "For complete knowledge-based answers, start Ollama (`ollama serve`). "
            "I can answer any data question about helicopters, sensors, and maintenance without internet.",
            "इस प्रश्न का उत्तर देने के लिए पर्याप्त जानकारी नहीं है। "
            "पूर्ण उत्तर के लिए Ollama शुरू करें।",
            "ಈ ಪ್ರಶ್ನೆಗೆ ಉತ್ತರಿಸಲು ಸಾಕಷ್ಟು ಮಾಹಿತಿ ಇಲ್ಲ. "
            "ಸಂಪೂರ್ಣ ಉತ್ತರಕ್ಕಾಗಿ Ollama ಪ್ರಾರಂಭಿಸಿ.",
        )
        _add_history(question, msg)
        return {
            "question": question, "intent": "NLP_NO_MATCH",
            "sql": None, "isValid": True, "queryResult": None,
            "explanation": msg,
            "chartType": "none", "chartData": [],
            "source": "fallback", "mode": "nlp", "language": lang,
            "isDatasetPending": False,
        }

    # ------------------------------------------------------------------ RAG
    def process_rag(self, question: str, language: str = 'en') -> dict:
        lang = _norm_lang(language)
        self._refresh_stats()

        ctx      = _retrieve_context(question)
        rows_txt = _fmt(ctx["rows"], ctx["table"], ctx.get("total", 0))

        if self.ollama.is_available() and ctx["rows"]:
            resp = self._call_ollama(question, lang, ctx=rows_txt)
            if resp:
                _add_history(question, resp)
                return {
                    "question": question, "intent": "RAG",
                    "sql": ctx["sql"], "isValid": True,
                    "queryResult": {"data": ctx["rows"]},
                    "explanation": resp,
                    "chartType": "table", "chartData": ctx["rows"],
                    "context": ctx["rows"], "source": "ollama+rag",
                    "mode": "rag", "language": lang, "isDatasetPending": False,
                }

        exp = rows_txt if ctx["rows"] else _loc(lang,
            "No relevant data found.",
            "प्रासंगिक डेटा नहीं मिला।",
            "ಸಂಬಂಧಿತ ಡೇಟಾ ಕಂಡುಬಂದಿಲ್ಲ.")
        _add_history(question, exp)
        return {
            "question": question, "intent": "RAG_FALLBACK",
            "sql": ctx["sql"], "isValid": True,
            "queryResult": {"data": ctx["rows"]},
            "explanation": exp,
            "chartType": "table" if ctx["rows"] else "none",
            "chartData": ctx["rows"],
            "context": ctx["rows"], "source": "dataset_retrieval",
            "mode": "rag", "language": lang, "isDatasetPending": False,
        }

    # ----------------------------------------------------------- compatibility
    def process_query(self, user_query: str, language: str = 'en') -> dict:
        return self.process_nlp(user_query, language)
