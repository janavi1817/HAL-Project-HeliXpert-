import pandas as pd
import sqlite3
import os
import json
import logging
from datetime import datetime

# Setup paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'data')
RAW_DIR = os.path.join(DATA_DIR, 'raw')
PROCESSED_DIR = os.path.join(DATA_DIR, 'processed')
DB_PATH = os.path.join(DATA_DIR, 'database', 'helixpert.db')
METADATA_DIR = os.path.join(DATA_DIR, 'metadata')

os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
os.makedirs(METADATA_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def create_database_schema(conn):
    """Create optimized database schema for all datasets"""
    cursor = conn.cursor()
    
    # Dataset sources table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS dataset_sources (
            source_id TEXT PRIMARY KEY,
            dataset_name TEXT NOT NULL,
            provider TEXT,
            source_url TEXT,
            license TEXT,
            description TEXT,
            dataset_type TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Helicopters table (Real helicopter master data)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS helicopters (
            helicopter_id TEXT PRIMARY KEY,
            model TEXT,
            manufacturer TEXT,
            variant TEXT,
            helicopter_type TEXT,
            rotor_configuration TEXT,
            country TEXT,
            data_status TEXT,
            source_id TEXT,
            FOREIGN KEY (source_id) REFERENCES dataset_sources(source_id)
        )
    """)
    
    # Components table (Real component/IPC data)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS components (
            component_id TEXT PRIMARY KEY,
            component_type TEXT,
            component_name TEXT,
            description TEXT,
            source_type TEXT,
            helicopter_id TEXT,
            FOREIGN KEY (helicopter_id) REFERENCES helicopters(helicopter_id)
        )
    """)
    
    # PHM Helicopter Engine Parameters (Real PHM dataset)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sensor_parameters (
            id INTEGER PRIMARY KEY,
            trq_measured REAL,
            oat REAL,  -- Outside Air Temperature
            mgt REAL,  -- Mean Gas Temperature  
            pa REAL,   -- Pressure Altitude
            ias REAL,  -- Indicated Airspeed
            np REAL,   -- Power Turbine Speed
            ng REAL,   -- Gas Generator Speed
            faulty INTEGER,  -- Health label: 0=healthy, 1=faulty
            trq_margin REAL,
            dataset_id TEXT DEFAULT 'PHM_HELICOPTER_ENGINE',
            source_id TEXT,
            FOREIGN KEY (source_id) REFERENCES dataset_sources(source_id)
        )
    """)
    
    # Maintenance Records (Real annotated logbook)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS maintenance_records (
            maintenance_id INTEGER PRIMARY KEY AUTOINCREMENT,
            IDENT TEXT,
            PROBLEM TEXT,
            PROBLEM_TYPE TEXT,
            LOCATION TEXT,
            PROBLEM_PART TEXT,
            TAGGEDPROBLEM TEXT,
            EFFECT TEXT,
            ACTION TEXT,
            ACTION_TYPE TEXT,
            INSTALL_REPLACE_WITH TEXT,
            ACTION_PART TEXT,
            TAGGEDACTION TEXT,
            CAUSE TEXT,
            dataset_id TEXT DEFAULT 'AVIATION_MAINTENANCE',
            source_id TEXT,
            FOREIGN KEY (source_id) REFERENCES dataset_sources(source_id)
        )
    """)
    
    # Fault/Health summary (derived from datasets)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS faults_summary (
            fault_id INTEGER PRIMARY KEY AUTOINCREMENT,
            dataset_id TEXT,
            observation_id INTEGER,
            fault_type TEXT,
            health_state TEXT,
            confidence REAL,
            detection_method TEXT,
            source_id TEXT,
            FOREIGN KEY (source_id) REFERENCES dataset_sources(source_id)
        )
    """)
    
    # Create indexes for performance
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sensor_faulty ON sensor_parameters(faulty)")
    # NASA C-MAPSS index removed
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_maintenance_type ON maintenance_records(PROBLEM_TYPE)")
    
    conn.commit()
    logging.info("Database schema created successfully")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    create_database_schema(conn)
    return conn

def ingest_helicopters(conn):
    logging.info("Ingesting Real Helicopter Master Dataset...")
    file_path = os.path.join(RAW_DIR, 'helicopters', 'helicopters.csv')
    if not os.path.exists(file_path):
        logging.warning(f"File not found: {file_path}")
        return None
        
    # Insert dataset source information
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO dataset_sources 
        (source_id, dataset_name, provider, source_url, license, description, dataset_type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        'HELICOPTER_MASTER',
        'Helicopter Master Reference Dataset',
        'Verified Public Sources',
        'Multiple verified aviation sources',
        'Public Domain',
        'Real helicopter specifications and reference data - verified public information',
        'Helicopter Intelligence'
    ))
    
    df = pd.read_csv(file_path)
    # Add source_id to dataframe
    df['source_id'] = 'HELICOPTER_MASTER'
    df.to_sql('helicopters', conn, if_exists='replace', index=False)
    conn.commit()
    
    logging.info(f"Successfully ingested {len(df)} helicopter records")
    return {"records": len(df), "columns": len(df.columns)}

def ingest_components(conn):
    logging.info("Ingesting Component Reference Dataset...")
    file_path = os.path.join(RAW_DIR, 'components', 'components_reference.csv')
    if not os.path.exists(file_path):
        logging.warning(f"File not found: {file_path}")
        return None
        
    # Insert dataset source information
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO dataset_sources 
        (source_id, dataset_name, provider, source_url, license, description, dataset_type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        'HELICOPTER_COMPONENTS',
        'Helicopter Component Reference Taxonomy',
        'Reference Taxonomy',
        'Internal reference compilation',
        'Reference Use',
        'General helicopter component taxonomy - not official IPC data',
        'Helicopter Components'
    ))
    
    df = pd.read_csv(file_path)
    df.to_sql('components', conn, if_exists='replace', index=False)
    conn.commit()
    
    logging.info(f"Successfully ingested {len(df)} component references")
    return {"records": len(df), "columns": len(df.columns)}

def ingest_maintenance(conn):
    logging.info("Ingesting Annotated Aviation Maintenance Logbook Dataset...")
    file_path = os.path.join(RAW_DIR, 'maintenance', 'ANNOTATED LOGBOOK.csv')
    if not os.path.exists(file_path):
        logging.warning(f"File not found: {file_path}")
        return None
        
    # Insert dataset source information
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO dataset_sources 
        (source_id, dataset_name, provider, source_url, license, description, dataset_type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        'AVIATION_MAINTENANCE',
        'Annotated Aviation Maintenance Logbook',
        'Aviation Maintenance Dataset',
        'Annotated maintenance records dataset',
        'Dataset License',
        'Real annotated aviation maintenance logbook with problem/action/cause analysis',
        'Aviation Maintenance'
    ))
    
    df = pd.read_csv(file_path)
    # Clean up column names
    df.columns = [c.strip().replace(" ", "_").replace("/", "_") for c in df.columns]
    # Add source_id
    df['source_id'] = 'AVIATION_MAINTENANCE'
    df.to_sql('maintenance_records', conn, if_exists='replace', index=False)
    
    # Create FTS for maintenance search
    try:
        cursor.execute("DROP TABLE IF EXISTS maintenance_search")
        # FTS5 requires text columns; cast numeric ACTION_TYPE to TEXT
        cursor.execute("""
            CREATE VIRTUAL TABLE maintenance_search USING fts5(
                IDENT, PROBLEM, PROBLEM_TYPE, LOCATION, PROBLEM_PART,
                TAGGEDPROBLEM, EFFECT, ACTION, ACTION_TYPE, INSTALL_REPLACE_WITH,
                ACTION_PART, TAGGEDACTION, CAUSE
            );
        """)
        cursor.execute("""
            INSERT INTO maintenance_search 
            SELECT 
                CAST(IDENT AS TEXT),
                COALESCE(PROBLEM,''),
                COALESCE(PROBLEM_TYPE,''),
                COALESCE(LOCATION,''),
                COALESCE(PROBLEM_PART,''),
                COALESCE(TAGGEDPROBLEM,''),
                COALESCE(EFFECT,''),
                COALESCE(ACTION,''),
                COALESCE(CAST(ACTION_TYPE AS TEXT),''),
                COALESCE(INSTALL_REPLACE_WITH,''),
                COALESCE(ACTION_PART,''),
                COALESCE(TAGGEDACTION,''),
                COALESCE(CAUSE,'')
            FROM maintenance_records
        """)
        conn.commit()
        logging.info("Created full-text search index for maintenance records")
    except Exception as e:
        logging.error(f"FTS error: {e}")
        
    logging.info(f"Successfully ingested {len(df)} maintenance records")
    return {"records": len(df), "columns": len(df.columns)}

def ingest_phm_engine(conn):
    logging.info("Ingesting PHM 2024 Helicopter Turboshaft Engine Dataset...")
    base_path = os.path.join(RAW_DIR, 'phm_helicopter')
    
    xtrain_path = os.path.join(base_path, 'X_train.csv')
    ytrain_path = os.path.join(base_path, 'y_train.csv')
    
    if not os.path.exists(xtrain_path):
        logging.warning("PHM 2024 helicopter dataset not found.")
        return None
    
    # Insert dataset source information
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO dataset_sources 
        (source_id, dataset_name, provider, source_url, license, description, dataset_type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        'PHM_HELICOPTER_ENGINE',
        'PHM 2024 Helicopter Turboshaft Engine Health Dataset',
        'PHM North America 2024',
        'PHM Conference 2024 Challenge Dataset',
        'Challenge Dataset License',
        'Real helicopter turboshaft engine health monitoring dataset with fault detection labels',
        'Helicopter Engine Health'
    ))
    
    # --- Chunked ingestion to handle large dataset without MemoryError ---
    CHUNK = 50000
    MAX_ROWS = 300000   # cap at 300k rows to stay within available RAM
    total_rows = 0
    first_chunk = True

    # Load y_train into memory once (smaller file) for merging
    df_y = None
    if os.path.exists(ytrain_path):
        df_y = pd.read_csv(ytrain_path, nrows=MAX_ROWS)
        logging.info("Loaded y_train.csv for merging")
    else:
        logging.warning("y_train.csv not found, proceeding without health labels")

    fault_rows = []

    for chunk_x in pd.read_csv(xtrain_path, chunksize=CHUNK, nrows=MAX_ROWS):
        if df_y is not None:
            id_col = 'id' if 'id' in chunk_x.columns else 'ID'
            chunk = pd.merge(chunk_x, df_y, on=id_col, how='left')
        else:
            chunk = chunk_x

        chunk['source_id'] = 'PHM_HELICOPTER_ENGINE'

        mode = 'replace' if first_chunk else 'append'
        chunk.to_sql('sensor_parameters', conn, if_exists=mode, index=False)
        conn.commit()

        # Collect fault summary rows (lightweight — only id + faulty)
        if 'faulty' in chunk.columns:
            for _, row in chunk[['id', 'faulty']].dropna().iterrows():
                fault_rows.append({
                    'dataset_id': 'PHM_HELICOPTER_ENGINE',
                    'observation_id': int(row['id']),
                    'fault_type': 'Engine Health',
                    'health_state': 'Faulty' if row['faulty'] == 1 else 'Healthy',
                    'confidence': 1.0,
                    'detection_method': 'PHM Dataset Label',
                    'source_id': 'PHM_HELICOPTER_ENGINE'
                })

        total_rows += len(chunk)
        first_chunk = False
        logging.info(f"  Ingested {total_rows:,} rows so far...")

    # Write fault summary
    if fault_rows:
        pd.DataFrame(fault_rows).to_sql('faults_summary', conn, if_exists='replace', index=False)
        logging.info(f"Generated {len(fault_rows):,} fault summary records")

    logging.info(f"Successfully ingested {total_rows:,} PHM helicopter engine observations")
    return {"records": total_rows, "columns": 9}

def generate_data_dictionary(conn):
    """Generate comprehensive data dictionary for all datasets"""
    cursor = conn.cursor()
    
    data_dict = {
        "generated_at": datetime.utcnow().isoformat(),
        "datasets": {},
        "tables": {}
    }
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    
    for table in tables:
        table_name = table[0]
        if table_name.startswith('sqlite_'):
            continue
            
        # Get table schema
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = cursor.fetchall()
        
        # Get record count
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        record_count = cursor.fetchone()[0]
        
        data_dict["tables"][table_name] = {
            "record_count": record_count,
            "columns": {}
        }
        
        for col in columns:
            col_name = col[1]
            col_type = col[2]
            
            # Get sample values and statistics
            try:
                cursor.execute(f"SELECT DISTINCT {col_name} FROM {table_name} LIMIT 5")
                sample_values = [row[0] for row in cursor.fetchall()]
            except:
                sample_values = []
            
            # Convert any non-serializable types (e.g. bytes) to strings
            safe_samples = []
            for v in sample_values:
                if isinstance(v, bytes):
                    safe_samples.append(v.decode("utf-8", errors="replace"))
                elif v is None or isinstance(v, (str, int, float, bool)):
                    safe_samples.append(v)
                else:
                    safe_samples.append(str(v))

            data_dict["tables"][table_name]["columns"][col_name] = {
                "data_type": col_type,
                "sample_values": safe_samples
            }
    
    # Save data dictionary
    dict_path = os.path.join(METADATA_DIR, 'data_dictionary.json')
    with open(dict_path, 'w') as f:
        json.dump(data_dict, f, indent=4)
    
    logging.info(f"Generated data dictionary: {dict_path}")

def run_ingestion():
    conn = get_db_connection()
    registry = {
        "last_updated": datetime.utcnow().isoformat(),
        "datasets": {}
    }
    
    # Run ingestion for all datasets
    registry["datasets"]["helicopters"] = ingest_helicopters(conn)
    registry["datasets"]["components"] = ingest_components(conn)
    registry["datasets"]["maintenance"] = ingest_maintenance(conn)
    registry["datasets"]["phm_engine"] = ingest_phm_engine(conn)
    
    # Generate data dictionary
    generate_data_dictionary(conn)
    
    conn.close()
    
    # Save dataset registry
    with open(os.path.join(METADATA_DIR, 'dataset_registry.json'), 'w') as f:
        json.dump(registry, f, indent=4)
        
    logging.info("Dataset ingestion completed successfully.")
    
    # Print summary
    print("\n" + "="*60)
    print("HELIXPERT DATASET INGESTION SUMMARY")
    print("="*60)
    for dataset, info in registry["datasets"].items():
        if info:
            print(f"{dataset.upper():20} | {info.get('records', 0):8,} records")
        else:
            print(f"{dataset.upper():20} | {'NOT LOADED':>8}")
    print("="*60)
    
if __name__ == '__main__':
    run_ingestion()
