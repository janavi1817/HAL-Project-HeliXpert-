from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import pandas as pd
import os
import json
import sys
from typing import Optional, List, Dict, Any

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from backend.api import ai as ai_router
    from backend.api import documents as doc_router
    from backend.api import vision as vision_router
    has_api_modules = True
except ImportError:
    print("Warning: API modules not found, running in basic mode")
    has_api_modules = False

app = FastAPI(title="HeliXpert Backend API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Since it is local offline app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers if available
if has_api_modules:
    app.include_router(ai_router.router)
    app.include_router(doc_router.router)  
    app.include_router(vision_router.router)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
DB_PATH = os.path.join(DATA_DIR, 'database', 'helixpert.db')
METADATA_DIR = os.path.join(DATA_DIR, 'metadata')

def get_db_connection():
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=503, detail="Database not found. Please run data ingestion first.")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def safe_query(query: str, params: tuple = ()) -> List[Dict]:
    """Execute safe SQL query with error handling"""
    try:
        conn = get_db_connection()
        df = pd.read_sql_query(query, conn, params=params)
        conn.close()
        return df.to_dict(orient="records")
    except Exception as e:
        print(f"Database query error: {e}")
        return []

@app.get("/api/datasets")
def get_datasets_status():
    """Get status of all loaded datasets"""
    registry_path = os.path.join(METADATA_DIR, 'dataset_registry.json')
    if os.path.exists(registry_path):
        with open(registry_path, 'r') as f:
            registry = json.load(f)
        
        # Add connection status
        try:
            conn = get_db_connection()
            conn.close()
            registry['database_status'] = 'connected'
        except:
            registry['database_status'] = 'error'
            
        return registry
    return {"status": "no_datasets", "database_status": "not_initialized"}

@app.post("/api/datasets/import")
def trigger_import():
    """Trigger dataset import process"""
    import subprocess
    try:
        result = subprocess.run(["python", "backend/ingestion.py"], 
                              check=True, capture_output=True, text=True)
        return {
            "status": "success", 
            "message": "Datasets imported successfully",
            "output": result.stdout
        }
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {e.stderr}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# HELICOPTERS - Real dataset endpoints
@app.get("/api/helicopters")
def get_helicopters():
    """Get all helicopters from real dataset"""
    helicopters = safe_query("SELECT * FROM helicopters ORDER BY model")
    if not helicopters:
        raise HTTPException(status_code=404, detail="No helicopter data loaded. Import helicopter dataset first.")
    return helicopters

@app.get("/api/helicopters/{helicopter_id}")
def get_helicopter(helicopter_id: str):
    """Get specific helicopter with related data"""
    helicopter = safe_query("SELECT * FROM helicopters WHERE helicopter_id = ?", (helicopter_id,))
    if not helicopter:
        raise HTTPException(status_code=404, detail=f"Helicopter {helicopter_id} not found")
    
    # Get related data
    components = safe_query("SELECT * FROM components WHERE helicopter_id = ?", (helicopter_id,))
    telemetry = safe_query("SELECT * FROM sensor_parameters LIMIT 100")  # Sample telemetry
    
    return {
        "helicopter": helicopter[0],
        "components": components,
        "telemetry_sample": telemetry,
        "related_data_available": len(components) > 0 or len(telemetry) > 0
    }

# COMPONENTS - Real dataset endpoints  
@app.get("/api/components")
def get_components():
    """Get all components from real dataset"""
    components = safe_query("SELECT * FROM components ORDER BY component_name")
    if not components:
        return {"message": "Component/IPC dataset not loaded", "data": []}
    return components

# TELEMETRY - Real PHM dataset endpoints
@app.get("/api/telemetry/summary")
def get_telemetry_summary():
    """Get telemetry summary from PHM helicopter engine dataset"""
    summary_data = safe_query("""
        SELECT 
            COUNT(*) as total_observations,
            AVG(CASE WHEN trq_measured IS NOT NULL THEN trq_measured END) as avg_torque,
            AVG(CASE WHEN oat IS NOT NULL THEN oat END) as avg_outside_air_temp,
            AVG(CASE WHEN mgt IS NOT NULL THEN mgt END) as avg_mean_gas_temp,
            AVG(CASE WHEN np IS NOT NULL THEN np END) as avg_power_turbine_speed,
            SUM(CASE WHEN faulty = 1 THEN 1 ELSE 0 END) as faulty_observations,
            SUM(CASE WHEN faulty = 0 THEN 1 ELSE 0 END) as healthy_observations
        FROM sensor_parameters
    """)
    
    if not summary_data or summary_data[0]['total_observations'] == 0:
        return {"message": "PHM helicopter engine telemetry dataset not loaded", "data": {}}
    
    return summary_data[0]

@app.get("/api/telemetry/trends")
def get_telemetry_trends(limit: int = Query(100, ge=1, le=10000)):
    """Get telemetry trends from PHM dataset"""
    trends = safe_query(
        "SELECT trq_measured, oat, mgt, pa, ias, np, ng, faulty, trq_margin "
        "FROM sensor_parameters "
        "WHERE trq_measured IS NOT NULL "
        "ORDER BY id "
        "LIMIT ?",
        (limit,)
    )
    
    if not trends:
        return {"message": "PHM helicopter engine telemetry dataset not loaded", "data": []}
    
    return trends

