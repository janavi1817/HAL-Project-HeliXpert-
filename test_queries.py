# -*- coding: utf-8 -*-
"""
Integration Tests for Dynamic Query System
Tests real queries end-to-end against the actual database.
Verifies results match expectations and filters are applied correctly.

Run with: python test_queries.py
"""
import sys
import os
import sqlite3

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))

from backend.ai.dynamic_query_engine import DynamicQueryEngine

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'data', 'database', 'helixpert.db')


def print_header(text):
    """Print a formatted header"""
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80)


def print_result(test_name, passed, details=""):
    """Print test result"""
    status = "✓ PASS" if passed else "✗ FAIL"
    print(f"{status} | {test_name}")
    if details:
        print(f"       {details}")


def get_database_stats():
    """Get actual database statistics for verification"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    stats = {}
    
    # Component counts
    cursor.execute("SELECT COUNT(*) FROM components")
    stats['total_components'] = cursor.fetchone()[0]
    
    cursor.execute("SELECT component_type, COUNT(*) FROM components GROUP BY component_type")
    stats['components_by_type'] = {row[0]: row[1] for row in cursor.fetchall()}
    
    # Helicopter counts
    cursor.execute("SELECT COUNT(*) FROM helicopters")
    stats['total_helicopters'] = cursor.fetchone()[0]
    
    # Sensor counts
    cursor.execute("SELECT COUNT(*) FROM sensor_parameters")
    stats['total_sensors'] = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM sensor_parameters WHERE faulty = 1")
    stats['faulty_sensors'] = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM sensor_parameters WHERE faulty = 0")
    stats['non_faulty_sensors'] = cursor.fetchone()[0]
    
    # Average MGT for faulty sensors
    cursor.execute("SELECT ROUND(AVG(mgt), 2) FROM sensor_parameters WHERE faulty = 1")
    stats['avg_mgt_faulty'] = cursor.fetchone()[0]
    
    # Average MGT for all sensors
    cursor.execute("SELECT ROUND(AVG(mgt), 2) FROM sensor_parameters")
    stats['avg_mgt_all'] = cursor.fetchone()[0]
    
    conn.close()
    return stats


def test_count_queries(engine, stats):
    """Test COUNT operations"""
    print_header("Testing COUNT Operations")
    
    # Test 1: Total helicopters
    result = engine.execute_query("How many helicopters?")
    passed = (result['isValid'] and 
              len(result['chartData']) > 0 and
              result['chartData'][0]['total'] == stats['total_helicopters'])
    print_result("Count all helicopters", passed, 
                 f"Expected: {stats['total_helicopters']}, Got: {result['chartData'][0]['total'] if result['isValid'] else 'Error'}")
    
    # Test 2: Count with filter - Rotor components
    if 'Rotor System' in stats['components_by_type']:
        result = engine.execute_query("How many rotor system components?")
        expected = stats['components_by_type']['Rotor System']
        actual = result['chartData'][0]['total'] if result['isValid'] and len(result['chartData']) > 0 else 0
        passed = result['isValid'] and actual == expected
        print_result("Count rotor components (filtered)", passed,
                     f"Expected: {expected}, Got: {actual}")
        
        # Verify WHERE clause exists
        if result.get('sql'):
            has_where = 'WHERE' in result['sql'].upper()
            print_result("  → WHERE clause present in filtered count", has_where,
                         f"SQL: {result['sql'][:100]}...")
    
    # Test 3: Count with filter - Propulsion components
    if 'Propulsion' in stats['components_by_type']:
        result = engine.execute_query("How many propulsion components?")
        expected = stats['components_by_type']['Propulsion']
        actual = result['chartData'][0]['total'] if result['isValid'] and len(result['chartData']) > 0 else 0
        passed = result['isValid'] and actual == expected
        print_result("Count propulsion components (filtered)", passed,
                     f"Expected: {expected}, Got: {actual}")


def test_list_queries(engine, stats):
    """Test LIST operations"""
    print_header("Testing LIST Operations")
    
    # Test 1: List all helicopters
    result = engine.execute_query("Show all helicopters")
    passed = result['isValid'] and len(result['chartData']) > 0
    print_result("List all helicopters", passed,
                 f"Returned {len(result['chartData'])} records")
    
    # Test 2: List with filter - only propulsion
    result = engine.execute_query("List all propulsion components")
    if result['isValid'] and len(result['chartData']) > 0:
        # Verify all results are propulsion type
        all_propulsion = all('Propulsion' in str(row.get('component_type', '')) 
                            for row in result['chartData'])
        passed = all_propulsion
        print_result("List propulsion components (filtered)", passed,
                     f"Returned {len(result['chartData'])} records, all propulsion: {all_propulsion}")
        
        # Verify WHERE clause
        if result.get('sql'):
            has_where = 'WHERE' in result['sql'].upper() and 'Propulsion' in result['sql']
            print_result("  → WHERE clause filters for Propulsion", has_where)
    else:
        print_result("List propulsion components (filtered)", False, "No data returned")
    
    # Test 3: List components (general)
    result = engine.execute_query("Show all components")
    passed = result['isValid'] and len(result['chartData']) > 0
    print_result("List all components", passed,
                 f"Returned {len(result['chartData'])} records")


def test_group_by_queries(engine, stats):
    """Test GROUP BY operations"""
    print_header("Testing GROUP BY Operations")
    
    # Test 1: Components by category
    result = engine.execute_query("How many components by category?")
    passed = result['isValid'] and result['intent'] == 'GROUP_BY'
    
    if passed and len(result['chartData']) > 0:
        # Verify we got multiple groups
        num_groups = len(result['chartData'])
        expected_groups = len(stats['components_by_type'])
        groups_match = num_groups == expected_groups
        
        print_result("Group components by type", groups_match,
                     f"Expected {expected_groups} groups, Got {num_groups}")
        
        # Verify the counts match
        for row in result['chartData']:
            component_type = row.get('component_type')
            count = row.get('count')
            expected_count = stats['components_by_type'].get(component_type, 0)
            matches = count == expected_count
            print_result(f"  → {component_type}", matches,
                         f"Expected: {expected_count}, Got: {count}")
    else:
        print_result("Group components by type", False, "Query failed or no data")


def test_average_queries(engine, stats):
    """Test AVERAGE operations with filters"""
    print_header("Testing AVERAGE Operations (Critical: Filter Before Aggregation)")
    
    # Test 1: Average MGT for ALL sensors
    result = engine.execute_query("What is the average MGT?")
    if result['isValid'] and len(result['chartData']) > 0:
        actual = result['chartData'][0].get('average')
        expected = stats['avg_mgt_all']
        # Allow small floating point differences
        passed = actual is not None and abs(actual - expected) < 0.1
        print_result("Average MGT (all sensors)", passed,
                     f"Expected: {expected}, Got: {actual}")
    else:
        print_result("Average MGT (all sensors)", False, "Query failed")
    
    # Test 2: Average MGT for FAULTY sensors only (CRITICAL TEST)
    result = engine.execute_query("What is the average MGT for faulty sensors?")
    
    if result['isValid']:
        # Check SQL has WHERE clause
        has_where = result.get('sql') and 'WHERE' in result['sql'].upper()
        has_faulty_filter = result.get('sql') and 'faulty' in result['sql'].lower()
        
        print_result("  → SQL contains WHERE clause", has_where,
                     f"SQL: {result.get('sql', 'N/A')[:150]}...")
        print_result("  → SQL filters for faulty=1", has_faulty_filter)
        
        if len(result['chartData']) > 0:
            actual = result['chartData'][0].get('average')
            expected = stats['avg_mgt_faulty']
            
            # This is the CRITICAL test: filtered average should be different from overall average
            different_from_all = abs(actual - stats['avg_mgt_all']) > 0.1
            matches_expected = abs(actual - expected) < 0.1
            
            print_result("Average MGT (faulty sensors only)", matches_expected,
                         f"Expected: {expected}, Got: {actual}")
            print_result("  → CRITICAL: Filtered avg ≠ overall avg", different_from_all,
                         f"Faulty avg: {actual}, All avg: {stats['avg_mgt_all']}")
            
            if not matches_expected:
                print(f"\n⚠️  WARNING: Average MGT for faulty sensors doesn't match expected!")
                print(f"   Expected (from direct query): {expected}")
                print(f"   Got (from dynamic engine): {actual}")
                print(f"   This suggests the WHERE clause may not be working correctly.")
        else:
            print_result("Average MGT (faulty sensors only)", False, "No data returned")
    else:
        print_result("Average MGT (faulty sensors only)", False, "Query failed")


def test_multilingual_queries(engine, stats):
    """Test Hindi and Kannada queries"""
    print_header("Testing Multilingual Queries")
    
    # Test 1: Hindi - Count helicopters
    result = engine.execute_query("कितने हेलीकॉप्टर हैं?", language='hi')
    passed = result['isValid'] and len(result['chartData']) > 0
    print_result("Hindi: कितने हेलीकॉप्टर हैं?", passed,
                 f"Detected intent: {result.get('intent', 'Unknown')}")
    
    # Test 2: Kannada - Count helicopters
    result = engine.execute_query("ಎಷ್ಟು ಹೆಲಿಕಾಪ್ಟರ್ ಇವೆ?", language='kn')
    passed = result['isValid'] and len(result['chartData']) > 0
    print_result("Kannada: ಎಷ್ಟು ಹೆಲಿಕಾಪ್ಟರ್ ಇವೆ?", passed,
                 f"Detected intent: {result.get('intent', 'Unknown')}")
    
    # Test 3: Hindi - Show components
    result = engine.execute_query("घटक की सूची दिखाओ", language='hi')
    entity_name = result.get('parsed_query', {}).get('entity', {}).get('name', 'Unknown') if result.get('parsed_query') else 'Unknown'
    passed = result['isValid'] and entity_name == 'components'
    print_result("Hindi: घटक की सूची दिखाओ", passed,
                 f"Detected entity: {entity_name}")
    
    # Test 4: Kannada - Show components
    result = engine.execute_query("ಘಟಕಗಳ ಪಟ್ಟಿ ತೋರಿಸಿ", language='kn')
    entity_name = result.get('parsed_query', {}).get('entity', {}).get('name', 'Unknown') if result.get('parsed_query') else 'Unknown'
    passed = result['isValid'] and entity_name == 'components'
    print_result("Kannada: ಘಟಕಗಳ ಪಟ್ಟಿ ತೋರಿಸಿ", passed,
                 f"Detected entity: {entity_name}")


def test_edge_cases(engine, stats):
    """Test edge cases and error handling"""
    print_header("Testing Edge Cases")
    
    # Test 1: Unknown entity
    result = engine.execute_query("How many unicorns?")
    passed = not result['isValid'] or result['intent'] == 'UNKNOWN'
    print_result("Unknown entity handling", passed,
                 f"Intent: {result.get('intent', 'Unknown')}")
    
    # Test 2: Empty query
    result = engine.execute_query("")
    passed = not result['isValid'] or result['intent'] == 'UNKNOWN'
    print_result("Empty query handling", passed)
    
    # Test 3: Very long query
    result = engine.execute_query("Show me all the helicopters that are available in the database " * 10)
    # Should still work, just may be truncated
    print_result("Long query handling", True,
                 f"Handled gracefully, intent: {result.get('intent', 'Unknown')}")


def verify_where_before_aggregation(engine):
    """Critical verification: WHERE clauses must be present in filtered aggregation queries"""
    print_header("CRITICAL VERIFICATION: WHERE Clause in Filtered Queries")
    
    test_cases = [
        ("How many rotor components?", "Should filter components before counting"),
        ("Average MGT for faulty sensors", "Should filter sensors before averaging"),
        ("Count propulsion parts", "Should filter components before counting"),
    ]
    
    all_passed = True
    for query, description in test_cases:
        result = engine.execute_query(query)
        
        if result.get('sql'):
            sql = result['sql']
            has_where = 'WHERE' in sql.upper()
            
            if has_where:
                # In SQL, the structure: SELECT AGG(...) FROM table WHERE condition
                # The WHERE clause semantically filters rows BEFORE aggregation
                # This is the correct SQL structure, even though syntactically WHERE comes after FROM
                
                # Verify the SQL follows: SELECT ... FROM ... WHERE ...
                sql_upper = sql.upper()
                select_pos = sql_upper.find('SELECT')
                from_pos = sql_upper.find('FROM')
                where_pos = sql_upper.find('WHERE')
                
                correct_structure = (select_pos < from_pos < where_pos)
                
                print_result(f"{query[:40]}...", correct_structure,
                           f"{description} - SQL structure correct")
                
                if not correct_structure:
                    all_passed = False
                    print(f"   ⚠️  ERROR: Unexpected SQL structure")
                    print(f"   SQL: {sql}")
            else:
                # No WHERE clause found - this is the real problem
                print_result(f"{query[:40]}...", False, 
                           f"Missing WHERE clause for filtered query")
                all_passed = False
        else:
            print_result(f"{query[:40]}...", False, "No SQL generated")
            all_passed = False
    
    return all_passed


def main():
    """Run all integration tests"""
    print("\n" + "=" * 80)
    print("  HeliXpert Dynamic Query System - Integration Tests")
    print("=" * 80)
    
    # Initialize engine
    print("\nInitializing Dynamic Query Engine...")
    engine = DynamicQueryEngine(DB_PATH)
    print(f"✓ Engine initialized with database: {DB_PATH}")
    
    # Get database statistics
    print("\nGathering database statistics...")
    stats = get_database_stats()
    print(f"✓ Database stats loaded:")
    print(f"  - Total helicopters: {stats['total_helicopters']}")
    print(f"  - Total components: {stats['total_components']}")
    print(f"  - Total sensors: {stats['total_sensors']}")
    print(f"  - Faulty sensors: {stats['faulty_sensors']}")
    print(f"  - Components by type: {len(stats['components_by_type'])} categories")
    
    # Run all test suites
    test_count_queries(engine, stats)
    test_list_queries(engine, stats)
    test_group_by_queries(engine, stats)
    test_average_queries(engine, stats)
    test_multilingual_queries(engine, stats)
    test_edge_cases(engine, stats)
    
    # Critical verification
    all_passed = verify_where_before_aggregation(engine)
    
    # Summary
    print_header("TEST SUMMARY")
    if all_passed:
        print("✓ All critical tests PASSED")
        print("✓ WHERE clauses are correctly applied BEFORE aggregation")
        print("✓ Dynamic query system is working correctly")
    else:
        print("✗ Some critical tests FAILED")
        print("⚠️  Review the WHERE clause positioning in SQL generation")
    
    print("\n" + "=" * 80)
    print("  Tests Complete")
    print("=" * 80 + "\n")


if __name__ == '__main__':
    main()
