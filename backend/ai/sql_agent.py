import sqlite3
import pandas as pd
import os
import re

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH  = os.path.join(BASE_DIR, 'data', 'database', 'helixpert.db')

# Aggregation keywords — these queries must NEVER get a LIMIT injected
_AGGREGATION_RE = re.compile(
    r'\b(COUNT\b|AVG\b|SUM\b|MIN\b|MAX\b|GROUP\s+BY)\b',
    re.IGNORECASE,
)

def is_safe_query(query: str) -> bool:
    """Validates that the SQL is strictly read-only."""
    disallowed = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER',
                  'CREATE', 'ATTACH', 'DETACH', 'PRAGMA', 'REPLACE']
    q_upper = query.upper().strip()

    if not (q_upper.startswith('SELECT') or q_upper.startswith('WITH')):
        return False

    for kw in disallowed:
        if re.search(rf'\b{kw}\b', q_upper):
            return False

    # Block multiple statements
    if ';' in query.strip().rstrip(';'):
        return False

    return True


def _needs_limit(query: str) -> bool:
    """
    Returns True only if the query is a plain row-fetching SELECT
    (no aggregation, no existing LIMIT clause).
    Aggregation queries (COUNT, AVG, SUM, GROUP BY) must NOT get a LIMIT
    because it corrupts their result.
    """
    if 'LIMIT' in query.upper():
        return False
    if _AGGREGATION_RE.search(query):
        return False
    return True


def execute_safe_sql(query: str) -> dict:
    """Executes a validated read-only SQL query against the HeliXpert database."""
    if not is_safe_query(query):
        return {
            "success": False,
            "error": "Query validation failed. Only SELECT statements are allowed.",
            "sql": query,
        }

    try:
        conn = sqlite3.connect(DB_PATH)

        # Only inject LIMIT for plain row-fetch queries, never for aggregations
        exec_query = query
        if _needs_limit(query):
            exec_query = f"{query.rstrip()} LIMIT 100"

        df = pd.read_sql_query(exec_query, conn)
        conn.close()

        return {
            "success":   True,
            "data":      df.to_dict(orient="records"),
            "columns":   df.columns.tolist(),
            "row_count": len(df),
            "sql":       exec_query,
        }
    except Exception as e:
        return {"success": False, "error": str(e), "sql": query}
