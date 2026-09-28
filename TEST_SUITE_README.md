# HeliXpert Dynamic Query System - Test Suite

This test suite verifies the dynamic query system works correctly for all query types and ensures filters are properly applied before aggregation.

## Files Created

### 1. **`backend/ai/test_dynamic_engine.py`** - Unit Tests
- **Purpose**: Test individual components in isolation
- **Test Count**: 30 unit tests
- **Coverage**:
  - ✅ Operation detection (COUNT, LIST, AVERAGE, MAX, MIN, GROUP_BY)
  - ✅ Entity detection (helicopters, components, sensors, maintenance)
  - ✅ Filter extraction (component types, faulty status, manufacturers)
  - ✅ SQL generation with WHERE clauses
  - ✅ Multilingual query parsing (Hindi, Kannada)
  - ✅ Edge cases (empty queries, unknown entities)

### 2. **`test_queries.py`** - Integration Tests
- **Purpose**: Test complete query workflows against real database
- **Coverage**:
  - ✅ End-to-end query execution
  - ✅ Result correctness vs actual database content
  - ✅ Filter effectiveness (e.g., "rotor components" returns only rotor)
  - ✅ **CRITICAL**: Filtered aggregation (avg/count on subset, not full dataset)
  - ✅ Multilingual queries with correct results
  - ✅ Chart type selection

### 3. **`backend/ai/TESTING_GUIDE.md`** - Documentation
- **Purpose**: Complete guide for running and interpreting tests
- **Contents**:
  - How to run tests
  - Expected results for each query type
  - Troubleshooting guide
  - How to add new tests

## Quick Start

### Run All Tests
```bash
# Unit tests
python backend/ai/test_dynamic_engine.py

# Integration tests
python test_queries.py
```

### Expected Output
```
✓ All critical tests PASSED
✓ WHERE clauses are correctly applied BEFORE aggregation
✓ Dynamic query system is working correctly
```

## Test Results Summary

### ✅ Unit Tests - ALL PASSED (30/30)
```
Ran 30 tests in 0.010s
OK
```

### ✅ Integration Tests - ALL PASSED
```
✓ Count Operations: 4/4 tests passed
✓ List Operations: 4/4 tests passed
✓ Group By Operations: 8/8 tests passed
✓ Average Operations: 5/5 tests passed
✓ Multilingual: 4/4 tests passed
✓ Edge Cases: 3/3 tests passed
✓ Critical Verification: 3/3 tests passed
```

## Key Verifications

### ✅ Filters Applied Before Aggregation
**Test**: "Average MGT for faulty sensors"
- **Expected**: 601.14°C (average of faulty sensors only)
- **Got**: 601.14°C ✓
- **Overall Average**: 592.25°C (different, as expected)
- **SQL**: `SELECT ROUND(AVG(mgt), 2) FROM sensor_parameters WHERE faulty = 1`

This proves filters are applied BEFORE aggregation, not after.

### ✅ Filtered Counts Return Correct Values
**Test**: "How many rotor components?"
- **Expected**: 2 (actual count in database)
- **Got**: 2 ✓
- **SQL**: `SELECT COUNT(*) FROM components WHERE component_type LIKE '%Rotor System%'`

### ✅ GROUP BY Returns All Categories
**Test**: "Components by category"
- **Expected**: 7 groups (Rotor System, Propulsion, Transmission, etc.)
- **Got**: 7 groups ✓
- **All counts match**: Every category count matches database

### ✅ Multilingual Queries Work
- **Hindi**: "कितने हेलीकॉप्टर हैं?" → Correctly detected COUNT + helicopters
- **Kannada**: "ಎಷ್ಟು ಹೆಲಿಕಾಪ್ಟರ್ ಇವೆ?" → Correctly detected COUNT + helicopters

## Database Statistics (Test Environment)
- Total helicopters: 10
- Total components: 8
  - Rotor System: 2
  - Propulsion: 1
  - Transmission: 1
  - Fuel System: 1
  - Hydraulic System: 1
  - Avionics: 1
  - Airframe: 1
- Total sensor observations: 742,625
- Faulty sensor observations: 299,418

## Critical Test Cases

### Test Case 1: Filtered COUNT
```
Query: "How many rotor system components?"
Expected: 2
Result: ✓ PASS (2)
SQL: SELECT COUNT(*) AS total FROM components WHERE component_type LIKE '%Rotor System%'
```

### Test Case 2: Filtered AVERAGE
```
Query: "Average MGT for faulty sensors"
Expected: 601.14
Result: ✓ PASS (601.14)
SQL: SELECT ROUND(AVG(mgt), 2) FROM sensor_parameters WHERE faulty = 1
Verification: Different from overall average (592.25) ✓
```

### Test Case 3: LIST with Filter
```
Query: "List all propulsion components"
Expected: Only Propulsion type components
Result: ✓ PASS (1 record, all Propulsion type)
SQL: SELECT component_type, component_name, description FROM components WHERE component_type LIKE '%Propulsion%'
```

### Test Case 4: GROUP BY
```
Query: "How many components by category?"
Expected: 7 groups with correct counts
Result: ✓ PASS (all 7 groups match database)
SQL: SELECT component_type, COUNT(*) FROM components GROUP BY component_type
```

## Maintenance

### When to Run Tests
- ✅ After modifying `dynamic_query_engine.py`
- ✅ Before deploying to production
- ✅ After adding new query patterns
- ✅ After database schema changes

### Adding New Tests
See `backend/ai/TESTING_GUIDE.md` for detailed instructions on adding:
- New unit tests for query patterns
- New integration tests for workflows
- New edge cases

### Continuous Integration
Tests can be integrated into CI/CD pipelines:
```yaml
- name: Test Dynamic Query Engine
  run: |
    python backend/ai/test_dynamic_engine.py
    python test_queries.py
```

## Troubleshooting

### If Tests Fail
1. **Check database**: Verify `data/database/helixpert.db` exists and has data
2. **Check SQL output**: Tests print generated SQL for debugging
3. **Review logs**: Integration tests provide detailed output
4. **Consult guide**: See `backend/ai/TESTING_GUIDE.md` for specific failure scenarios

### Common Issues
- **"No data returned"**: Database may be empty or path incorrect
- **"Expected X, Got Y"**: Database content may differ from expectations
- **"WHERE clause not found"**: SQL generation may need adjustment

## Success Criteria

### ✅ All Tests Passing
- [x] 30/30 unit tests pass
- [x] All integration test suites pass
- [x] Critical verification tests pass
- [x] Multilingual tests pass

### ✅ Correct Behavior Verified
- [x] Filters applied before aggregation
- [x] Counts return filtered results
- [x] Averages calculated on filtered data
- [x] GROUP BY returns all categories
- [x] Multilingual queries work correctly

## Documentation
- **Testing Guide**: `backend/ai/TESTING_GUIDE.md`
- **Engine Documentation**: `backend/ai/DYNAMIC_ENGINE_README.md`
- **Implementation**: `backend/ai/dynamic_query_engine.py`

---

**Status**: ✅ All tests passing - System verified and ready for use
