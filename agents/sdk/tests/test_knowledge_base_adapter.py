#!/usr/bin/env python3
"""
Unit tests for the Knowledge Base Adapter components
"""

import os
import sys
import json
import unittest
from unittest.mock import patch, MagicMock, mock_open

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from adapters.knowledge_base_adapter import (
    KnowledgeBaseAdapter,
    CachedKnowledgeBaseAdapter,
    KnowledgeGraphAdapter,
    VectorDatabaseAdapter,
    MongoDBAdapter,
    KnowledgeBaseFactory
)

class MockRedis:
    """Mock Redis client for testing"""
    
    def __init__(self):
        self.data = {}
    
    def get(self, key):
        return self.data.get(key)
    
    def setex(self, key, ttl, value):
        self.data[key] = value
        return True
    
    def ping(self):
        return True

class MockNode:
    """Mock knowledge graph node for testing"""
    
    def __init__(self, node_id, node_type, properties=None):
        self.id = node_id
        self.type = node_type
        self.properties = properties or {}

class MockKnowledgeGraph:
    """Mock knowledge graph for testing"""
    
    def __init__(self):
        self.nodes = {}
        self.edges = []
        self.memory = {"knowledge_graph": {"nodes": {}}}
    
    def add_node(self, node_id, node_type, properties, metadata=None):
        node = {
            "id": node_id,
            "type": node_type,
            "properties": properties,
            "metadata": metadata or {}
        }
        self.nodes[node_id] = node
        self.memory["knowledge_graph"]["nodes"][node_id] = node
        return node
    
    def get_node(self, node_id):
        return self.nodes.get(node_id)
    
    def get_nodes_by_type(self, node_type):
        return [node for node in self.nodes.values() if node["type"] == node_type]
    
    def get_outgoing_edges(self, node_id):
        return [edge for edge in self.edges if edge["source"] == node_id]
    
    def remove_node(self, node_id, remove_edges=True):
        if node_id in self.nodes:
            del self.nodes[node_id]
            del self.memory["knowledge_graph"]["nodes"][node_id]
            if remove_edges:
                self.edges = [e for e in self.edges if e["source"] != node_id and e["target"] != node_id]
            return True
        return False
    
    def save(self, path):
        return True

class MockMongoCollection:
    """Mock MongoDB collection for testing"""
    
    def __init__(self):
        self.documents = []
    
    def find(self, filter=None, projection=None, sort=None, limit=None, skip=None):
        results = []
        for doc in self.documents:
            if not filter:
                results.append(doc)
                continue
            
            # Simple filter matching
            match = True
            for key, value in filter.items():
                if key not in doc or doc[key] != value:
                    match = False
                    break
            
            if match:
                results.append(doc)
        
        if limit and len(results) > limit:
            results = results[:limit]
        
        return results
    
    def find_one(self, filter):
        for doc in self.documents:
            match = True
            for key, value in filter.items():
                if key not in doc or doc[key] != value:
                    match = False
                    break
            if match:
                return doc
        return None
    
    def insert_one(self, document):
        self.documents.append(document)
        return MagicMock(inserted_id=document.get("_id", "mock_id"))
    
    def update_one(self, filter, update, upsert=False):
        for i, doc in enumerate(self.documents):
            match = True
            for key, value in filter.items():
                if key not in doc or doc[key] != value:
                    match = False
                    break
            
            if match:
                # Apply update
                if "$set" in update:
                    for key, value in update["$set"].items():
                        self.documents[i][key] = value
                return MagicMock(modified_count=1, upserted_id=None)
        
        if upsert:
            # Create new document
            new_doc = {key: value for key, value in filter.items()}
            if "$set" in update:
                for key, value in update["$set"].items():
                    new_doc[key] = value
            self.documents.append(new_doc)
            return MagicMock(modified_count=0, upserted_id="mock_id")
        
        return MagicMock(modified_count=0, upserted_id=None)
    
    def delete_one(self, filter):
        for i, doc in enumerate(self.documents):
            match = True
            for key, value in filter.items():
                if key not in doc or doc[key] != value:
                    match = False
                    break
            
            if match:
                del self.documents[i]
                return MagicMock(deleted_count=1)
        
        return MagicMock(deleted_count=0)