# FAULTS - Real dataset endpoints
@app.get("/api/faults")
def get_faults():
    """Get faults from real datasets"""
    faults = safe_query("""
        SELECT dataset_id, fault_type, health_state, COUNT(*) as count
        FROM faults_summary 
        GROUP BY dataset_id, fault_type, health_state
        ORDER BY count DESC
    """)
    
    if not faults:
        return {"message": "No fault data available", "data": []}
    
    return faults

@app.get("/api/faults/summary")  
def get_faults_summary():
    """Get fault summary statistics"""
    summary = safe_query("""
        SELECT 
            COUNT(*) as total_faults,
            SUM(CASE WHEN health_state = 'Faulty' THEN 1 ELSE 0 END) as faulty_count,
            SUM(CASE WHEN health_state = 'Healthy' THEN 1 ELSE 0 END) as healthy_count,
            COUNT(DISTINCT dataset_id) as datasets_with_faults
        FROM faults_summary
    """)
    
    if not summary:
        return {"total_faults": 0, "faulty_count": 0, "healthy_count": 0, "datasets_with_faults": 0}
    
    return summary[0]

# MAINTENANCE - Real annotated logbook endpoints
@app.get("/api/maintenance/summary")
def get_maintenance_summary():
    """Get maintenance summary from real annotated logbook"""
    summary = safe_query("""
        SELECT 
            PROBLEM_TYPE,
            COUNT(*) as count
        FROM maintenance_records 
        WHERE PROBLEM_TYPE IS NOT NULL AND PROBLEM_TYPE != ''
        GROUP BY PROBLEM_TYPE 
        ORDER BY count DESC 
        LIMIT 20
    """)
    
    if not summary:
        return {"message": "Annotated maintenance logbook dataset not loaded", "data": []}
    
    return summary

@app.get("/api/maintenance/search")
def search_maintenance(q: str = Query(..., min_length=2)):
    """Search maintenance records using full-text search"""
    try:
        conn = get_db_connection()
        query = "SELECT * FROM maintenance_search WHERE maintenance_search MATCH ? LIMIT 50"
        df = pd.read_sql_query(query, conn, params=(q,))
        conn.close()
        
        if df.empty:
            return {"message": f"No maintenance records found for: {q}", "data": []}
        
        return df.to_dict(orient="records")
    except Exception as e:
        # Fallback to regular text search if FTS fails
        fallback = safe_query("""
            SELECT * FROM maintenance_records 
            WHERE PROBLEM LIKE ? OR ACTION LIKE ? OR CAUSE LIKE ?
            LIMIT 50
        """, (f"%{q}%", f"%{q}%", f"%{q}%"))
        
        return fallback if fallback else {"message": "Search unavailable", "data": []}

# DASHBOARD - Real data dashboard stats
@app.get("/api/dashboard/stats")
def get_dashboard_stats():
    """Get dashboard statistics from real datasets"""
    try:
        # Get counts from each dataset
        helicopter_count = safe_query("SELECT COUNT(*) as count FROM helicopters")
        telemetry_count = safe_query("SELECT COUNT(*) as count FROM sensor_parameters")  
        maintenance_count = safe_query("SELECT COUNT(*) as count FROM maintenance_records")
        fault_count = safe_query("SELECT COUNT(*) as count FROM faults_summary")
        
        # Get health statistics
        health_stats = safe_query("""
            SELECT 
                SUM(CASE WHEN faulty = 0 THEN 1 ELSE 0 END) as healthy,
                SUM(CASE WHEN faulty = 1 THEN 1 ELSE 0 END) as faulty,
                COUNT(*) as total
            FROM sensor_parameters
        """)
        
        return {
            "helicopters": helicopter_count[0]['count'] if helicopter_count else 0,
            "telemetry_observations": telemetry_count[0]['count'] if telemetry_count else 0,
            "maintenance_records": maintenance_count[0]['count'] if maintenance_count else 0,
            "fault_observations": fault_count[0]['count'] if fault_count else 0,
            "health_summary": health_stats[0] if health_stats else {"healthy": 0, "faulty": 0, "total": 0},
            "datasets_loaded": sum(1 for x in [helicopter_count, telemetry_count, maintenance_count] if x and x[0]['count'] > 0)
        }
    except Exception as e:
        return {
            "helicopters": "Error",
            "telemetry_observations": "Error", 
            "maintenance_records": "Error",
            "error": str(e)
        }

