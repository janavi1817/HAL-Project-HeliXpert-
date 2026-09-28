# Dynamic Query Engine Testing Guide

This guide explains how to run and interpret tests for the HeliXpert Dynamic Query Engine.

## Overview

The Dynamic Query Engine translates natural language questions into SQL queries dynamically. Testing ensures:
- Correct intent detection (COUNT, LIST, AVERAGE, etc.)
- Proper filter extraction (component types, faulty sensors, manufacturers)
- **CRITICAL**: Filters are applied **BEFORE** aggregation operations
- Multilingual support works correctly
- Results match actual database content

---

## Test Files

### 1. `backend/ai/test_dynamic_engine.py` - Unit Tests
**Purpose**: Test individual components of the query engine in isolation

**What it tests**:
- Operation detection (COUNT, LIST, AVERAGE, MAX, MIN, GROUP_BY)
- Entity detection (helicopters, components, sensors, maintenance)
- Filter extraction (component types, faulty status, manufacturers)
- SQL generation (including WHERE clause positioning)
- Multilingual query parsing (Hindi, Kannada)
- Edge cases (empty queries, unknown entities)

**How to run**:
```bash
# From project root
python -m pytest backend/ai/test_dynamic_engine.py -v

# OR with unittest
python backend/ai/test_dynamic_engine.py
```

**Expected output**:
```
test_detect_count_operation ... ok
test_detect_list_operation ... ok
test_extract_component_type_filter ... ok
test_sql_count_with_filter ... ok
test_where_before_aggregation ... ok
...
----------------------------------------------------------------------
Ran 35 tests in 0.5s

OK
```

---

### 2. `test_queries.py` - Integration Tests
**Purpose**: Test complete query workflows against the real database

**What it tests**:
- End-to-end query execution
- Result correctness against actual database content
- Filter effectiveness (e.g., "rotor components" returns only rotor)
- **CRITICAL**: Aggregation on filtered data (not full dataset)
- Multilingual queries return correct results
- Chart type selection

**How to run**:
```bash
# From project root
python test_queries.py
```

**Expected output**:
```
================================================================================
  HeliXpert Dynamic Query System - Integration Tests
================================================================================

Initializing Dynamic Query Engine...
✓ Engine initialized

Gathering database statistics...
✓ Database stats loaded:
  - Total helicopters: 20
  - Total components: 150
  - Faulty sensors: 50000

================================================================================
  Testing COUNT Operations
================================================================================
✓ PASS | Count all helicopters
       Expected: 20, Got: 20
✓ PASS | Count rotor components (filtered)
       Expected: 2, Got: 2
✓ PASS |   → WHERE clause present in filtered count
       SQL: SELECT COUNT(*) AS total FROM components WHERE component_type LIKE '%Rotor System%'

================================================================================
  CRITICAL VERIFICATION: WHERE Before Aggregation
================================================================================
✓ PASS | How many rotor components? - WHERE before COUNT
       Should filter before counting
✓ PASS | Average MGT for faulty sensors - WHERE before AVG
       Should filter before averaging

✓ All critical tests PASSED
✓ WHERE clauses are correctly applied BEFORE aggregation
```

---

## Expected Results for Key Queries

### Query: "How many rotor system components?"
- **Expected**: 2 (based on actual database content)
- **SQL**: `SELECT COUNT(*) AS total FROM components WHERE component_type LIKE '%Rotor System%'`
- **Key verification**: WHERE clause present and returns filtered count

### Query: "List all propulsion components"
- **Expected**: Only records where `component_type` contains "Propulsion"
- **SQL**: `SELECT component_type, component_name, description FROM components WHERE component_type LIKE '%Propulsion%' LIMIT 20`
- **Key verification**: All returned records have Propulsion type

### Query: "How many components by category?"
- **Expected**: Multiple rows, one per component type with counts
- **SQL**: `SELECT component_type, COUNT(*) AS count FROM components GROUP BY component_type`
- **Key verification**: Number of rows equals number of component types in DB

### Query: "Average MGT for faulty sensors"
- **Expected**: Average calculated ONLY from faulty sensors (faulty=1)
- **SQL**: `SELECT ROUND(AVG(mgt), 2) AS average FROM sensor_parameters WHERE faulty = 1`
- **CRITICAL**: Result should differ from overall average
- **Key verification**: WHERE clause filters BEFORE AVG() calculation

### Query: "Show all helicopters"
- **Expected**: List of helicopter records (up to 20)
- **SQL**: `SELECT model, manufacturer, variant, helicopter_type, country FROM helicopters LIMIT 20`
- **Key verification**: Returns actual helicopter data

### Multilingual Queries
- **Hindi**: "कितने हेलीकॉप्टर हैं?" → Should detect COUNT + helicopters
- **Kannada**: "ಎಷ್ಟು ಹೆಲಿಕಾಪ್ಟರ್ ಇವೆ?" → Should detect COUNT + helicopters
- **Expected**: Same SQL as English equivalent, explanation in target language

---

## Critical Test: Filters Before Aggregation

