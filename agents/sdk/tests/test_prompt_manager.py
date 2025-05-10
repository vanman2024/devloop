#!/usr/bin/env python3
"""
Unit tests for the AdaptivePromptManager and related components
"""

import os
import sys
import json
import unittest
from unittest.mock import patch, MagicMock, mock_open

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils.prompt_manager import (
    AdaptivePromptManager, 
    PromptTemplate, 
    TemplateVariable, 
    ContextItem,
    TemplateManager,
    ContextManager,
    OpenAIAdapter,
    ClaudeAdapter
)

class TestPromptTemplate(unittest.TestCase):
    """Tests for the PromptTemplate class"""
    
    def test_prompt_template_creation(self):
        """Test creating a prompt template"""
        template = PromptTemplate(
            name="test_template",
            template="Hello, {name}!",
            description="A test template",
            variables=[
                TemplateVariable("name", required=True)
            ],
            tags=["test", "greeting"]
        )
        
        self.assertEqual(template.name, "test_template")
        self.assertEqual(template.template, "Hello, {name}!")
        self.assertEqual(template.description, "A test template")
        self.assertEqual(len(template.variables), 1)
        self.assertEqual(template.variables[0].name, "name")
        self.assertEqual(template.tags, ["test", "greeting"])
    
    def test_template_to_dict_conversion(self):
        """Test converting template to dictionary"""
        template = PromptTemplate(
            name="test_template",
            template="Hello, {name}!",
            variables=[
                TemplateVariable("name", required=True, default_value="World")
            ]
        )
        
        template_dict = template.to_dict()
        
        self.assertEqual(template_dict["name"], "test_template")
        self.assertEqual(template_dict["template"], "Hello, {name}!")
        self.assertEqual(len(template_dict["variables"]), 1)
        self.assertEqual(template_dict["variables"][0]["name"], "name")
        self.assertEqual(template_dict["variables"][0]["default_value"], "World")
    
    def test_template_from_dict_conversion(self):
        """Test creating template from dictionary"""
        template_dict = {
            "name": "test_template",
            "template": "Hello, {name}!",
            "description": "A test template",
            "variables": [
                {
                    "name": "name",
                    "required": True,
                    "default_value": "World",
                    "description": "Name to greet"
                }
            ],
            "tags": ["test"]
        }
        
        template = PromptTemplate.from_dict(template_dict)
        
        self.assertEqual(template.name, "test_template")
        self.assertEqual(template.template, "Hello, {name}!")
        self.assertEqual(template.description, "A test template")
        self.assertEqual(len(template.variables), 1)
        self.assertEqual(template.variables[0].name, "name")
        self.assertEqual(template.variables[0].default_value, "World")
        self.assertEqual(template.tags, ["test"])

class TestContextItem(unittest.TestCase):
    """Tests for the ContextItem class"""
    
    def test_context_item_creation(self):
        """Test creating a context item"""
        item = ContextItem(
            content="This is a test context",
            role="user",
            importance=0.8,
            metadata={"source": "test"}
        )
        
        self.assertEqual(item.content, "This is a test context")
        self.assertEqual(item.role, "user")
        self.assertEqual(item.importance, 0.8)
        self.assertEqual(item.metadata, {"source": "test"})
        self.assertTrue(item.token_count > 0)
        self.assertTrue(hasattr(item, "id"))
    
    def test_context_item_to_dict_conversion(self):
        """Test converting context item to dictionary"""
        item = ContextItem(
            content="This is a test context",
            role="user"
        )
        
        item_dict = item.to_dict()
        
        self.assertEqual(item_dict["content"], "This is a test context")
        self.assertEqual(item_dict["role"], "user")
        self.assertEqual(item_dict["importance"], 1.0)  # Default value
        self.assertEqual(item_dict["metadata"], {})  # Default value
        self.assertTrue("token_count" in item_dict)
        self.assertTrue("id" in item_dict)
    
    def test_context_item_from_dict_conversion(self):
        """Test creating context item from dictionary"""
        item_dict = {
            "content": "This is a test context",
            "role": "assistant",
            "importance": 0.5,
            "metadata": {"source": "test"},
            "token_count": 10,
            "id": "test-id"
        }
        
        item = ContextItem.from_dict(item_dict)
        
        self.assertEqual(item.content, "This is a test context")
        self.assertEqual(item.role, "assistant")
        self.assertEqual(item.importance, 0.5)
        self.assertEqual(item.metadata, {"source": "test"})
        self.assertEqual(item.token_count, 10)
        self.assertEqual(item.id, "test-id")

