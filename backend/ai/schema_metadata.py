import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(BASE_DIR, 'data', 'database', 'helixpert.db')

def get_schema_summary():
    """Extracts schema to provide to the LLM."""
    if not os.path.exists(DB_PATH):
        return "Database not found."
        
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    schema_lines = ["Database Schema for HeliXpert (SQLite):"]
    for table_name in tables:
        t_name = table_name[0]
        # Ignore FTS virtual tables internal tables
        if t_name.endswith('_idx') or t_name.endswith('_data') or t_name.endswith('_docsize') or t_name.endswith('_config'):
            continue
            
        cursor.execute(f"PRAGMA table_info({t_name})")
        columns = cursor.fetchall()
        col_details = []
        for col in columns:
            col_details.append(f"{col[1]} ({col[2]})")
        schema_lines.append(f"Table: {t_name}")
        schema_lines.append(f"  Columns: {', '.join(col_details)}")
        
    conn.close()
    return "\n".join(schema_lines)