### Why This Matters
Incorrect: `SELECT AVG(mgt) FROM sensor_parameters` + filter in Python (wrong - uses all data)
Correct: `SELECT AVG(mgt) FROM sensor_parameters WHERE faulty = 1` (right - filters first)

### How to Verify
1. Run: `python test_queries.py`
2. Look for section: **"CRITICAL VERIFICATION: WHERE Before Aggregation"**
3. All tests should show: `✓ PASS | ... WHERE before AVG/COUNT`
4. Check SQL output contains: `WHERE faulty = 1` BEFORE `AVG(mgt)`

### If This Fails
- Average for "faulty sensors" will equal average for "all sensors"
- Counts with filters will return total count instead of filtered count
- Fix required in `dynamic_query_engine.py` `generate_sql()` method

---

## Troubleshooting

### Test Failure: "Query failed or no data"
**Cause**: Database connection issue or empty table
**Solution**: 
1. Verify database exists: `ls data/database/helixpert.db`
2. Check tables: `python -c "import sqlite3; conn = sqlite3.connect('data/database/helixpert.db'); print(conn.execute('SELECT name FROM sqlite_master WHERE type=\"table\"').fetchall())"`

### Test Failure: "Expected X, Got Y" (counts don't match)
**Cause**: Database content differs from test expectations
**Solution**: Run `python test_queries.py` which dynamically reads actual DB stats

### Test Failure: "WHERE clause not found"
**Cause**: SQL generation doesn't include filters
**Solution**: Check `generate_sql()` method in `dynamic_query_engine.py`, ensure filters are added to WHERE clause

### Test Failure: "WHERE comes after aggregation"
**Cause**: CRITICAL bug - aggregation on full dataset instead of filtered data
**Solution**: Restructure SQL generation to build WHERE clause BEFORE SELECT with aggregation

### Multilingual Tests Fail
**Cause**: Keywords not detected in Hindi/Kannada
**Solution**: Add missing keywords to `operation_patterns` or `entity_map` in `dynamic_query_engine.py`

---

## Running Specific Tests

### Run only unit tests for filter extraction
```bash
python -m pytest backend/ai/test_dynamic_engine.py::TestDynamicQueryEngine::test_extract_component_type_filter -v
```

### Run only integration tests for COUNT operations
```python
# Edit test_queries.py, comment out other test functions in main(), keep only:
test_count_queries(engine, stats)
```

### Test a single query manually
```python
from backend.ai.dynamic_query_engine import DynamicQueryEngine
engine = DynamicQueryEngine('data/database/helixpert.db')
result = engine.execute_query("How many rotor components?")
print(result)
```

---

## Adding New Tests

### For Unit Tests (test_dynamic_engine.py)
1. Add method to `TestDynamicQueryEngine` class
2. Name it `test_<what_it_tests>`
3. Use assertions: `self.assertEqual()`, `self.assertIn()`, etc.
4. Test one specific behavior

Example:
```python
def test_new_filter_type(self):
    """Test detection of new filter type"""
    parsed = self.engine.parse_query("Show hydraulic components")
    self.assertEqual(len(parsed['filters']), 1)
    self.assertEqual(parsed['filters'][0]['field'], 'component_type')
    self.assertIn('Hydraulic', parsed['filters'][0]['value'])
```

### For Integration Tests (test_queries.py)
1. Add function like `test_<operation>_queries(engine, stats)`
2. Call it from `main()`
3. Use `print_result()` for formatted output
4. Verify against real database stats

Example:
```python
def test_max_queries(engine, stats):
    print_header("Testing MAX Operations")
    result = engine.execute_query("What is the highest MGT?")
    passed = result['isValid'] and len(result['chartData']) > 0
    print_result("Find highest MGT", passed, f"Returned {len(result['chartData'])} records")
```

---

## Continuous Integration

To run tests automatically in CI/CD:

```yaml
# .github/workflows/test.yml
- name: Run Dynamic Query Engine Tests
  run: |
    python -m pytest backend/ai/test_dynamic_engine.py -v
    python test_queries.py
```

---

## Test Coverage Goals

- ✓ All operation types (COUNT, LIST, AVG, MAX, MIN, GROUP_BY)
- ✓ All entity types (helicopters, components, sensors, maintenance)
- ✓ All filter types (component_type, faulty, manufacturer)
- ✓ Multilingual (English, Hindi, Kannada)
- ✓ Edge cases (empty, unknown, invalid)
- ✓ **CRITICAL**: WHERE before aggregation in all cases

---

## Support

If tests fail consistently:
1. Check database integrity: `sqlite3 data/database/helixpert.db "SELECT COUNT(*) FROM components"`
2. Review query parsing logic in `dynamic_query_engine.py`
3. Compare expected vs actual SQL in test output
4. Verify filter extraction patterns match your query keywords

For questions, refer to:
- `backend/ai/DYNAMIC_ENGINE_README.md` - Engine architecture
- `backend/ai/dynamic_query_engine.py` - Implementation
- Test output logs - Detailed failure information
