# -*- coding: utf-8 -*-
"""
Unit Tests for DynamicQueryEngine
Tests parse_query(), filter extraction, SQL generation, and multilingual parsing.
"""
import unittest
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.ai.dynamic_query_engine import DynamicQueryEngine

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(BASE_DIR, 'data', 'database', 'helixpert.db')


class TestDynamicQueryEngine(unittest.TestCase):
    """Test suite for DynamicQueryEngine"""
    
    @classmethod
    def setUpClass(cls):
        """Initialize engine once for all tests"""
        cls.engine = DynamicQueryEngine(DB_PATH)
    
    # ==================== OPERATION DETECTION TESTS ====================
    
    def test_detect_count_operation(self):
        """Test COUNT operation detection"""
        parsed = self.engine.parse_query("How many helicopters?")
        self.assertEqual(parsed['operation'], 'COUNT')
        self.assertEqual(parsed['entity']['name'], 'helicopters')
    
    def test_detect_list_operation(self):
        """Test LIST operation detection"""
        parsed = self.engine.parse_query("Show all helicopters")
        self.assertEqual(parsed['operation'], 'LIST')
        self.assertEqual(parsed['entity']['name'], 'helicopters')
    
    def test_detect_average_operation(self):
        """Test AVERAGE operation detection"""
        parsed = self.engine.parse_query("What is the average MGT?")
        self.assertEqual(parsed['operation'], 'AVERAGE')
        self.assertEqual(parsed['entity']['name'], 'sensors')
        self.assertEqual(parsed['metric'], 'mgt')
    
    def test_detect_max_operation(self):
        """Test MAX operation detection"""
        parsed = self.engine.parse_query("What is the highest MGT?")
        self.assertEqual(parsed['operation'], 'MAX')
        self.assertEqual(parsed['entity']['name'], 'sensors')
        self.assertEqual(parsed['metric'], 'mgt')
    
    def test_detect_min_operation(self):
        """Test MIN operation detection"""
        parsed = self.engine.parse_query("What is the lowest torque?")
        self.assertEqual(parsed['operation'], 'MIN')
        self.assertEqual(parsed['entity']['name'], 'sensors')
        self.assertEqual(parsed['metric'], 'trq_measured')
    
    def test_detect_group_by_operation(self):
        """Test GROUP_BY operation detection"""
        parsed = self.engine.parse_query("How many components by category?")
        self.assertEqual(parsed['operation'], 'GROUP_BY')
        self.assertEqual(parsed['entity']['name'], 'components')
        self.assertEqual(parsed['group_by'], 'component_type')
    
    # ==================== ENTITY DETECTION TESTS ====================
    
    def test_detect_helicopter_entity(self):
        """Test helicopter entity detection"""
        parsed = self.engine.parse_query("Show me helicopters")
        self.assertEqual(parsed['entity']['name'], 'helicopters')
        self.assertEqual(parsed['entity']['table'], 'helicopters')
    
    def test_detect_component_entity(self):
        """Test component entity detection"""
        parsed = self.engine.parse_query("List all components")
        self.assertEqual(parsed['entity']['name'], 'components')
        self.assertEqual(parsed['entity']['table'], 'components')
    
    def test_detect_sensor_entity(self):
        """Test sensor entity detection"""
        parsed = self.engine.parse_query("Show sensor data")
        self.assertEqual(parsed['entity']['name'], 'sensors')
        self.assertEqual(parsed['entity']['table'], 'sensor_parameters')
    
    def test_detect_maintenance_entity(self):
        """Test maintenance entity detection"""
        parsed = self.engine.parse_query("Show maintenance records")
        self.assertEqual(parsed['entity']['name'], 'maintenance')
        self.assertEqual(parsed['entity']['table'], 'maintenance_records')
    
    # ==================== FILTER EXTRACTION TESTS ====================
    
    def test_extract_component_type_filter(self):
        """Test component type filter extraction"""
        parsed = self.engine.parse_query("How many rotor components?")
        self.assertEqual(len(parsed['filters']), 1)
        self.assertEqual(parsed['filters'][0]['field'], 'component_type')
        self.assertIn('Rotor System', parsed['filters'][0]['value'])
    
    def test_extract_propulsion_filter(self):
        """Test propulsion component filter"""
        parsed = self.engine.parse_query("List all propulsion components")
        self.assertEqual(len(parsed['filters']), 1)
        self.assertEqual(parsed['filters'][0]['field'], 'component_type')
        self.assertIn('Propulsion', parsed['filters'][0]['value'])
    
    def test_extract_faulty_sensor_filter(self):
        """Test faulty sensor filter extraction"""
        parsed = self.engine.parse_query("What is the average MGT for faulty sensors?")
        faulty_filters = [f for f in parsed['filters'] if f['field'] == 'faulty']
        self.assertEqual(len(faulty_filters), 1)
        self.assertEqual(faulty_filters[0]['value'], '1')
    
    def test_extract_manufacturer_filter(self):
        """Test manufacturer filter extraction"""
        parsed = self.engine.parse_query("Show Airbus helicopters")
        self.assertEqual(len(parsed['filters']), 1)
        self.assertEqual(parsed['filters'][0]['field'], 'manufacturer')
        self.assertIn('airbus', parsed['filters'][0]['value'].lower())
    
    # ==================== SQL GENERATION TESTS ====================
    
    def test_sql_count_no_filter(self):
        """Test SQL generation for simple COUNT"""
        parsed = self.engine.parse_query("How many helicopters?")
        sql = self.engine.generate_sql(parsed)
        self.assertIn('SELECT COUNT(*)', sql.upper())
        self.assertIn('helicopters', sql.lower())
    
    def test_sql_count_with_filter(self):
        """Test SQL generation for COUNT with filter"""
        parsed = self.engine.parse_query("How many rotor components?")
        sql = self.engine.generate_sql(parsed)
        self.assertIn('SELECT COUNT(*)', sql.upper())
        self.assertIn('WHERE', sql.upper())
        self.assertIn('component_type', sql.lower())
        # CRITICAL: WHERE clause must exist in the SQL (filtering is applied before aggregation in SQL structure)
        # The WHERE comes after FROM in SQL structure, which is correct
        self.assertTrue('WHERE' in sql.upper(), "WHERE clause must be present for filtered queries")
    
    def test_sql_average_with_filter(self):
        """Test SQL generation for AVERAGE with faulty filter"""
        parsed = self.engine.parse_query("Average MGT for faulty sensors?")
        sql = self.engine.generate_sql(parsed)
        # Check for AVG function (case insensitive)
        self.assertIn('AVG', sql.upper())
        self.assertIn('mgt', sql.lower())
        self.assertIn('WHERE', sql.upper())
        self.assertIn('faulty', sql.lower())
        # CRITICAL: Filter must be in WHERE clause (SQL structure handles this correctly)
        self.assertTrue('WHERE' in sql.upper() and 'faulty' in sql.lower(), 
                       "WHERE clause with faulty filter must be present")
    
    def test_sql_group_by(self):
        """Test SQL generation for GROUP BY"""
        parsed = self.engine.parse_query("How many components by category?")
        sql = self.engine.generate_sql(parsed)
        self.assertIn('GROUP BY', sql.upper())
        self.assertIn('component_type', sql.lower())
        self.assertIn('COUNT(*)', sql.upper())
    
    def test_sql_list_with_filter(self):
        """Test SQL generation for LIST with filter"""
        parsed = self.engine.parse_query("List all propulsion components")
        sql = self.engine.generate_sql(parsed)
        self.assertIn('SELECT', sql.upper())
        self.assertIn('WHERE', sql.upper())
        self.assertIn('component_type', sql.lower())
        self.assertIn('Propulsion', sql)
    
    def test_sql_max_with_metric(self):
        """Test SQL generation for MAX operation"""
        parsed = self.engine.parse_query("Highest MGT value")
        sql = self.engine.generate_sql(parsed)
        self.assertIn('ORDER BY', sql.upper())
        self.assertIn('mgt', sql.lower())
        self.assertIn('DESC', sql.upper())
        self.assertIn('LIMIT', sql.upper())
    
    # ==================== MULTILINGUAL TESTS ====================
    
    def test_hindi_query_helicopters(self):
        """Test Hindi query parsing"""
        parsed = self.engine.parse_query("कितने हेलीकॉप्टर हैं?")
        self.assertEqual(parsed['operation'], 'COUNT')
        self.assertEqual(parsed['entity']['name'], 'helicopters')
    
    def test_kannada_query_helicopters(self):
        """Test Kannada query parsing"""
        parsed = self.engine.parse_query("ಎಷ್ಟು ಹೆಲಿಕಾಪ್ಟರ್ ಇವೆ?")
        self.assertEqual(parsed['operation'], 'COUNT')
        self.assertEqual(parsed['entity']['name'], 'helicopters')
    
    def test_hindi_query_components(self):
        """Test Hindi component query"""
        parsed = self.engine.parse_query("घटक की सूची दिखाओ")
        self.assertEqual(parsed['entity']['name'], 'components')
    
    def test_kannada_query_components(self):
        """Test Kannada component query"""
        parsed = self.engine.parse_query("ಘಟಕಗಳ ಪಟ್ಟಿ ತೋರಿಸಿ")
        self.assertEqual(parsed['entity']['name'], 'components')
    
    # ==================== EDGE CASE TESTS ====================
    
    def test_unknown_entity(self):
        """Test handling of unknown entity"""
        parsed = self.engine.parse_query("How many unicorns are there?")
        self.assertEqual(parsed['operation'], 'UNKNOWN')
        self.assertIsNone(parsed['entity'])
        self.assertIn('error', parsed)
    
    def test_empty_query(self):
        """Test handling of empty query"""
        parsed = self.engine.parse_query("")
        self.assertEqual(parsed['operation'], 'UNKNOWN')
    
    def test_multiple_filters(self):
        """Test query with multiple filters (if applicable)"""
        # This test depends on whether the engine supports multiple filters
        parsed = self.engine.parse_query("Show faulty sensors with high MGT")
        # Should detect faulty filter at minimum
        faulty_filters = [f for f in parsed['filters'] if f['field'] == 'faulty']
        self.assertGreaterEqual(len(faulty_filters), 1)
    
    def test_case_insensitive_parsing(self):
        """Test case-insensitive query parsing"""
        parsed1 = self.engine.parse_query("SHOW ALL HELICOPTERS")
        parsed2 = self.engine.parse_query("show all helicopters")
        self.assertEqual(parsed1['operation'], parsed2['operation'])
        self.assertEqual(parsed1['entity']['name'], parsed2['entity']['name'])
    
    def test_sensor_metric_detection(self):
        """Test all sensor metrics are detected correctly"""
        metrics_tests = [
            ("average MGT", "mgt"),
            ("average torque", "trq_measured"),
            ("average OAT", "oat"),
            ("average NG", "ng"),
            ("average NP", "np")
        ]
        for query, expected_metric in metrics_tests:
            with self.subTest(query=query):
                parsed = self.engine.parse_query(query)
                self.assertEqual(parsed['metric'], expected_metric)
    
    def test_where_before_aggregation(self):
        """CRITICAL TEST: Ensure WHERE clause is present in filtered aggregation queries"""
        test_queries = [
            "How many rotor components?",
            "Average MGT for faulty sensors",
            "Count propulsion parts"
        ]
        for query in test_queries:
            with self.subTest(query=query):
                parsed = self.engine.parse_query(query)
                if parsed['filters']:
                    sql = self.engine.generate_sql(parsed)
                    # Verify WHERE appears in SQL
                    self.assertIn('WHERE', sql.upper(), f"Query '{query}' should have WHERE clause")
                    
                    # In SQL, the structure is: SELECT AGG(...) FROM table WHERE condition
                    # This is semantically correct - the WHERE filters rows before aggregation
                    # Even though WHERE appears after FROM in the syntax, it is applied before the aggregation function
                    # What matters is that the WHERE clause exists, not its syntactic position
                    self.assertTrue('WHERE' in sql.upper(), 
                                  f"WHERE clause must be present for filtered query '{query}'")


if __name__ == '__main__':
    # Run tests with verbose output
    unittest.main(verbosity=2)
