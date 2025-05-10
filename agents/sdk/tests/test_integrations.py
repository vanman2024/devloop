#!/usr/bin/env python3
"""
Unit tests for the SDK Integrations module
"""

import os
import sys
import json
import unittest
from unittest.mock import patch, MagicMock, mock_open

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils.integrations import (
    dynamic_import,
    get_knowledge_base_adapter,
    get_langchain_integration,
    get_redis_client,
    get_mongodb_client,
    get_vector_db_client,
    load_integration_config,
    initialize_integrations,
    get_integrations
)

class TestDynamicImport(unittest.TestCase):
    """Tests for the dynamic_import function"""
    
    @patch("importlib.import_module")
    def test_standard_import_success(self, mock_import):
        """Test successful standard import"""
        mock_module = MagicMock()
        mock_import.return_value = mock_module
        
        result = dynamic_import("test_module")
        
        mock_import.assert_called_once_with("test_module")
        self.assertEqual(result, mock_module)
    
    @patch("importlib.import_module")
    def test_standard_import_failure(self, mock_import):
        """Test failed standard import"""
        mock_import.side_effect = ImportError("Module not found")
        
        # Additional mocks for file search paths
        with patch("os.path.isfile", return_value=False):
            result = dynamic_import("test_module")
        
        mock_import.assert_called_once_with("test_module")
        self.assertIsNone(result)
    
    @patch("importlib.import_module")
    @patch("os.path.exists")
    def test_import_with_paths(self, mock_exists, mock_import):
        """Test import with additional paths"""
        # First attempt fails, second succeeds
        mock_import.side_effect = [ImportError("Module not found"), MagicMock()]
        mock_exists.return_value = True
        
        result = dynamic_import("test_module", paths=["/fake/path"])
        
        self.assertEqual(mock_import.call_count, 2)
        self.assertIsNotNone(result)
    
    @patch("importlib.import_module")
    @patch("os.path.isfile")
    @patch("importlib.util.spec_from_file_location")
    @patch("importlib.util.module_from_spec")
    def test_file_search_import(self, mock_module_from_spec, mock_spec_from_file, 
                               mock_isfile, mock_import):
        """Test import by searching for module file"""
        # Standard import fails
        mock_import.side_effect = ImportError("Module not found")
        
        # File found
        mock_isfile.return_value = True
        
        # Mock spec and module
        mock_spec = MagicMock()
        mock_module = MagicMock()
        mock_spec_from_file.return_value = mock_spec
        mock_module_from_spec.return_value = mock_module
        
        result = dynamic_import("test_module")
        
        self.assertEqual(result, mock_module)
        mock_spec.loader.exec_module.assert_called_once_with(mock_module)

class TestGetIntegrations(unittest.TestCase):
    """Tests for integration retrieval functions"""
    
    @patch("utils.integrations.dynamic_import")
    def test_get_knowledge_base_adapter(self, mock_import):
        """Test getting knowledge base adapter"""
        # Mock the adapter module and factory
        mock_adapter_module = MagicMock()
        mock_factory = MagicMock()
        mock_adapter = MagicMock()
        
        mock_import.return_value = mock_adapter_module
        mock_adapter_module.KnowledgeBaseFactory = mock_factory
        mock_factory.create_adapter.return_value = mock_adapter
        
        result = get_knowledge_base_adapter({"adapter_type": "knowledge_graph"})
        
        self.assertEqual(result, mock_adapter)
        mock_factory.create_adapter.assert_called_once_with("knowledge_graph", {"adapter_type": "knowledge_graph"})
    
    @patch("utils.integrations.dynamic_import")
    def test_get_knowledge_base_adapter_failure(self, mock_import):
        """Test getting knowledge base adapter with failure"""
        mock_import.return_value = None
        
        result = get_knowledge_base_adapter({})
        
        self.assertIsNone(result)
    
    @patch("langchain.schema.Document", create=True)
    def test_get_langchain_integration(self, mock_document):
        """Test getting LangChain integration"""
        # Set up mocks to make it look like langchain is available
        with patch.dict("sys.modules", {
            "langchain": MagicMock(),
            "langchain.schema": MagicMock(Document=mock_document)
        }):
            result = get_langchain_integration({})
            
            self.assertIsNotNone(result)
            self.assertTrue(result["langchain_available"])
            self.assertEqual(result["document_class"], mock_document)
    
    def test_get_langchain_integration_failure(self):
        """Test getting LangChain integration with failure"""
        # Force ImportError
        with patch("utils.integrations.langchain", create=True, side_effect=ImportError):
            result = get_langchain_integration({})
            
            self.assertIsNone(result)
    
    @patch("redis.Redis", create=True)
    def test_get_redis_client(self, mock_redis):
        """Test getting Redis client"""
        # Set up mock for redis module
        mock_instance = MagicMock()
        mock_redis.return_value = mock_instance
        
        with patch.dict("sys.modules", {"redis": MagicMock(Redis=mock_redis)}):
            result = get_redis_client({"redis_host": "localhost"})
            
            self.assertEqual(result, mock_instance)
            mock_redis.assert_called_once_with(
                host="localhost",
                port=6379,
                db=0,
                password=None,
                decode_responses=True
            )
    
    def test_get_redis_client_failure(self):
        """Test getting Redis client with failure"""
        # Force ImportError
        with patch("utils.integrations.redis", create=True, side_effect=ImportError):
            result = get_redis_client({})
            
            self.assertIsNone(result)
    
    @patch("pymongo.MongoClient", create=True)
    def test_get_mongodb_client(self, mock_mongo):
        """Test getting MongoDB client"""
        # Set up mock for pymongo module
        mock_instance = MagicMock()
        mock_mongo.return_value = mock_instance
        
        with patch.dict("sys.modules", {"pymongo": MagicMock(MongoClient=mock_mongo)}):
            result = get_mongodb_client({"mongo_host": "localhost"})
            
            self.assertEqual(result, mock_instance)
            mock_mongo.assert_called_once_with(
                host="localhost",
                port=27017,
                username=None,
                password=None
            )
    
    def test_get_mongodb_client_failure(self):
        """Test getting MongoDB client with failure"""
        # Force ImportError
        with patch("utils.integrations.pymongo", create=True, side_effect=ImportError):
            result = get_mongodb_client({})
            
            self.assertIsNone(result)
    
    @patch("langchain.vectorstores.Chroma", create=True)
    @patch("langchain.embeddings.OpenAIEmbeddings", create=True)
    def test_get_vector_db_client(self, mock_embeddings, mock_chroma):
        """Test getting vector DB client"""
        # Set up mocks for modules
        mock_embedding_instance = MagicMock()
        mock_embeddings.return_value = mock_embedding_instance
        
        mock_db_instance = MagicMock()
        mock_chroma.return_value = mock_db_instance
        
        with patch.dict("sys.modules", {
            "langchain.vectorstores": MagicMock(Chroma=mock_chroma),
            "langchain.embeddings": MagicMock(OpenAIEmbeddings=mock_embeddings)
        }):
            result = get_vector_db_client({"openai_api_key": "fake-key"})
            
            self.assertEqual(result, mock_db_instance)
            mock_embeddings.assert_called_once_with(openai_api_key="fake-key")
            mock_chroma.assert_called_once()
    
    def test_get_vector_db_client_failure(self):
        """Test getting vector DB client with failure"""
        # Force ImportError
        with patch("utils.integrations.Chroma", create=True, side_effect=ImportError):
            result = get_vector_db_client({})
            
            self.assertIsNone(result)