class TestTemplateManager(unittest.TestCase):
    """Tests for the TemplateManager class"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.template_manager = TemplateManager()
        self.test_template = PromptTemplate(
            name="test_template",
            template="Hello, {name}!",
            variables=[
                TemplateVariable("name", required=True)
            ]
        )
    
    def test_add_get_template(self):
        """Test adding and retrieving templates"""
        self.template_manager.add_template(self.test_template)
        
        retrieved_template = self.template_manager.get_template("test_template")
        
        self.assertIsNotNone(retrieved_template)
        self.assertEqual(retrieved_template.name, "test_template")
        self.assertEqual(retrieved_template.template, "Hello, {name}!")
    
    def test_get_nonexistent_template(self):
        """Test retrieving a template that doesn't exist"""
        template = self.template_manager.get_template("nonexistent")
        
        self.assertIsNone(template)
    
    def test_render_template_basic(self):
        """Test rendering a template with variables"""
        self.template_manager.add_template(self.test_template)
        
        rendered = self.template_manager.render_template("test_template", {"name": "World"})
        
        self.assertEqual(rendered, "Hello, World!")
    
    def test_render_template_missing_variable(self):
        """Test rendering a template with missing required variable"""
        self.template_manager.add_template(self.test_template)
        
        with self.assertRaises(ValueError):
            self.template_manager.render_template("test_template", {})
    
    def test_render_template_nonexistent(self):
        """Test rendering a template that doesn't exist"""
        with self.assertRaises(ValueError):
            self.template_manager.render_template("nonexistent", {})
    
    @patch("builtins.open", new_callable=mock_open, read_data='{"name": "json_template", "template": "JSON {var}"}')
    @patch("os.path.exists", return_value=True)
    @patch("pathlib.Path.glob")
    def test_load_templates_from_directory(self, mock_glob, mock_exists, mock_file):
        """Test loading templates from a directory"""
        mock_glob.return_value = ["template1.json", "template2.json"]
        
        self.template_manager._load_templates_from_directory("/fake/path")
        
        self.assertIsNotNone(self.template_manager.get_template("json_template"))

class TestContextManager(unittest.TestCase):
    """Tests for the ContextManager class"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.context_manager = ContextManager(max_context_tokens=1000)
    
    def test_add_context_item(self):
        """Test adding a context item"""
        self.context_manager.add_context_item("Test context", role="user")
        
        self.assertEqual(len(self.context_manager.context_items), 1)
        self.assertEqual(self.context_manager.context_items[0].content, "Test context")
        self.assertEqual(self.context_manager.context_items[0].role, "user")
    
    def test_add_system_prompt(self):
        """Test adding a system prompt"""
        self.context_manager.add_context_item("System instruction", role="system")
        
        self.assertEqual(len(self.context_manager.context_items), 0)  # System prompt is stored separately
        self.assertIsNotNone(self.context_manager.system_prompt)
        self.assertEqual(self.context_manager.system_prompt.content, "System instruction")
    
    def test_context_pruning(self):
        """Test context pruning when token limit is exceeded"""
        # Add a large context item that exceeds token limit
        large_content = "Large content " * 1000  # Should exceed 1000 tokens
        self.context_manager.add_context_item(large_content, role="user")
        
        # Add a small, important item
        self.context_manager.add_context_item("Important", role="user", importance=1.0)
        
        # Should have pruned the large item and kept the important one
        self.assertEqual(len(self.context_manager.context_items), 1)
        self.assertEqual(self.context_manager.context_items[0].content, "Important")
    
    def test_get_context_openai_format(self):
        """Test getting context in OpenAI format"""
        self.context_manager.add_context_item("System instruction", role="system")
        self.context_manager.add_context_item("User message", role="user")
        self.context_manager.add_context_item("Assistant response", role="assistant")
        
        context = self.context_manager.get_context(format_type="openai")
        
        self.assertEqual(len(context), 3)
        self.assertEqual(context[0]["role"], "system")
        self.assertEqual(context[1]["role"], "user")
        self.assertEqual(context[2]["role"], "assistant")
    
    def test_get_context_claude_format(self):
        """Test getting context in Claude format"""
        self.context_manager.add_context_item("System instruction", role="system")
        self.context_manager.add_context_item("User message", role="user")
        self.context_manager.add_context_item("Assistant response", role="assistant")
        
        context = self.context_manager.get_context(format_type="claude")
        
        self.assertIn("System: System instruction", context)
        self.assertIn("Human: User message", context)
        self.assertIn("Assistant: Assistant response", context)

class TestAdaptivePromptManager(unittest.TestCase):
    """Tests for the AdaptivePromptManager class"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.manager = AdaptivePromptManager()
        self.test_template = PromptTemplate(
            name="test_template",
            template="Hello, {name}!",
            variables=[
                TemplateVariable("name", required=True)
            ]
        )
    
    def test_add_get_template(self):
        """Test adding and retrieving templates"""
        self.manager.add_template(self.test_template)
        
        template = self.manager.get_template("test_template")
        
        self.assertIsNotNone(template)
        self.assertEqual(template.name, "test_template")
    
    def test_render_template(self):
        """Test rendering a template"""
        self.manager.add_template(self.test_template)
        
        rendered = self.manager.render_template("test_template", {"name": "World"})
        
        self.assertEqual(rendered, "Hello, World!")
    
    def test_add_context_item(self):
        """Test adding a context item"""
        self.manager.add_context_item("Test context", role="user")
        
        context = self.manager.get_context(format_type="text")
        
        self.assertIn("[User] Test context", context)
    
    @patch.object(AdaptivePromptManager, "extract_relevant_context")
    def test_provider_adapter_prompt_preparation(self, mock_extract):
        """Test preparing a prompt with a provider adapter"""
        mock_extract.return_value = "Relevant context"
        
        self.manager.add_template(self.test_template)
        
        # Create OpenAI adapter and prepare prompt
        adapter = OpenAIAdapter({"api_key": "dummy"})
        
        prompt_data = adapter.prepare_prompt(
            self.manager,
            "test_template",
            {"name": "World"}
        )
        
        self.assertIn("messages", prompt_data)
        self.assertIn("model", prompt_data)
        self.assertEqual(prompt_data["rendered_template"], "Hello, World!")

