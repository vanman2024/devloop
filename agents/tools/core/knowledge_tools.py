#!/usr/bin/env python3
"""
Knowledge Tools Module

Provides tools for accessing and manipulating the knowledge graph and memory systems.
These tools allow agents to store, retrieve, and reason about knowledge.
"""

import os
import json
import time
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional, Union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("knowledge_tools")

# Import tool decorators
from ..registry.tool_registry import tool, param_description
from .base_tool import BaseTool


class MemoryTool(BaseTool):
    """Base class for memory-related tools"""
    
    def __init__(self, name: str = None, description: str = None):
        """Initialize the memory tool
        
        Args:
            name: Tool name
            description: Tool description
        """
        super().__init__(name, description)
        
        # Initialize memory storage
        self.memory_path = os.path.join(os.path.dirname(__file__), "../../../system-core/memory")
        self.ensure_memory_path_exists()
        
    def ensure_memory_path_exists(self):
        """Ensure the memory path exists"""
        os.makedirs(self.memory_path, exist_ok=True)
        
    def get_memory_file(self, category: str) -> str:
        """Get the path to a memory file
        
        Args:
            category: Memory category
            
        Returns:
            Path to the memory file
        """
        return os.path.join(self.memory_path, f"{category}.json")
        
    def load_memory(self, category: str) -> List[Dict[str, Any]]:
        """Load memory from storage
        
        Args:
            category: Memory category
            
        Returns:
            List of memory entries
        """
        memory_file = self.get_memory_file(category)
        
        if os.path.exists(memory_file):
            try:
                with open(memory_file, 'r') as f:
                    return json.load(f)
            except json.JSONDecodeError:
                logger.error(f"Error loading memory file {memory_file}")
                return []
        else:
            return []
            
    def save_memory(self, category: str, memories: List[Dict[str, Any]]) -> bool:
        """Save memory to storage
        
        Args:
            category: Memory category
            memories: List of memory entries
            
        Returns:
            True if successful, False otherwise
        """
        memory_file = self.get_memory_file(category)
        
        try:
            with open(memory_file, 'w') as f:
                json.dump(memories, f, indent=2)
            return True
        except Exception as e:
            logger.error(f"Error saving memory file {memory_file}: {e}")
            return False


