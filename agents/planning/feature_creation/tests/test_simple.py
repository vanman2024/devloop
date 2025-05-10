#!/usr/bin/env python3
"""
Simple unit test for Feature Creation Agent
"""

import unittest
import sys
import os
import json
from unittest.mock import patch, MagicMock

# Add parent directory to path to import agent modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import core
from core import FeatureCreationAgent, FeatureAnalyzer, PlacementSuggester, IDGenerator


class TestFeatureAnalyzer(unittest.TestCase):
    """Test the FeatureAnalyzer component"""
    
    def setUp(self):
        self.analyzer = FeatureAnalyzer()
    
    def test_analyze_ui_feature(self):
        """Test analyzing a UI feature"""
        result = self.analyzer.analyze(
            feature_name="Dashboard Widget", 
            feature_description="A UI component for displaying metrics in the dashboard"
        )
        
        self.assertEqual(result['domain'], 'ui')
        self.assertIn('dashboard', result['concepts'])
        self.assertIn('widget', result['concepts'])
    
    def test_analyze_testing_feature(self):
        """Test analyzing a testing feature"""
        result = self.analyzer.analyze(
            feature_name="Integration Test Framework", 
            feature_description="Automated testing framework for validating component integrations"
        )
        
        self.assertEqual(result['domain'], 'testing')


class TestIDGenerator(unittest.TestCase):
    """Test the IDGenerator component"""
    
    def setUp(self):
        self.generator = IDGenerator()
    
    def test_generate_id_format(self):
        """Test that generated IDs follow the correct format"""
        feature_id = self.generator.generate(
            feature_name="Test Feature Name",
            milestone="milestone-ui-dashboard"
        )
        
        # Should match format: feature-XXXX-name-portion
        self.assertTrue(feature_id.startswith('feature-'))
        parts = feature_id.split('-')
        self.assertGreaterEqual(len(parts), 3)
        self.assertTrue(parts[1].isdigit())
        self.assertEqual(len(parts[1]), 4)  # 4-digit number
        
        # Name portion should be included
        self.assertIn('test', feature_id)
        self.assertIn('feature', feature_id)
        self.assertIn('name', feature_id)


if __name__ == '__main__':
    unittest.main()