class TestConfigIntegrations(unittest.TestCase):
    """Tests for configuration and integration initialization"""
    
    @patch("os.environ", {"SDK_API_KEY": "env-key", "OTHER_VAR": "value"})
    @patch("os.path.exists")
    @patch("builtins.open", new_callable=mock_open, read_data='{"key": "config-value"}')
    def test_load_integration_config(self, mock_file, mock_exists):
        """Test loading integration config"""
        # Config file exists
        mock_exists.return_value = True
        
        result = load_integration_config()
        
        self.assertEqual(result["key"], "config-value")
        self.assertEqual(result["api_key"], "env-key")  # From environment
    
    @patch("os.environ", {})
    @patch("os.path.exists")
    def test_load_integration_config_no_file(self, mock_exists):
        """Test loading integration config without file"""
        mock_exists.return_value = False
        
        result = load_integration_config()
        
        self.assertEqual(result, {})
    
    @patch("utils.integrations.get_knowledge_base_adapter")
    @patch("utils.integrations.get_langchain_integration")
    @patch("utils.integrations.get_redis_client")
    @patch("utils.integrations.get_mongodb_client")
    @patch("utils.integrations.get_vector_db_client")
    @patch("utils.integrations.load_integration_config")
    def test_initialize_integrations(self, mock_config, mock_vector, mock_mongo, 
                                   mock_redis, mock_langchain, mock_kb):
        """Test initializing all integrations"""
        # Set up mock returns
        mock_config.return_value = {
            "knowledge_base": {"adapter_type": "knowledge_graph"},
            "langchain": {"embedding_model": "test"},
            "redis": {"redis_host": "localhost"},
            "mongodb": {"mongo_host": "localhost"},
            "vector_db": {"persist_directory": "/tmp"}
        }
        
        mock_kb.return_value = MagicMock(name="kb_adapter")
        mock_langchain.return_value = MagicMock(name="langchain")
        mock_redis.return_value = MagicMock(name="redis")
        mock_mongo.return_value = MagicMock(name="mongo")
        mock_vector.return_value = MagicMock(name="vector_db")
        
        result = initialize_integrations()
        
        self.assertIn("knowledge_base", result)
        self.assertIn("langchain", result)
        self.assertIn("redis", result)
        self.assertIn("mongodb", result)
        self.assertIn("vector_db", result)
        
        # Verify each integration was initialized with correct config
        mock_kb.assert_called_once_with({"adapter_type": "knowledge_graph"})
        mock_langchain.assert_called_once_with({"embedding_model": "test"})
        mock_redis.assert_called_once_with({"redis_host": "localhost"})
        mock_mongo.assert_called_once_with({"mongo_host": "localhost"})
        mock_vector.assert_called_once_with({"persist_directory": "/tmp"})
    
    @patch("utils.integrations.initialize_integrations")
    def test_get_integrations(self, mock_init):
        """Test the get_integrations global function"""
        mock_init.return_value = {"test": "integration"}
        
        # Reset the module's global state
        import utils.integrations
        utils.integrations.integrations = None
        
        result = get_integrations()
        
        self.assertEqual(result, {"test": "integration"})
        mock_init.assert_called_once()
        
        # Second call should use cached value
        result2 = get_integrations()
        self.assertEqual(result2, {"test": "integration"})
        self.assertEqual(mock_init.call_count, 1)  # Not called again

if __name__ == '__main__':
    unittest.main()