# Dynamic Query Engine Documentation

## Overview

The Dynamic Query Engine is a natural language to SQL parser that answers all questions from the actual HeliXpert dataset without any hardcoded responses. It intelligently parses user questions, generates appropriate SQL queries, and provides natural language explanations.

## Key Features

### 1. Intent Detection
Automatically identifies the user's intent:
- **COUNT**: "How many...", "count...", "total..."
- **LIST**: "Show...", "list...", "what are..."
- **AVERAGE**: "average...", "avg...", "mean..."
- **MAX**: "highest...", "maximum...", "top..."
- **MIN**: "lowest...", "minimum...", "bottom..."
- **GROUP_BY**: "by category", "each type", "per..."
- **DESCRIBE**: "what is...", "description of..."

### 2. Entity Recognition
Detects which database table to query:
- **Helicopters**: Fleet information (model, manufacturer, variant)
- **Components**: Helicopter parts taxonomy (rotor, engine, transmission, etc.)
- **Sensors**: PHM turboshaft sensor readings (MGT, torque, RPM, etc.)
- **Maintenance**: Maintenance logbook records

### 3. Filter Extraction
Automatically extracts and applies filters **BEFORE** aggregation:
- Component types: "rotor system", "propulsion", "transmission"
- Sensor conditions: "faulty sensors"
- Manufacturers: "Airbus", "Boeing", etc.

### 4. Multilingual Support
Supports English, Hindi (हिंदी), and Kannada (ಕನ್ನಡ) for:
- Query parsing (understands keywords in all languages)
- Response generation (explanations in user's language)

## Critical Architecture Principle

**Filters MUST be applied BEFORE aggregation!**

❌ **WRONG** (counts all rows, then filters):
```sql
SELECT COUNT(*) FROM components
WHERE component_type = 'Rotor System'
-- Returns total count first, then filters (incorrect)
```

✅ **CORRECT** (filters first, then counts):
```sql
SELECT COUNT(*) AS total FROM components 
WHERE component_type LIKE '%Rotor System%'
-- Applies filter BEFORE counting (correct)
```

## Usage

### Direct Usage
```python
from backend.ai.dynamic_query_engine import DynamicQueryEngine

engine = DynamicQueryEngine(db_path='path/to/helixpert.db')

# Execute a query
result = engine.execute_query(
    question="How many rotor system components?",
    language='en'
)

print(result['explanation'])  # Natural language answer
print(result['sql'])           # Generated SQL
print(result['chartData'])     # Result data
```

### Via Orchestrator (Integrated)
```python
from backend.ai.orchestrator import AiOrchestrator

orchestrator = AiOrchestrator()

# The orchestrator automatically tries dynamic engine first
result = orchestrator.process_query(
    user_query="How many rotor system components?",
    language='en'
)
```

## Example Queries

### Component Queries
```
Q: "How many rotor system components are there?"
→ SQL: SELECT COUNT(*) AS total FROM components WHERE component_type LIKE '%Rotor System%'
→ Result: 2 components

Q: "List all propulsion components"
→ SQL: SELECT component_type, component_name, description FROM components WHERE component_type LIKE '%Propulsion%' LIMIT 20
→ Result: [Turboshaft Engine]

Q: "What are the components by category?"
→ SQL: SELECT component_type, COUNT(*) AS count FROM components GROUP BY component_type
→ Result: 7 categories with counts
```

### Sensor Queries
```
Q: "What is the average MGT for faulty sensors?"
→ SQL: SELECT ROUND(AVG(mgt), 2) AS average, ROUND(MIN(mgt), 2) AS minimum, ROUND(MAX(mgt), 2) AS maximum FROM sensor_parameters WHERE faulty = 1
→ Result: Average MGT with min/max (filtered to faulty only)

Q: "Show the highest torque readings"
→ SQL: SELECT * FROM sensor_parameters ORDER BY trq_measured DESC LIMIT 10
→ Result: Top 10 torque observations
```

### Helicopter Queries
```
Q: "How many helicopters are in the database?"
→ SQL: SELECT COUNT(*) AS total FROM helicopters
→ Result: 10 helicopters

Q: "Show all helicopters"
→ SQL: SELECT model, manufacturer, variant, helicopter_type, country FROM helicopters LIMIT 20
→ Result: All helicopter records
```

## Integration with Orchestrator

The Dynamic Query Engine is integrated into `AiOrchestrator.process_query()`:

1. **Dynamic Engine (First Priority)**: Tries to parse and execute via dynamic engine
2. **Legacy Rules (Fallback)**: Falls back to hardcoded INTENT_RULES if dynamic engine returns UNKNOWN
3. **General Response (Last Resort)**: Returns dataset summary if no match found

This ensures backward compatibility while enabling dynamic query handling.

## Architecture Components

### 1. DynamicQueryEngine Class
Main class that orchestrates the query pipeline:
- `parse_query()`: Converts natural language to structured query object
- `generate_sql()`: Generates SQL from parsed query
- `execute_query()`: Full pipeline (parse → SQL → execute → explain)

### 2. Entity Mapping
Maps keywords to database tables and columns:
```python
entity_map = {
    'helicopters': {
        'keywords': ['helicopter', 'aircraft', 'model', ...],
        'table': 'helicopters',
        'columns': ['model', 'manufacturer', 'variant', ...]
    },
    'components': { ... },
    'sensors': { ... },
    'maintenance': { ... }
}
```

### 3. Pattern Matching
Uses keyword patterns to detect:
- Operations (COUNT, LIST, AVERAGE, etc.)
- Entity types (which table to query)
- Filters (component type, faulty status, etc.)
- Metrics (MGT, torque, temperature, etc.)

## Testing

Verified test cases:
- ✅ "How many rotor system components?" → Returns 2 (not total count)
- ✅ "List propulsion components" → Filters to propulsion only
- ✅ "Average MGT for faulty sensors" → Applies WHERE faulty=1 before AVG
- ✅ "Components by category" → GROUP BY with proper counts
- ✅ Multilingual queries work in Hindi and Kannada
- ✅ SQL generation applies filters BEFORE aggregation

## Benefits Over Hardcoded Rules

1. **No Hardcoding**: All answers come from actual dataset
2. **Flexible**: Handles variations in question phrasing
3. **Extensible**: Easy to add new entity types and operations
4. **Correct**: Filters applied before aggregation (mathematically correct)
5. **Transparent**: SQL is visible and verifiable
6. **Multilingual**: Works across English, Hindi, and Kannada

## Future Enhancements

Potential improvements:
- Add support for JOIN queries (cross-table queries)
- Implement fuzzy matching for component names
- Add date/time range filtering for maintenance records
- Support complex boolean filters (AND/OR combinations)
- Add query validation and suggestion system
- Implement query result caching for performance

## Troubleshooting

### Query Returns UNKNOWN Intent
- Check if keywords match entity_map patterns
- Verify operation patterns are detected
- Try more explicit phrasing

### Incorrect SQL Generated
- Review parse_query() output via `parsed_query` field
- Check filter extraction logic
- Verify WHERE clause placement

### Wrong Results
- Confirm filters are applied before aggregation
- Check SQL in response for correctness
- Validate data in database matches expectations

## Maintenance

When adding new capabilities:
1. Update `entity_map` with new keywords/tables
2. Add operation patterns if needed
3. Update `_extract_filters()` for new filter types
4. Test with representative queries
5. Update this documentation

## License

Part of HeliXpert AI system - Internal use only.