@app.get("/api/health")
def health_check():
    """System health check"""
    db_ok = False
    db_tables = []
    db_counts = {}
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        db_tables = [r[0] for r in cursor.fetchall() if not r[0].startswith('sqlite_')]
        for tbl in ['helicopters', 'sensor_parameters', 'maintenance_records', 'components']:
            if tbl in db_tables:
                cursor.execute(f"SELECT COUNT(*) FROM {tbl}")
                db_counts[tbl] = cursor.fetchone()[0]
        conn.close()
        db_ok = True
    except Exception as e:
        db_ok = False

    # Check Ollama
    ollama_ok = False
    try:
        import requests as req_lib
        r = req_lib.get("http://localhost:11434/api/tags", timeout=2)
        ollama_ok = r.status_code == 200
    except:
        ollama_ok = False

    # Check RAG index
    vectorstore_path = os.path.join(DATA_DIR, 'vectorstore')
    rag_ok = os.path.exists(vectorstore_path) and len(os.listdir(vectorstore_path)) > 0

    return {
        "status": "ok",
        "database": {
            "status": "ready" if db_ok else "error",
            "tables": db_tables,
            "record_counts": db_counts
        },
        "local_ai": {
            "status": "ready",
            "ollama_available": ollama_ok,
            "mode": "ollama" if ollama_ok else "offline_rule_based"
        },
        "rag_index": {
            "status": "ready" if rag_ok else "not_indexed",
            "path": vectorstore_path
        },
        "offline_mode": True,
        "version": "1.0.0"
    }


@app.get("/api/system/status")
def system_status():
    """Simplified system status for frontend settings panel"""
    db_ok = False
    datasets_loaded = 0
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        for tbl in ['helicopters', 'sensor_parameters', 'maintenance_records', 'components']:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {tbl}")
                count = cursor.fetchone()[0]
                if count > 0:
                    datasets_loaded += 1
            except:
                pass
        conn.close()
        db_ok = True
    except:
        pass

    return {
        "backend": "online",
        "database": "ready" if db_ok else "error",
        "datasets_loaded": datasets_loaded
    }


@app.get("/api/maintenance/records")
def get_maintenance_records(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    search: str = Query(None)
):
    """Get paginated maintenance records"""
    if search:
        records = safe_query("""
            SELECT * FROM maintenance_records 
            WHERE PROBLEM LIKE ? OR ACTION LIKE ? OR CAUSE LIKE ? OR PROBLEM_TYPE LIKE ?
            LIMIT ? OFFSET ?
        """, (f"%{search}%", f"%{search}%", f"%{search}%", f"%{search}%", limit, offset))
    else:
        records = safe_query(
            "SELECT * FROM maintenance_records LIMIT ? OFFSET ?",
            (limit, offset)
        )
    
    total = safe_query("SELECT COUNT(*) as count FROM maintenance_records")
    total_count = total[0]['count'] if total else 0
    
    return {
        "records": records if records else [],
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "message": "General aviation maintenance reference dataset — not verified as helicopter-specific."
    }


@app.get("/api/telemetry/parameters")
def get_telemetry_parameters(
    limit: int = Query(200, ge=1, le=5000),
    offset: int = Query(0, ge=0),
    faulty_only: bool = Query(False)
):
    """Get PHM helicopter engine sensor parameter records"""
    where = "WHERE faulty = 1" if faulty_only else ""
    data = safe_query(
        f"SELECT id, trq_measured, oat, mgt, pa, ias, np, ng, faulty, trq_margin "
        f"FROM sensor_parameters {where} ORDER BY id LIMIT ? OFFSET ?",
        (limit, offset)
    )
    total = safe_query(f"SELECT COUNT(*) as count FROM sensor_parameters {where}")
    total_count = total[0]['count'] if total else 0
    
    return {
        "data": data if data else [],
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "source": "PHM 2024 Helicopter Turboshaft Engine Health Dataset",
        "columns": {
            "trq_measured": "Measured Torque",
            "oat": "Outside Air Temperature (°C)",
            "mgt": "Mean Gas Temperature (°C)",
            "pa": "Pressure Altitude",
            "ias": "Indicated Airspeed",
            "np": "Net Power / Power Turbine Speed (%)",
            "ng": "Gas Generator Speed (%)",
            "faulty": "Health Label (0=Healthy, 1=Faulty)",
            "trq_margin": "Torque Margin"
        }
    }


@app.get("/api/faults/observations")
def get_fault_observations(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """Get individual faulty observations from PHM dataset"""
    data = safe_query(f"""
        SELECT id, trq_measured, oat, mgt, pa, ias, np, ng, trq_margin, faulty
        FROM sensor_parameters
        WHERE faulty = 1
        ORDER BY id
        LIMIT {limit} OFFSET {offset}
    """)
    total = safe_query("SELECT COUNT(*) as count FROM sensor_parameters WHERE faulty = 1")
    total_count = total[0]['count'] if total else 0
    
    return {
        "data": data if data else [],
        "total": total_count,
        "source": "PHM 2024 Helicopter Turboshaft Engine Health Dataset",
        "note": "Documented fault labels from PHM dataset — not AI-detected anomalies"
    }


@app.get("/api/datasets/sources")
def get_dataset_sources():
    """Get all dataset source information"""
    sources = safe_query("SELECT * FROM dataset_sources ORDER BY created_at")
    return sources if sources else []


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