class MemoryWriter(MemoryTool):
    """Tool for writing to memory"""
    
    def __init__(self):
        """Initialize the memory writer"""
        super().__init__(name="store_memory", 
                         description="Store a memory entry in the knowledge graph")
        
    @param_description({
        "content": "Memory content to store",
        "category": "Category for organizing memories (e.g., facts, observations, decisions)",
        "importance": "Importance rating from 0.0 to 1.0",
        "tags": "List of tags for categorizing the memory",
        "metadata": "Additional metadata to store with the memory"
    })
    def execute(self, content: str, category: str = "facts",
                importance: float = 0.5, tags: List[str] = None,
                metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """Store a memory entry
        
        Args:
            content: Memory content to store
            category: Category for organizing memories
            importance: Importance rating from 0.0 to 1.0
            tags: List of tags for categorizing the memory
            metadata: Additional metadata to store
            
        Returns:
            Status of the operation and memory ID
        """
        # Validate inputs
        if not content:
            return {"success": False, "error": "Memory content cannot be empty"}
            
        if importance < 0.0 or importance > 1.0:
            return {"success": False, "error": "Importance must be between 0.0 and 1.0"}
            
        # Load existing memories
        memories = self.load_memory(category)
        
        # Create memory entry
        memory_id = f"{int(time.time())}-{len(memories)}"
        tags = tags or []
        metadata = metadata or {}
        
        memory_entry = {
            "id": memory_id,
            "content": content,
            "category": category,
            "importance": importance,
            "tags": tags,
            "created_at": datetime.now().isoformat(),
            "metadata": metadata
        }
        
        # Add to memories
        memories.append(memory_entry)
        
        # Save memories
        success = self.save_memory(category, memories)
        
        return {
            "success": success,
            "memory_id": memory_id if success else None,
            "category": category
        }


class MemoryReader(MemoryTool):
    """Tool for reading from memory"""
    
    def __init__(self):
        """Initialize the memory reader"""
        super().__init__(name="retrieve_memories", 
                         description="Retrieve memories from the knowledge graph")
        
    @param_description({
        "category": "Category to retrieve memories from",
        "query": "Optional text query to search for in memory content",
        "tags": "Optional list of tags to filter by",
        "min_importance": "Minimum importance threshold (0.0 to 1.0)",
        "limit": "Maximum number of memories to retrieve",
        "include_metadata": "Whether to include metadata in results"
    })
    def execute(self, category: str = "facts", query: str = "",
                tags: List[str] = None, min_importance: float = 0.0,
                limit: int = 10, include_metadata: bool = True) -> Dict[str, Any]:
        """Retrieve memories
        
        Args:
            category: Category to retrieve memories from
            query: Optional text query to search for
            tags: Optional list of tags to filter by
            min_importance: Minimum importance threshold
            limit: Maximum number of memories to retrieve
            include_metadata: Whether to include metadata
            
        Returns:
            List of matching memories
        """
        # Load memories
        memories = self.load_memory(category)
        
        # Filter by query if provided
        if query:
            query = query.lower()
            memories = [m for m in memories if query in m.get("content", "").lower()]
            
        # Filter by tags if provided
        if tags:
            memories = [m for m in memories if any(tag in m.get("tags", []) for tag in tags)]
            
        # Filter by importance
        memories = [m for m in memories if m.get("importance", 0.0) >= min_importance]
        
        # Sort by importance (descending) and time (descending)
        memories.sort(key=lambda x: (-x.get("importance", 0.0), -int(x.get("id", "0").split("-")[0])))
        
        # Apply limit
        memories = memories[:limit]
        
        # Remove metadata if not requested
        if not include_metadata:
            for memory in memories:
                if "metadata" in memory:
                    del memory["metadata"]
        
        return {
            "category": category,
            "query": query,
            "count": len(memories),
            "memories": memories
        }


class KnowledgeManager(BaseTool):
    """Tool for managing knowledge relationships"""
    
    def __init__(self):
        """Initialize the knowledge manager"""
        super().__init__(name="manage_knowledge", 
                         description="Create and manage knowledge relationships")
        
        # Initialize knowledge graph storage
        self.graph_path = os.path.join(os.path.dirname(__file__), "../../../system-core/memory/graph.json")
        self.ensure_graph_exists()
        
    def ensure_graph_exists(self):
        """Ensure the graph file exists"""
        if not os.path.exists(self.graph_path):
            os.makedirs(os.path.dirname(self.graph_path), exist_ok=True)
            with open(self.graph_path, 'w') as f:
                json.dump({"nodes": [], "edges": []}, f, indent=2)
                
    def load_graph(self) -> Dict[str, Any]:
        """Load the knowledge graph
        
        Returns:
            Knowledge graph structure
        """
        try:
            with open(self.graph_path, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return {"nodes": [], "edges": []}
            
    def save_graph(self, graph: Dict[str, Any]) -> bool:
        """Save the knowledge graph
        
        Args:
            graph: Knowledge graph structure
            
        Returns:
            True if successful, False otherwise
        """
        try:
            with open(self.graph_path, 'w') as f:
                json.dump(graph, f, indent=2)
            return True
        except Exception as e:
            logger.error(f"Error saving knowledge graph: {e}")
            return False
        
    @param_description({
        "operation": "Operation to perform (add_node, add_edge, query_related)",
        "params": "Parameters for the operation"
    })
    def execute(self, operation: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Manage knowledge relationships
        
        Args:
            operation: Operation to perform
            params: Parameters for the operation
            
        Returns:
            Result of the operation
        """
        if operation == "add_node":
            return self._add_node(params)
        elif operation == "add_edge":
            return self._add_edge(params)
        elif operation == "query_related":
            return self._query_related(params)
        else:
            return {"success": False, "error": f"Unknown operation: {operation}"}
            
    def _add_node(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Add a node to the knowledge graph
        
        Args:
            params: Node parameters
            
        Returns:
            Result of the operation
        """
        node_type = params.get("type")
        node_name = params.get("name")
        properties = params.get("properties", {})
        
        if not node_type or not node_name:
            return {"success": False, "error": "Node type and name are required"}
            
        # Load graph
        graph = self.load_graph()
        
        # Check if node already exists
        for node in graph["nodes"]:
            if node.get("name") == node_name and node.get("type") == node_type:
                return {"success": False, "error": "Node already exists", "node_id": node.get("id")}
                
        # Create node
        node_id = f"{node_type}-{int(time.time())}"
        node = {
            "id": node_id,
            "type": node_type,
            "name": node_name,
            "created_at": datetime.now().isoformat(),
            "properties": properties
        }
        
        # Add to graph
        graph["nodes"].append(node)
        
        # Save graph
        success = self.save_graph(graph)
        
        return {
            "success": success,
            "node_id": node_id if success else None
        }
        
    def _add_edge(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Add an edge to the knowledge graph
        
        Args:
            params: Edge parameters
            
        Returns:
            Result of the operation
        """
        source_id = params.get("source_id")
        target_id = params.get("target_id")
        relation_type = params.get("relation_type")
        properties = params.get("properties", {})
        
        if not source_id or not target_id or not relation_type:
            return {"success": False, "error": "Source ID, target ID, and relation type are required"}
            
        # Load graph
        graph = self.load_graph()
        
        # Verify nodes exist
        source_node = None
        target_node = None
        
        for node in graph["nodes"]:
            if node.get("id") == source_id:
                source_node = node
            if node.get("id") == target_id:
                target_node = node
                
        if not source_node:
            return {"success": False, "error": f"Source node {source_id} not found"}
            
        if not target_node:
            return {"success": False, "error": f"Target node {target_id} not found"}
            
        # Create edge
        edge_id = f"{relation_type}-{int(time.time())}"
        edge = {
            "id": edge_id,
            "source": source_id,
            "target": target_id,
            "type": relation_type,
            "created_at": datetime.now().isoformat(),
            "properties": properties
        }
        
        # Add to graph
        graph["edges"].append(edge)
        
        # Save graph
        success = self.save_graph(graph)
        
        return {
            "success": success,
            "edge_id": edge_id if success else None
        }
        
    def _query_related(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Query related nodes in the knowledge graph
        
        Args:
            params: Query parameters
            
        Returns:
            Related nodes and edges
        """
        node_id = params.get("node_id")
        relation_types = params.get("relation_types", [])
        max_depth = params.get("max_depth", 1)
        
        if not node_id:
            return {"success": False, "error": "Node ID is required"}
            
        # Load graph
        graph = self.load_graph()
        
        # Find the starting node
        start_node = None
        for node in graph["nodes"]:
            if node.get("id") == node_id:
                start_node = node
                break
                
        if not start_node:
            return {"success": False, "error": f"Node {node_id} not found"}
            
        # Breadth-first search to find related nodes
        visited_nodes = {node_id}
        related_nodes = [start_node]
        related_edges = []
        
        # Process nodes level by level up to max_depth
        current_level = [node_id]
        
        for _ in range(max_depth):
            next_level = []
            
            for current_id in current_level:
                # Find all edges connected to this node
                for edge in graph["edges"]:
                    consider_edge = not relation_types or edge.get("type") in relation_types
                    
                    if edge.get("source") == current_id and consider_edge:
                        target_id = edge.get("target")
                        if target_id not in visited_nodes:
                            visited_nodes.add(target_id)
                            next_level.append(target_id)
                            related_edges.append(edge)
                            
                            # Find and add the target node
                            for node in graph["nodes"]:
                                if node.get("id") == target_id:
                                    related_nodes.append(node)
                                    break
                                    
                    elif edge.get("target") == current_id and consider_edge:
                        source_id = edge.get("source")
                        if source_id not in visited_nodes:
                            visited_nodes.add(source_id)
                            next_level.append(source_id)
                            related_edges.append(edge)
                            
                            # Find and add the source node
                            for node in graph["nodes"]:
                                if node.get("id") == source_id:
                                    related_nodes.append(node)
                                    break
            
            # Update current level for next iteration
            current_level = next_level
            
            # If no more nodes to explore, break
            if not current_level:
                break
                
        return {
            "success": True,
            "start_node": start_node,
            "related_nodes": related_nodes,
            "related_edges": related_edges,
            "node_count": len(related_nodes),
            "edge_count": len(related_edges)
        }


# Function-based tools using decorators

@tool(
    name="record_observation",
    description="Record an observation in the memory system",
    categories=["knowledge", "memory"],
    permissions=["memory_write"]
)
@param_description({
    "observation": "The observation to record",
    "importance": "Importance rating from 0.0 to 1.0",
    "tags": "List of tags for categorizing the observation"
})
def record_observation(observation: str, importance: float = 0.5, 
                       tags: List[str] = None) -> Dict[str, Any]:
    """Record an observation in the memory system
    
    Args:
        observation: The observation to record
        importance: Importance rating from 0.0 to 1.0
        tags: List of tags for categorizing the observation
        
    Returns:
        Status of the operation
    """
    # Create memory writer
    memory_writer = MemoryWriter()
    
    # Add timestamp metadata
    metadata = {
        "timestamp": datetime.now().isoformat(),
        "type": "observation"
    }
    
    # Write memory
    return memory_writer.execute(
        content=observation,
        category="observations",
        importance=importance,
        tags=tags or ["observation"],
        metadata=metadata
    )


@tool(
    name="search_knowledge",
    description="Search for knowledge across categories",
    categories=["knowledge", "memory"],
    permissions=["memory_read"]
)
@param_description({
    "query": "Text to search for in memories",
    "categories": "Categories to search in",
    "min_importance": "Minimum importance threshold",
    "limit_per_category": "Maximum items to return per category"
})
def search_knowledge(query: str, categories: List[str] = None, 
                    min_importance: float = 0.0,
                    limit_per_category: int = 5) -> Dict[str, Any]:
    """Search for knowledge across categories
    
    Args:
        query: Text to search for in memories
        categories: Categories to search in
        min_importance: Minimum importance threshold
        limit_per_category: Maximum items to return per category
        
    Returns:
        Search results by category
    """
    # Default categories
    if not categories:
        categories = ["facts", "observations", "decisions"]
        
    # Create memory reader
    memory_reader = MemoryReader()
    
    # Search each category
    results = {}
    total_found = 0
    
    for category in categories:
        result = memory_reader.execute(
            category=category,
            query=query,
            min_importance=min_importance,
            limit=limit_per_category
        )
        
        results[category] = result.get("memories", [])
        total_found += len(result.get("memories", []))
        
    return {
        "query": query,
        "total_found": total_found,
        "categories_searched": categories,
        "results": results
    }


# Register our tools
def register_knowledge_tools():
    """Register all knowledge tools with the registry"""
    # Create and register class-based tools
    memory_writer = MemoryWriter()
    memory_writer.register(
        categories=["knowledge", "memory"],
        permissions=["memory_write"]
    )
    
    memory_reader = MemoryReader()
    memory_reader.register(
        categories=["knowledge", "memory"],
        permissions=["memory_read"]
    )
    
    knowledge_manager = KnowledgeManager()
    knowledge_manager.register(
        categories=["knowledge", "graph"],
        permissions=["memory_write", "memory_read"]
    )
    
    # Function-based tools are registered via decorators
    # No need to explicitly register them here
    
    logger.info("Registered knowledge tools")


# Example usage
if __name__ == "__main__":
    # Register all knowledge tools
    register_knowledge_tools()
    
    # Import the registry
    from ..registry.tool_registry import ToolRegistry
    
    # Get the registry
    registry = ToolRegistry()
    
    # Store a memory
    result = registry.execute_tool("store_memory", {
        "content": "The system requires Python 3.8 or later for SDK support.",
        "category": "facts",
        "importance": 0.8,
        "tags": ["requirements", "python", "sdk"]
    })
    print(f"Store memory result: {json.dumps(result, indent=2)}")
    
    # Retrieve memories
    result = registry.execute_tool("retrieve_memories", {
        "category": "facts",
        "query": "python"
    })
    print(f"Retrieve memories result: {json.dumps(result, indent=2)}")
    
    # Record an observation
    result = registry.execute_tool("record_observation", {
        "observation": "The system is experiencing high CPU usage during vector operations.",
        "importance": 0.7,
        "tags": ["performance", "cpu"]
    })
    print(f"Record observation result: {json.dumps(result, indent=2)}")
    
    # Search knowledge
    result = registry.execute_tool("search_knowledge", {
        "query": "python",
        "categories": ["facts", "observations"]
    })
    print(f"Search knowledge result: {json.dumps(result, indent=2)}")
    
    # Add a node to the knowledge graph
    result = registry.execute_tool("manage_knowledge", {
        "operation": "add_node",
        "params": {
            "type": "component",
            "name": "SDK Core",
            "properties": {
                "language": "Python",
                "status": "active"
            }
        }
    })
    print(f"Add node result: {json.dumps(result, indent=2)}")
    
    # Add another node
    result = registry.execute_tool("manage_knowledge", {
        "operation": "add_node",
        "params": {
            "type": "dependency",
            "name": "OpenAI SDK",
            "properties": {
                "version": "1.77.0",
                "required": True
            }
        }
    })
    print(f"Add node result: {json.dumps(result, indent=2)}")
    
    # Add an edge
    node1_id = result.get("node_id")
    result = registry.execute_tool("manage_knowledge", {
        "operation": "add_edge",
        "params": {
            "source_id": node1_id,
            "target_id": result.get("node_id"),
            "relation_type": "depends_on",
            "properties": {
                "critical": True
            }
        }
    })
    print(f"Add edge result: {json.dumps(result, indent=2)}")
    
    # Query related nodes
    result = registry.execute_tool("manage_knowledge", {
        "operation": "query_related",
        "params": {
            "node_id": node1_id,
            "max_depth": 2
        }
    })
    print(f"Query related result: {json.dumps(result, indent=2)}")