class TestProviderAdapters(unittest.TestCase):
    """Tests for provider adapters"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.manager = AdaptivePromptManager()
        self.test_template = PromptTemplate(
            name="test_template",
            template="Hello, {name}!",
            variables=[
                TemplateVariable("name", required=True)
            ]
        )
        self.manager.add_template(self.test_template)
    
    def test_openai_adapter_init(self):
        """Test initializing OpenAI adapter"""
        adapter = OpenAIAdapter({
            "api_key": "dummy_key",
            "model": "gpt-4o",
            "temperature": 0.5
        })
        
        self.assertEqual(adapter.model, "gpt-4o")
        self.assertEqual(adapter.temperature, 0.5)
    
    def test_claude_adapter_init(self):
        """Test initializing Claude adapter"""
        adapter = ClaudeAdapter({
            "api_key": "dummy_key",
            "model": "claude-3-opus-20240229",
            "temperature": 0.7
        })
        
        self.assertEqual(adapter.model, "claude-3-opus-20240229")
        self.assertEqual(adapter.temperature, 0.7)
    
    @patch.object(AdaptivePromptManager, "extract_relevant_context")
    def test_openai_adapter_prepare_prompt(self, mock_extract):
        """Test preparing a prompt with OpenAI adapter"""
        mock_extract.return_value = "Relevant context"
        
        adapter = OpenAIAdapter({"api_key": "dummy"})
        
        prompt_data = adapter.prepare_prompt(
            self.manager,
            "test_template",
            {"name": "World"}
        )
        
        self.assertIn("messages", prompt_data)
        self.assertTrue(any(msg.get("role") == "system" for msg in prompt_data["messages"]))
        self.assertTrue(any(msg.get("role") == "user" for msg in prompt_data["messages"]))
    
    @patch.object(AdaptivePromptManager, "extract_relevant_context")
    def test_claude_adapter_prepare_prompt(self, mock_extract):
        """Test preparing a prompt with Claude adapter"""
        mock_extract.return_value = "Relevant context"
        
        adapter = ClaudeAdapter({"api_key": "dummy"})
        
        prompt_data = adapter.prepare_prompt(
            self.manager,
            "test_template",
            {"name": "World"}
        )
        
        self.assertIn("prompt", prompt_data)
        self.assertIn("Hello, World!", prompt_data["prompt"])
        self.assertIn("token_count", prompt_data)

if __name__ == '__main__':
    unittest.main()