class TestKnowledgeBaseAdapter(unittest.TestCase):
    """Tests for the base KnowledgeBaseAdapter class"""
    
    def test_base_adapter_interface(self):
        """Test the base adapter interface"""
        adapter = KnowledgeBaseAdapter({})
        
        with self.assertRaises(NotImplementedError):
            adapter.query("test")
        
        with self.assertRaises(NotImplementedError):
            adapter.store({"data": "test"})
        
        with self.assertRaises(NotImplementedError):
            adapter.update("id", {"data": "updated"})
        
        with self.assertRaises(NotImplementedError):
            adapter.delete("id")

class TestCachedKnowledgeBaseAdapter(unittest.TestCase):
    """Tests for the CachedKnowledgeBaseAdapter class"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.mock_adapter = MagicMock(spec=KnowledgeBaseAdapter)
        self.mock_adapter.query.return_value = [{"id": "test", "data": "result"}]
        self.mock_adapter.store.return_value = "test-id"
        self.mock_adapter.update.return_value = True
        self.mock_adapter.delete.return_value = True
        
        self.mock_redis = MockRedis()
        
        # Patch Redis imports
        self.redis_patcher = patch("adapters.knowledge_base_adapter.REDIS_AVAILABLE", True)
        self.redis_patcher.start()
        
        # Create adapter with mocks
        self.adapter = CachedKnowledgeBaseAdapter(
            {"cache_enabled": True},
            self.mock_adapter
        )
        self.adapter.redis = self.mock_redis
    
    def tearDown(self):
        """Clean up after tests"""
        self.redis_patcher.stop()
    
    def test_query_with_cache_miss(self):
        """Test query with cache miss"""
        result = self.adapter.query("test query")
        
        self.mock_adapter.query.assert_called_once_with("test query")
        self.assertEqual(result, [{"id": "test", "data": "result"}])
        
        # Check that result was cached
        cache_key = self.adapter._get_cache_key("query", "test query")
        self.assertIsNotNone(self.mock_redis.get(cache_key))
    
    def test_query_with_cache_hit(self):
        """Test query with cache hit"""
        # Pre-populate cache
        cache_key = self.adapter._get_cache_key("query", "test query")
        self.mock_redis.setex(cache_key, 3600, json.dumps([{"id": "cached", "data": "cached result"}]))
        
        result = self.adapter.query("test query")
        
        # Should not call the underlying adapter
        self.mock_adapter.query.assert_not_called()
        self.assertEqual(result, [{"id": "cached", "data": "cached result"}])
    
    def test_store_with_caching(self):
        """Test store with caching"""
        data = {"data": "test"}
        result = self.adapter.store(data)
        
        self.mock_adapter.store.assert_called_once_with(data)
        self.assertEqual(result, "test-id")
    
    def test_update_with_caching(self):
        """Test update with caching"""
        data = {"data": "updated"}
        result = self.adapter.update("test-id", data)
        
        self.mock_adapter.update.assert_called_once_with("test-id", data)
        self.assertTrue(result)
    
    def test_delete_with_caching(self):
        """Test delete with caching"""
        result = self.adapter.delete("test-id")
        
        self.mock_adapter.delete.assert_called_once_with("test-id")
        self.assertTrue(result)

class TestKnowledgeGraphAdapter(unittest.TestCase):
    """Tests for the KnowledgeGraphAdapter class"""
    
    def setUp(self):
        """Set up test fixtures"""
        # Create mock knowledge graph
        self.mock_kg = MockKnowledgeGraph()
        
        # Add test nodes
        self.mock_kg.add_node(
            "feature-1", 
            "feature", 
            {"name": "Authentication", "description": "User authentication system"}
        )
        self.mock_kg.add_node(
            "feature-2",
            "feature",
            {"name": "Dashboard", "description": "User dashboard with analytics"}
        )
        self.mock_kg.add_node(
            "milestone-1",
            "milestone",
            {"name": "MVP Release", "description": "Minimum viable product release"}
        )
        
        # Patch knowledge graph module
        self.kg_module_patcher = patch("adapters.knowledge_base_adapter.dynamic_import")
        self.mock_import = self.kg_module_patcher.start()
        self.mock_import.return_value = MagicMock()
        self.mock_import.return_value.load_knowledge_graph.return_value = self.mock_kg
        
        # Create mock file
        self.mock_file_patcher = patch("os.path.exists")
        self.mock_exists = self.mock_file_patcher.start()
        self.mock_exists.return_value = True
        
        # Create adapter
        self.adapter = KnowledgeGraphAdapter({"kg_path": "/fake/path/kg.json"})
        self.adapter.kg = self.mock_kg
    
    def tearDown(self):
        """Clean up after tests"""
        self.kg_module_patcher.stop()
        self.mock_file_patcher.stop()
    
    def test_query_by_node_type(self):
        """Test querying by node type"""
        results = self.adapter.query("Authentication", node_types=["feature"])
        
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], "feature-1")
        self.assertEqual(results[0]["type"], "feature")
        self.assertEqual(results[0]["properties"]["name"], "Authentication")
    
    def test_query_without_node_type(self):
        """Test querying without node type"""
        results = self.adapter.query("dashboard")
        
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], "feature-2")
        self.assertEqual(results[0]["properties"]["name"], "Dashboard")
    
    def test_store_node(self):
        """Test storing a node"""
        data = {
            "type": "module",
            "properties": {
                "name": "Logger",
                "description": "Logging module"
            }
        }
        
        node_id = self.adapter.store(data)
        
        self.assertIsNotNone(node_id)
        self.assertIn(node_id, self.mock_kg.nodes)
        self.assertEqual(self.mock_kg.nodes[node_id]["properties"]["name"], "Logger")
    
    def test_update_node(self):
        """Test updating a node"""
        update_data = {
            "properties": {
                "status": "completed"
            }
        }
        
        result = self.adapter.update("feature-1", update_data)
        
        self.assertTrue(result)
        self.assertEqual(self.mock_kg.nodes["feature-1"]["properties"]["status"], "completed")
    
    def test_delete_node(self):
        """Test deleting a node"""
        result = self.adapter.delete("feature-1")
        
        self.assertTrue(result)
        self.assertNotIn("feature-1", self.mock_kg.nodes)

class TestMongoDBAdapter(unittest.TestCase):
    """Tests for the MongoDBAdapter class"""
    
    def setUp(self):
        """Set up test fixtures"""
        # Patch MongoDB imports and client
        self.mongodb_patcher = patch("adapters.knowledge_base_adapter.MONGODB_AVAILABLE", True)
        self.mongodb_patcher.start()
        
        self.mongo_client_patcher = patch("adapters.knowledge_base_adapter.pymongo.MongoClient")
        self.mock_client = self.mongodb_patcher.start()
        
        # Set up mock collection
        self.mock_collection = MockMongoCollection()
        self.mock_collection.documents = [
            {"_id": "obj1", "id": "test-1", "type": "document", "content": "test document", "properties": {"name": "Test"}},
            {"_id": "obj2", "id": "test-2", "type": "feature", "content": "feature document", "properties": {"name": "Feature"}}
        ]
        
        # Create adapter with mock collection
        self.adapter = MongoDBAdapter({"mongo_host": "localhost"})
        self.adapter.collection = self.mock_collection
    
    def tearDown(self):
        """Clean up after tests"""
        self.mongodb_patcher.stop()
        self.mongo_client_patcher.stop()
    
    def test_query_with_text(self):
        """Test querying with text"""
        results = self.adapter.query("feature")
        
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], "test-2")
        self.assertEqual(results[0]["type"], "feature")
    
    def test_query_with_filter(self):
        """Test querying with filter"""
        results = self.adapter.query("", filter={"type": "document"})
        
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], "test-1")
    
    def test_store_document(self):
        """Test storing a document"""
        data = {
            "type": "task",
            "content": "Task description",
            "properties": {"name": "New Task"}
        }
        
        doc_id = self.adapter.store(data)
        
        self.assertIsNotNone(doc_id)
        self.assertEqual(len(self.mock_collection.documents), 3)
    
    def test_update_document(self):
        """Test updating a document"""
        update_data = {
            "properties": {"status": "completed"}
        }
        
        result = self.adapter.update("test-1", update_data)
        
        self.assertTrue(result)
        updated_doc = self.mock_collection.find_one({"id": "test-1"})
        self.assertEqual(updated_doc["properties"]["status"], "completed")
    
    def test_delete_document(self):
        """Test deleting a document"""
        result = self.adapter.delete("test-1")
        
        self.assertTrue(result)
        self.assertEqual(len(self.mock_collection.documents), 1)

class TestKnowledgeBaseFactory(unittest.TestCase):
    """Tests for the KnowledgeBaseFactory class"""
    
    @patch("adapters.knowledge_base_adapter.KnowledgeGraphAdapter")
    def test_create_knowledge_graph_adapter(self, mock_kg_adapter):
        """Test creating a knowledge graph adapter"""
        mock_kg_adapter.return_value = MagicMock(spec=KnowledgeGraphAdapter)
        
        config = {"kg_path": "/fake/path/kg.json", "cache_enabled": False}
        adapter = KnowledgeBaseFactory.create_adapter("knowledge_graph", config)
        
        mock_kg_adapter.assert_called_once_with(config)
        self.assertIsInstance(adapter, MagicMock)
    
    @patch("adapters.knowledge_base_adapter.VectorDatabaseAdapter")
    def test_create_vector_db_adapter(self, mock_vector_adapter):
        """Test creating a vector database adapter"""
        mock_vector_adapter.return_value = MagicMock(spec=VectorDatabaseAdapter)
        
        config = {"persist_directory": "/fake/path/vector_db", "cache_enabled": False}
        adapter = KnowledgeBaseFactory.create_adapter("vector_db", config)
        
        mock_vector_adapter.assert_called_once_with(config)
        self.assertIsInstance(adapter, MagicMock)
    
    @patch("adapters.knowledge_base_adapter.MongoDBAdapter")
    def test_create_mongodb_adapter(self, mock_mongo_adapter):
        """Test creating a MongoDB adapter"""
        mock_mongo_adapter.return_value = MagicMock(spec=MongoDBAdapter)
        
        config = {"mongo_host": "localhost", "cache_enabled": False}
        adapter = KnowledgeBaseFactory.create_adapter("mongodb", config)
        
        mock_mongo_adapter.assert_called_once_with(config)
        self.assertIsInstance(adapter, MagicMock)
    
    def test_create_unknown_adapter(self):
        """Test creating an unknown adapter type"""
        with self.assertRaises(ValueError):
            KnowledgeBaseFactory.create_adapter("unknown", {})
    
    @patch("adapters.knowledge_base_adapter.KnowledgeGraphAdapter")
    @patch("adapters.knowledge_base_adapter.CachedKnowledgeBaseAdapter")
    @patch("adapters.knowledge_base_adapter.REDIS_AVAILABLE", True)
    def test_create_cached_adapter(self, mock_cached_adapter, mock_kg_adapter):
        """Test creating a cached adapter"""
        mock_kg_adapter.return_value = MagicMock(spec=KnowledgeGraphAdapter)
        mock_cached_adapter.return_value = MagicMock(spec=CachedKnowledgeBaseAdapter)
        
        config = {"kg_path": "/fake/path/kg.json", "cache_enabled": True}
        adapter = KnowledgeBaseFactory.create_adapter("knowledge_graph", config)
        
        mock_kg_adapter.assert_called_once_with(config)
        mock_cached_adapter.assert_called_once()
        self.assertIsInstance(adapter, MagicMock)

if __name__ == '__main__':
    unittest.main()