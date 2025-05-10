#!/usr/bin/env python3
"""
Knowledge Graph Connector for Feature Creation Agent

This module provides a specialized connector for interacting with the
Devloop Knowledge Graph. It leverages the functionality of the memory_knowledge_graph
module and adds feature creation specific capabilities.
"""

import os
import sys
import json
import logging
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime

# Try to import tag manager
try:
    from tag_management import get_tag_manager
    TAG_MANAGER_AVAILABLE = True
except ImportError:
    try:
        from agents.planning.feature_creation.tag_management import get_tag_manager
        TAG_MANAGER_AVAILABLE = True
    except ImportError:
        TAG_MANAGER_AVAILABLE = False

# No need for patching, we'll update the schema directly

# Determine project root directory dynamically
current_dir = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.normpath(os.path.join(current_dir, '..', '..', '..'))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(PROJECT_ROOT, 'logs', 'knowledge_graph_connector.log'))
    ]
)
logger = logging.getLogger('knowledge_graph_connector')

# Create a simple memory persistence class if not available
class SimpleMemoryPersistence:
    """Simple memory persistence implementation for testing"""
    
    def __init__(self, storage_dir=None):
        self.storage_dir = storage_dir or os.path.expanduser("~/.devloop/sdk/storage")
        os.makedirs(self.storage_dir, exist_ok=True)
    
    def get_state(self, state_key, default=None):
        """Get state from file system"""
        state_file = os.path.join(self.storage_dir, f"{state_key}.json")
        if os.path.exists(state_file):
            try:
                with open(state_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error reading state: {e}")
        return default or {}
    
    def set_state(self, state_key, state, update_timestamp=True):
        """Set state to file system"""
        state_file = os.path.join(self.storage_dir, f"{state_key}.json")
        try:
            os.makedirs(os.path.dirname(state_file), exist_ok=True)
            with open(state_file, 'w') as f:
                json.dump(state, f, indent=2)
            return True
        except Exception as e:
            logger.error(f"Error writing state: {e}")
            return False

# Try to import the memory_knowledge_graph or use a mock implementation
try:
    from backups.system_core_backup.system_core.memory.manager.memory_knowledge_graph import MemoryKnowledgeGraph
    USING_REAL_KG = True
except ImportError:
    logger.warning("Could not import MemoryKnowledgeGraph, using mock implementation")
    try:
        from agents.sdk.utils.memory_persistence import MemoryPersistence
    except ImportError:
        logger.warning("Could not import MemoryPersistence, using simple implementation")
        MemoryPersistence = SimpleMemoryPersistence
    
    class MemoryKnowledgeGraph:
        """Mock implementation of MemoryKnowledgeGraph"""
        
        def __init__(self, memory_data=None, memory_file=None):
            self.memory_persistence = MemoryPersistence()
            self.kg_state_key = "knowledge_graph"
            
            if memory_file and os.path.exists(memory_file):
                with open(memory_file, 'r') as f:
                    self.memory = json.load(f)
            else:
                self.memory = memory_data or self.memory_persistence.get_state(self.kg_state_key, {
                    "knowledge_graph": {
                        "nodes": {},
                        "edges": [],
                        "indices": {
                            "node_type_index": {},
                            "edge_type_index": {},
                            "node_outgoing_edges": {},
                            "node_incoming_edges": {}
                        }
                    }
                })
            
        def save(self, file_path):
            """Save knowledge graph to file or state storage"""
            if file_path:
                with open(file_path, 'w') as f:
                    json.dump(self.memory, f, indent=2)
            else:
                self.memory_persistence.set_state(self.kg_state_key, self.memory)
                
        def get_nodes_by_type(self, node_type):
            """Get nodes by type from the knowledge graph"""
            nodes = []
            if "knowledge_graph" in self.memory and "nodes" in self.memory["knowledge_graph"]:
                for node_id, node in self.memory["knowledge_graph"]["nodes"].items():
                    if node.get("type") == node_type:
                        nodes.append(node)
            return nodes
            
        def get_node(self, node_id):
            """Get a node by ID"""
            if "knowledge_graph" in self.memory and "nodes" in self.memory["knowledge_graph"]:
                return self.memory["knowledge_graph"]["nodes"].get(node_id)
            return None
            
        def get_connected_nodes(self, node_id, direction="outgoing"):
            """Get connected nodes"""
            connected_nodes = []
            if "knowledge_graph" in self.memory and "edges" in self.memory["knowledge_graph"]:
                for edge in self.memory["knowledge_graph"]["edges"]:
                    if direction == "outgoing" and edge.get("source") == node_id:
                        target_id = edge.get("target")
                        target_node = self.get_node(target_id)
                        if target_node:
                            connected_nodes.append(target_node)
                    elif direction == "incoming" and edge.get("target") == node_id:
                        source_id = edge.get("source")
                        source_node = self.get_node(source_id)
                        if source_node:
                            connected_nodes.append(source_node)
            return connected_nodes
            
        def add_node(self, node_id, node_type, properties=None, metadata=None):
            """Add a node to the knowledge graph"""
            if "knowledge_graph" not in self.memory:
                self.memory["knowledge_graph"] = {"nodes": {}, "edges": [], "indices": {}}
                
            if "nodes" not in self.memory["knowledge_graph"]:
                self.memory["knowledge_graph"]["nodes"] = {}
                
            # Create node
            node = {
                "id": node_id,
                "type": node_type,
                "properties": properties or {},
                "metadata": metadata or {}
            }
            
            # Add to nodes
            self.memory["knowledge_graph"]["nodes"][node_id] = node
            
            # Update indices
            if "indices" not in self.memory["knowledge_graph"]:
                self.memory["knowledge_graph"]["indices"] = {
                    "node_type_index": {},
                    "edge_type_index": {},
                    "node_outgoing_edges": {},
                    "node_incoming_edges": {}
                }
                
            indices = self.memory["knowledge_graph"]["indices"]
            
            # Update node type index
            if "node_type_index" not in indices:
                indices["node_type_index"] = {}
                
            if node_type not in indices["node_type_index"]:
                indices["node_type_index"][node_type] = []
                
            indices["node_type_index"][node_type].append(node_id)
            
            return node
            
        def add_edge(self, edge_type, source_id, target_id, properties=None, metadata=None):
            """Add an edge to the knowledge graph"""
            if "knowledge_graph" not in self.memory:
                self.memory["knowledge_graph"] = {"nodes": {}, "edges": [], "indices": {}}
                
            if "edges" not in self.memory["knowledge_graph"]:
                self.memory["knowledge_graph"]["edges"] = []
                
            # Create edge
            edge = {
                "type": edge_type,
                "source": source_id,
                "target": target_id,
                "properties": properties or {},
                "metadata": metadata or {}
            }
            
            # Add to edges
            self.memory["knowledge_graph"]["edges"].append(edge)
            
            # Update indices
            if "indices" not in self.memory["knowledge_graph"]:
                self.memory["knowledge_graph"]["indices"] = {
                    "node_type_index": {},
                    "edge_type_index": {},
                    "node_outgoing_edges": {},
                    "node_incoming_edges": {}
                }
                
            indices = self.memory["knowledge_graph"]["indices"]
            
            # Update edge type index
            if "edge_type_index" not in indices:
                indices["edge_type_index"] = {}
                
            if edge_type not in indices["edge_type_index"]:
                indices["edge_type_index"][edge_type] = []
                
            edge_index = len(self.memory["knowledge_graph"]["edges"]) - 1
            indices["edge_type_index"][edge_type].append(edge_index)
            
            # Update node outgoing edges
            if "node_outgoing_edges" not in indices:
                indices["node_outgoing_edges"] = {}
                
            if source_id not in indices["node_outgoing_edges"]:
                indices["node_outgoing_edges"][source_id] = []
                
            indices["node_outgoing_edges"][source_id].append(edge_index)
            
            # Update node incoming edges
            if "node_incoming_edges" not in indices:
                indices["node_incoming_edges"] = {}
                
            if target_id not in indices["node_incoming_edges"]:
                indices["node_incoming_edges"][target_id] = []
                
            indices["node_incoming_edges"][target_id].append(edge_index)
            
            return edge
    
    USING_REAL_KG = False


class KnowledgeGraphConnector:
    """
    Connector for interacting with the Devloop Knowledge Graph,
    specialized for feature creation agent needs.
    """
    
    def __init__(self, kg_file_path: Optional[str] = None):
        """
        Initialize the Knowledge Graph connector
        
        Args:
            kg_file_path: Optional path to the knowledge graph file
        """
        self.kg_file_path = kg_file_path
        
        # Default paths
        if not self.kg_file_path:
            memory_dir = os.path.join(PROJECT_ROOT, 'backups', 'system-core-backup', 'system-core', 'memory')
            self.kg_file_path = os.path.join(memory_dir, 'knowledge_graph.json')
            
            # If that doesn't exist, use the SDK storage
            if not os.path.exists(self.kg_file_path):
                sdk_storage = os.path.expanduser("~/.devloop/sdk/storage")
                self.kg_file_path = os.path.join(sdk_storage, 'knowledge_graph.json')
        
        # Load the knowledge graph
        try:
            self.kg = MemoryKnowledgeGraph(memory_file=self.kg_file_path)
            logger.info(f"Loaded knowledge graph from {self.kg_file_path}")
        except Exception as e:
            logger.error(f"Error loading knowledge graph: {str(e)}")
            self.kg = MemoryKnowledgeGraph()
            logger.info("Created new knowledge graph")
    
    def save(self) -> bool:
        """
        Save the knowledge graph to file
        
        Returns:
            True if the save was successful, False otherwise
        """
        try:
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(self.kg_file_path), exist_ok=True)
            
            # Save the knowledge graph
            self.kg.save(self.kg_file_path)
            logger.info(f"Saved knowledge graph to {self.kg_file_path}")
            return True
        except Exception as e:
            logger.error(f"Error saving knowledge graph: {str(e)}")
            return False
    
    def get_project_structure(self) -> Dict[str, Any]:
        """
        Get the project structure from the knowledge graph
        
        Returns:
            Dictionary containing the project structure
        """
        structure = {
            "milestones": []
        }
        
        # Get all milestone nodes
        milestone_nodes = self.kg.get_nodes_by_type("milestone")
        
        # Process each milestone
        for milestone_node in milestone_nodes:
            milestone_id = milestone_node.get("id")
            milestone = {
                "id": milestone_id,
                "name": milestone_node.get("properties", {}).get("name", milestone_id),
                "phases": []
            }
            
            # Get phases for this milestone
            phase_nodes = []
            if USING_REAL_KG:
                # Use real traversal for authentic KG
                connected_nodes = self.kg.get_connected_nodes(milestone_id, direction="outgoing")
                phase_nodes = [node for node in connected_nodes if node.get("type") == "phase"]
            else:
                # Use a simplified approach for mock KG
                for edge in self.kg.memory.get("knowledge_graph", {}).get("edges", []):
                    if edge.get("source") == milestone_id and edge.get("type") == "milestone_contains_phase":
                        phase_node = self.kg.get_node(edge.get("target"))
                        if phase_node:
                            phase_nodes.append(phase_node)
            
            # Process each phase
            for phase_node in phase_nodes:
                phase_id = phase_node.get("id")
                phase = {
                    "id": phase_id,
                    "name": phase_node.get("properties", {}).get("name", phase_id),
                    "modules": []
                }
                
                # Get modules for this phase
                module_nodes = []
                if USING_REAL_KG:
                    # Use real traversal for authentic KG
                    connected_nodes = self.kg.get_connected_nodes(phase_id, direction="outgoing")
                    module_nodes = [node for node in connected_nodes if node.get("type") == "module"]
                else:
                    # Use a simplified approach for mock KG
                    for edge in self.kg.memory.get("knowledge_graph", {}).get("edges", []):
                        if edge.get("source") == phase_id and edge.get("type") == "phase_contains_module":
                            module_node = self.kg.get_node(edge.get("target"))
                            if module_node:
                                module_nodes.append(module_node)
                
                # Process each module
                for module_node in module_nodes:
                    module_id = module_node.get("id")
                    module = {
                        "id": module_id,
                        "name": module_node.get("properties", {}).get("name", module_id)
                    }
                    
                    phase["modules"].append(module)
                
                milestone["phases"].append(phase)
            
            structure["milestones"].append(milestone)
        
        return structure
    
    def query_by_concepts(self, concepts: List[str], domain: str, purpose: str) -> Dict[str, Any]:
        """
        Query the knowledge graph for concepts, domain, and purpose
        
        Args:
            concepts: List of concepts extracted from feature description
            domain: Domain of the feature
            purpose: Purpose of the feature
            
        Returns:
            Dictionary containing query results
        """
        results = {
            "suggested_milestone": None,
            "suggested_phase": None,
            "suggested_module": None,
            "suggested_tags": concepts.copy(),
            "potential_dependencies": []
        }
        
        # Use domain to suggest tags
        domain_tags = {
            "testing": ["test", "automation", "validation"],
            "ui": ["ui", "interface", "ux", "frontend"],
            "data": ["data", "storage", "persistence"],
            "api": ["api", "integration", "endpoint"],
            "agent": ["agent", "ai", "ml", "intelligence"]
        }
        
        # Add domain-specific tags
        if domain in domain_tags:
            results["suggested_tags"].extend(domain_tags[domain])
        
        # Add purpose tag
        purpose_tags = {
            "bugfix": ["bug-fix", "fix"],
            "new_feature": ["new-feature", "feature"],
            "enhancement": ["enhancement", "improve"],
            "refactoring": ["refactoring", "cleanup"]
        }
        
        if purpose in purpose_tags:
            results["suggested_tags"].extend(purpose_tags[purpose])
        
        # Remove duplicates from tags
        results["suggested_tags"] = list(set(results["suggested_tags"]))
        
        # Find potential dependencies based on concepts
        for concept in concepts:
            # In a real implementation, this would search the knowledge graph
            # Here we're using a simplified approach
            if concept in ["dashboard", "ui", "interface", "widget"]:
                results["potential_dependencies"].append({
                    "id": "feature-2101", 
                    "name": "Dynamic UI Components", 
                    "type": "feature"
                })
            elif concept in ["database", "data", "storage", "persistence"]:
                results["potential_dependencies"].append({
                    "id": "feature-1001", 
                    "name": "Database Schema", 
                    "type": "feature"
                })
            elif concept in ["api", "endpoint", "service", "integration"]:
                results["potential_dependencies"].append({
                    "id": "feature-3001", 
                    "name": "REST API Framework", 
                    "type": "feature"
                })
            elif concept in ["agent", "ai", "intelligence"]:
                results["potential_dependencies"].append({
                    "id": "feature-3101", 
                    "name": "Relationship Agent", 
                    "type": "agent"
                })
        
        # Remove duplicates from dependencies
        unique_deps = []
        seen_ids = set()
        for dep in results["potential_dependencies"]:
            if dep["id"] not in seen_ids:
                unique_deps.append(dep)
                seen_ids.add(dep["id"])
        results["potential_dependencies"] = unique_deps
        
        # Domain-specific placement suggestions
        domain_suggestions = {
            "testing": {
                "milestone": "milestone-integrated-testing",
                "phase": "phase-02",
                "module": "test-progression"
            },
            "ui": {
                "milestone": "milestone-ui-dashboard",
                "phase": "phase-04",
                "module": "feature-improvements"
            },
            "data": {
                "milestone": "milestone-core-foundation",
                "phase": "phase-01",
                "module": "core-infrastructure"
            },
            "api": {
                "milestone": "milestone-github-integration",
                "phase": "phase-04",
                "module": "github-lifecycle"
            },
            "agent": {
                "milestone": "milestone-agent-ecosystem",
                "phase": "phase-03",
                "module": "knowledge-graph-agents"
            }
        }
        
        # Use domain-specific suggestions
        if domain in domain_suggestions:
            results["suggested_milestone"] = domain_suggestions[domain]["milestone"]
            results["suggested_phase"] = domain_suggestions[domain]["phase"]
            results["suggested_module"] = domain_suggestions[domain]["module"]
        
        return results
    
    def add_feature(self, feature_data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Add a feature to the knowledge graph with comprehensive semantic relationships
        
        Args:
            feature_data: Feature data dictionary containing id, name, description, tags, etc.
            
        Returns:
            Tuple of success boolean and feature ID or error message
        """
        try:
            feature_id = feature_data.get("id")
            milestone_id = feature_data.get("milestone")
            phase_id = feature_data.get("phase")
            module_id = feature_data.get("module")
            domain = feature_data.get("domain", "unknown")
            purpose = feature_data.get("purpose", "enhancement")
            tags = feature_data.get("tags", [])
            dependencies = feature_data.get("dependencies", [])
            
            # Check if feature node already exists
            existing_node = self.kg.get_node(feature_id)
            if existing_node:
                logger.warning(f"Feature {feature_id} already exists in knowledge graph")
                return False, f"Feature {feature_id} already exists"
            
            # Check if milestone/phase/module exist and create them if needed
            created_components = []
            
            # Check and create milestone if needed
            milestone_node = self.kg.get_node(milestone_id) if milestone_id else None
            if milestone_id and not milestone_node:
                logger.info(f"Creating milestone node {milestone_id}")
                milestone_node = self.kg.add_node(
                    node_id=milestone_id,
                    node_type="milestone",
                    properties={
                        "name": milestone_id.replace("milestone-", "").replace("-", " ").title(),
                        "status": "active"
                    },
                    metadata={
                        "created_by": "feature_creation_agent",
                        "created_at": datetime.now().isoformat()
                    }
                )
                created_components.append(f"milestone:{milestone_id}")
            
            # Check and create phase if needed
            phase_node = self.kg.get_node(phase_id) if phase_id else None
            if phase_id and not phase_node:
                logger.info(f"Creating phase node {phase_id}")
                phase_node = self.kg.add_node(
                    node_id=phase_id,
                    node_type="phase",
                    properties={
                        "name": phase_id.replace("phase-", "").replace("-", " ").title(),
                        "status": "active"
                    },
                    metadata={
                        "created_by": "feature_creation_agent",
                        "created_at": datetime.now().isoformat(),
                        "milestone": milestone_id
                    }
                )
                created_components.append(f"phase:{phase_id}")
                
                # Connect phase to milestone if both exist
                if milestone_id and milestone_node:
                    logger.info(f"Connecting phase {phase_id} to milestone {milestone_id}")
                    self.kg.add_edge(
                        edge_type="milestone_contains_phase",
                        source_id=milestone_id,
                        target_id=phase_id,
                        metadata={
                            "created_by": "feature_creation_agent",
                            "created_at": datetime.now().isoformat()
                        }
                    )
            
            # Check and create module if needed
            module_node = self.kg.get_node(module_id) if module_id else None
            if module_id and not module_node:
                logger.info(f"Creating module node {module_id}")
                module_node = self.kg.add_node(
                    node_id=module_id,
                    node_type="module",
                    properties={
                        "name": module_id.replace("module-", "").replace("-", " ").title(),
                        "status": "active"
                    },
                    metadata={
                        "created_by": "feature_creation_agent",
                        "created_at": datetime.now().isoformat(),
                        "phase": phase_id,
                        "milestone": milestone_id
                    }
                )
                created_components.append(f"module:{module_id}")
                
                # Connect module to phase if both exist
                if phase_id and phase_node:
                    logger.info(f"Connecting module {module_id} to phase {phase_id}")
                    self.kg.add_edge(
                        edge_type="phase_contains_module",
                        source_id=phase_id,
                        target_id=module_id,
                        metadata={
                            "created_by": "feature_creation_agent",
                            "created_at": datetime.now().isoformat()
                        }
                    )
            
            # Create feature node
            logger.info(f"Creating feature node {feature_id}")
            created_at = datetime.now().isoformat()
            
            # Extract requirements if provided or generate from description
            requirements = feature_data.get("requirements", [])
            if not requirements and feature_data.get("description"):
                # Simple extraction of sentences as requirements
                description = feature_data.get("description", "")
                sentences = [s.strip() for s in description.split('.') if s.strip()]
                requirements = [s for s in sentences if len(s) > 10]  # Filter out very short sentences
            
            # Extract user stories if provided
            user_stories = feature_data.get("user_stories", [])
            
            # Get additional metadata fields
            priority = feature_data.get("priority", "medium")
            effort_estimate = feature_data.get("effort_estimate", "medium")
            risk_level = feature_data.get("risk_level", "medium")
            test_coverage = feature_data.get("test_coverage", 80)
            version = feature_data.get("version", "1.0.0")
            stakeholders = feature_data.get("stakeholders", [])
            
            # Add the feature with all properties directly
            self.kg.add_node(
                node_id=feature_id,
                node_type="feature",
                properties={
                    "name": feature_data.get("name", ""),
                    "description": feature_data.get("description", ""),
                    "status": feature_data.get("status", "not-started"),
                    "tags": tags,
                    "domain": domain,
                    "purpose": purpose,
                    "created_at": created_at,
                    "updated_at": created_at,
                    "requirements": requirements,
                    "user_stories": user_stories,
                    "priority": priority,
                    "effort_estimate": effort_estimate,
                    "risk_level": risk_level,
                    "test_coverage": test_coverage,
                    "version": version,
                    "stakeholders": stakeholders
                },
                metadata={
                    "created_by": "feature_creation_agent",
                    "milestone": milestone_id,
                    "phase": phase_id,
                    "module": module_id
                }
            )
            
            # Connect feature to module if module exists
            if module_id and module_node:
                logger.info(f"Connecting feature {feature_id} to module {module_id}")
                self.kg.add_edge(
                    edge_type="module_contains_feature",
                    source_id=module_id,
                    target_id=feature_id,
                    metadata={
                        "created_by": "feature_creation_agent",
                        "created_at": created_at
                    }
                )
            # If no module but phase exists, connect directly to phase
            elif phase_id and phase_node:
                logger.info(f"Connecting feature {feature_id} to phase {phase_id}")
                self.kg.add_edge(
                    edge_type="phase_contains_feature",
                    source_id=phase_id,
                    target_id=feature_id,
                    metadata={
                        "created_by": "feature_creation_agent",
                        "created_at": created_at
                    }
                )
            # If no phase but milestone exists, connect directly to milestone
            elif milestone_id and milestone_node:
                logger.info(f"Connecting feature {feature_id} to milestone {milestone_id}")
                self.kg.add_edge(
                    edge_type="milestone_contains_feature",
                    source_id=milestone_id,
                    target_id=feature_id,
                    metadata={
                        "created_by": "feature_creation_agent",
                        "created_at": created_at
                    }
                )
            
            # Add dependencies if any
            for dependency in dependencies:
                if dependency.get("id"):
                    dep_id = dependency.get("id")
                    logger.info(f"Adding dependency from {feature_id} to {dep_id}")
                    
                    # Check if dependency exists, create it if not (as a placeholder)
                    dep_node = self.kg.get_node(dep_id)
                    if not dep_node:
                        logger.info(f"Creating placeholder dependency node {dep_id}")
                        self.kg.add_node(
                            node_id=dep_id,
                            node_type=dependency.get("type", "feature"),
                            properties={
                                "name": dependency.get("name", dep_id),
                                "placeholder": True
                            },
                            metadata={
                                "created_by": "feature_creation_agent",
                                "created_at": created_at,
                                "placeholder": True
                            }
                        )
                    
                    # Create dependency edge
                    self.kg.add_edge(
                        edge_type="feature_depends_on",
                        source_id=feature_id,
                        target_id=dep_id,
                        properties={
                            "relationship": dependency.get("relationship", "depends_on"),
                            "strength": dependency.get("strength", "required")
                        },
                        metadata={
                            "created_by": "feature_creation_agent",
                            "created_at": created_at
                        }
                    )
            
            # Add domain concepts and tags to connect to other related features
            # Each tag becomes a concept node with edges to relevant features
            
            # Process tags if tag manager is available
            processed_tags = tags
            if TAG_MANAGER_AVAILABLE:
                try:
                    tag_manager = get_tag_manager()
                    processed_tags = tag_manager.process_tags(tags, domain=domain)
                    logger.info(f"Processed {len(tags)} tags into {len(processed_tags)} tags using tag manager")
                except Exception as e:
                    logger.error(f"Error processing tags with tag manager: {e}")
            
            for tag in processed_tags:
                # Create a consistent concept ID based on normalized tag
                if TAG_MANAGER_AVAILABLE:
                    try:
                        normalized_tag = tag_manager.normalize_tag(tag)
                        concept_id = f"concept-{normalized_tag}"
                    except Exception:
                        concept_id = f"concept-{tag.lower().replace(' ', '-')}"
                else:
                    concept_id = f"concept-{tag.lower().replace(' ', '-')}"
                
                # Check if concept exists, create it if not
                concept_node = self.kg.get_node(concept_id)
                if not concept_node:
                    logger.info(f"Creating concept node {concept_id}")
                    self.kg.add_node(
                        node_id=concept_id,
                        node_type="concept",
                        properties={
                            "name": tag,
                            "normalized": concept_id.replace("concept-", ""),
                            "domain": domain if tag in tags else "general"
                        },
                        metadata={
                            "created_by": "feature_creation_agent",
                            "created_at": created_at
                        }
                    )
                
                # Connect feature to concept
                logger.info(f"Connecting feature {feature_id} to concept {concept_id}")
                self.kg.add_edge(
                    edge_type="feature_related_to_concept",
                    source_id=feature_id,
                    target_id=concept_id,
                    metadata={
                        "created_by": "feature_creation_agent",
                        "created_at": created_at
                    }
                )
            
            # Add domain node if not exists and connect feature to it
            domain_id = f"domain-{domain.lower().replace(' ', '-')}"
            domain_node = self.kg.get_node(domain_id)
            if not domain_node:
                logger.info(f"Creating domain node {domain_id}")
                self.kg.add_node(
                    node_id=domain_id,
                    node_type="domain",
                    properties={
                        "name": domain.title(),
                        "description": f"Domain for {domain} features"
                    },
                    metadata={
                        "created_by": "feature_creation_agent",
                        "created_at": created_at
                    }
                )
            
            # Connect feature to domain
            logger.info(f"Connecting feature {feature_id} to domain {domain_id}")
            self.kg.add_edge(
                edge_type="feature_belongs_to_domain",
                source_id=feature_id,
                target_id=domain_id,
                metadata={
                    "created_by": "feature_creation_agent",
                    "created_at": created_at
                }
            )
            
            # Add purpose node if not exists and connect feature to it
            purpose_id = f"purpose-{purpose.lower().replace(' ', '-')}"
            purpose_node = self.kg.get_node(purpose_id)
            if not purpose_node:
                logger.info(f"Creating purpose node {purpose_id}")
                self.kg.add_node(
                    node_id=purpose_id,
                    node_type="purpose",
                    properties={
                        "name": purpose.title(),
                        "description": f"Purpose category for {purpose} features"
                    },
                    metadata={
                        "created_by": "feature_creation_agent",
                        "created_at": created_at
                    }
                )
            
            # Connect feature to purpose
            logger.info(f"Connecting feature {feature_id} to purpose {purpose_id}")
            self.kg.add_edge(
                edge_type="feature_has_purpose",
                source_id=feature_id,
                target_id=purpose_id,
                metadata={
                    "created_by": "feature_creation_agent",
                    "created_at": created_at
                }
            )
            
            # Save the knowledge graph
            self.save()
            
            extra_info = ""
            if created_components:
                extra_info = f" (created missing components: {', '.join(created_components)})"
            
            logger.info(f"Added feature {feature_id} to knowledge graph{extra_info}")
            return True, feature_id
            
        except Exception as e:
            logger.error(f"Error adding feature to knowledge graph: {str(e)}")
            return False, str(e)

    def query_features(self, domain: Optional[str] = None, purpose: Optional[str] = None, 
                     tags: List[str] = None, milestone: Optional[str] = None,
                     phase: Optional[str] = None, module: Optional[str] = None,
                     limit: int = 10) -> List[Dict[str, Any]]:
        """
        Query for features based on domain, purpose, tags, and placement
        
        Args:
            domain: Specific domain to filter by
            purpose: Specific purpose to filter by
            tags: List of tags to filter by (any match)
            milestone: Specific milestone to filter by
            phase: Specific phase to filter by
            module: Specific module to filter by
            limit: Maximum number of results to return
            
        Returns:
            List of matching feature nodes
        """
        matching_features = []
        tags = tags or []
        
        # Get all feature nodes
        feature_nodes = self.kg.get_nodes_by_type("feature")
        
        # Filter by provided criteria
        for node in feature_nodes:
            properties = node.get("properties", {})
            metadata = node.get("metadata", {})
            
            # Filter by domain
            if domain and properties.get("domain") != domain:
                continue
                
            # Filter by purpose
            if purpose and properties.get("purpose") != purpose:
                continue
                
            # Filter by milestone
            if milestone and metadata.get("milestone") != milestone:
                continue
                
            # Filter by phase
            if phase and metadata.get("phase") != phase:
                continue
                
            # Filter by module
            if module and metadata.get("module") != module:
                continue
                
            # Filter by tags (any match)
            if tags:
                node_tags = properties.get("tags", [])
                if not any(tag in node_tags for tag in tags):
                    continue
            
            # Add matching feature
            matching_features.append({
                "id": node.get("id"),
                "name": properties.get("name", ""),
                "description": properties.get("description", ""),
                "domain": properties.get("domain", "unknown"),
                "purpose": properties.get("purpose", "enhancement"),
                "tags": properties.get("tags", []),
                "status": properties.get("status", "not-started"),
                "milestone": metadata.get("milestone", ""),
                "phase": metadata.get("phase", ""),
                "module": metadata.get("module", "")
            })
            
            # Respect limit
            if len(matching_features) >= limit:
                break
        
        return matching_features
        
    def get_related_features(self, feature_id: str, relation_types: List[str] = None, 
                           max_depth: int = 2, limit: int = 10) -> Dict[str, Any]:
        """
        Get features related to a specific feature through various relationships
        
        Args:
            feature_id: ID of the feature to find relations for
            relation_types: List of relation types to traverse (None for all)
            max_depth: Maximum depth to traverse
            limit: Maximum number of results per relation type
            
        Returns:
            Dictionary of related features by relation type
        """
        related = {
            "dependencies": [],
            "dependents": [],
            "same_domain": [],
            "same_purpose": [],
            "same_module": [],
            "shared_concepts": []
        }
        
        # Check if feature exists
        feature_node = self.kg.get_node(feature_id)
        if not feature_node:
            logger.warning(f"Feature {feature_id} not found")
            return related
            
        properties = feature_node.get("properties", {})
        metadata = feature_node.get("metadata", {})
        
        # Get direct dependencies (features this feature depends on)
        if not relation_types or "dependencies" in relation_types:
            dependency_edges = []
            for edge in self.kg.memory.get("knowledge_graph", {}).get("edges", []):
                if edge.get("source") == feature_id and edge.get("type") == "feature_depends_on":
                    dependency_edges.append(edge)
                    
            for edge in dependency_edges[:limit]:
                dep_node = self.kg.get_node(edge.get("target"))
                if dep_node:
                    dep_props = dep_node.get("properties", {})
                    related["dependencies"].append({
                        "id": dep_node.get("id"),
                        "name": dep_props.get("name", ""),
                        "type": dep_node.get("type", "feature"),
                        "relationship": edge.get("properties", {}).get("relationship", "depends_on"),
                        "strength": edge.get("properties", {}).get("strength", "required")
                    })
        
        # Get dependents (features that depend on this feature)
        if not relation_types or "dependents" in relation_types:
            dependent_edges = []
            for edge in self.kg.memory.get("knowledge_graph", {}).get("edges", []):
                if edge.get("target") == feature_id and edge.get("type") == "feature_depends_on":
                    dependent_edges.append(edge)
                    
            for edge in dependent_edges[:limit]:
                dep_node = self.kg.get_node(edge.get("source"))
                if dep_node:
                    dep_props = dep_node.get("properties", {})
                    related["dependents"].append({
                        "id": dep_node.get("id"),
                        "name": dep_props.get("name", ""),
                        "type": dep_node.get("type", "feature"),
                        "relationship": edge.get("properties", {}).get("relationship", "depends_on"),
                        "strength": edge.get("properties", {}).get("strength", "required")
                    })
        
        # Get features in same domain
        if not relation_types or "same_domain" in relation_types:
            domain = properties.get("domain")
            if domain:
                domain_features = self.query_features(domain=domain, limit=limit)
                related["same_domain"] = [f for f in domain_features if f["id"] != feature_id]
        
        # Get features with same purpose
        if not relation_types or "same_purpose" in relation_types:
            purpose = properties.get("purpose")
            if purpose:
                purpose_features = self.query_features(purpose=purpose, limit=limit)
                related["same_purpose"] = [f for f in purpose_features if f["id"] != feature_id]
        
        # Get features in same module
        if not relation_types or "same_module" in relation_types:
            module = metadata.get("module")
            if module:
                module_features = self.query_features(module=module, limit=limit)
                related["same_module"] = [f for f in module_features if f["id"] != feature_id]
        
        # Get features sharing concepts/tags
        if not relation_types or "shared_concepts" in relation_types:
            tags = properties.get("tags", [])
            if tags:
                tag_features = self.query_features(tags=tags, limit=limit)
                related["shared_concepts"] = [f for f in tag_features if f["id"] != feature_id]
        
        return related
        
    def add_task_to_feature(self, feature_id: str, task_data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Add a task to a feature in the knowledge graph
        
        Args:
            feature_id: ID of the parent feature
            task_data: Task data dictionary containing id, name, description, etc.
            
        Returns:
            Tuple of success boolean and task ID or error message
        """
        try:
            # Check if feature exists
            feature_node = self.kg.get_node(feature_id)
            if not feature_node:
                return False, f"Feature {feature_id} not found"
            
            task_id = task_data.get("id")
            if not task_id:
                # Generate a task ID if not provided
                task_count = len(self.get_feature_tasks(feature_id)) + 1
                task_id = f"task-{feature_id.split('-')[1]}-{task_count:03d}"
                
            # Check if task already exists
            existing_node = self.kg.get_node(task_id)
            if existing_node:
                return False, f"Task {task_id} already exists"
                
            # Get task properties
            name = task_data.get("name", "Untitled Task")
            description = task_data.get("description", "")
            status = task_data.get("status", "not-started")
            priority = task_data.get("priority", "medium")
            complexity = task_data.get("complexity", "medium")
            estimated_hours = task_data.get("estimated_hours", 0)
            
            # Create task node
            created_at = datetime.now().isoformat()
            self.kg.add_node(
                node_id=task_id,
                node_type="task",
                properties={
                    "name": name,
                    "description": description,
                    "status": status,
                    "priority": priority,
                    "complexity": complexity,
                    "estimated_hours": estimated_hours,
                    "created_at": created_at,
                    "updated_at": created_at
                },
                metadata={
                    "created_by": "task_agent",
                    "feature": feature_id
                }
            )
            
            # Connect task to feature
            self.kg.add_edge(
                edge_type="feature_has_task",
                source_id=feature_id,
                target_id=task_id,
                metadata={
                    "created_by": "task_agent",
                    "created_at": created_at
                }
            )
            
            # Save the knowledge graph
            self.save()
            
            return True, task_id
        
        except Exception as e:
            logger.error(f"Error adding task to feature: {str(e)}")
            return False, str(e)

    def get_feature_tasks(self, feature_id: str) -> List[Dict[str, Any]]:
        """
        Get all tasks for a feature
        
        Args:
            feature_id: ID of the feature
            
        Returns:
            List of task dictionaries
        """
        tasks = []
        
        # Check if feature exists
        feature_node = self.kg.get_node(feature_id)
        if not feature_node:
            logger.warning(f"Feature {feature_id} not found")
            return tasks
        
        # Find all feature_has_task edges for this feature
        task_edges = []
        for edge in self.kg.memory.get("knowledge_graph", {}).get("edges", []):
            if edge.get("source") == feature_id and edge.get("type") == "feature_has_task":
                task_edges.append(edge)
        
        # Get task nodes
        for edge in task_edges:
            task_id = edge.get("target")
            task_node = self.kg.get_node(task_id)
            if task_node:
                properties = task_node.get("properties", {})
                tasks.append({
                    "id": task_id,
                    "name": properties.get("name", ""),
                    "description": properties.get("description", ""),
                    "status": properties.get("status", "not-started"),
                    "priority": properties.get("priority", "medium"),
                    "complexity": properties.get("complexity", "medium"),
                    "estimated_hours": properties.get("estimated_hours", 0),
                    "created_at": properties.get("created_at", ""),
                    "updated_at": properties.get("updated_at", "")
                })
        
        return tasks

    def update_task(self, task_id: str, task_data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Update a task in the knowledge graph
        
        Args:
            task_id: ID of the task to update
            task_data: Updated task data
            
        Returns:
            Tuple of success boolean and message
        """
        try:
            # Check if task exists
            task_node = self.kg.get_node(task_id)
            if not task_node:
                return False, f"Task {task_id} not found"
            
            # Get current properties and update with new data
            properties = task_node.get("properties", {}).copy()
            
            # Update with new data
            if "name" in task_data:
                properties["name"] = task_data["name"]
            if "description" in task_data:
                properties["description"] = task_data["description"]
            if "status" in task_data:
                properties["status"] = task_data["status"]
            if "priority" in task_data:
                properties["priority"] = task_data["priority"]
            if "complexity" in task_data:
                properties["complexity"] = task_data["complexity"]
            if "estimated_hours" in task_data:
                properties["estimated_hours"] = task_data["estimated_hours"]
            
            # Update timestamp
            properties["updated_at"] = datetime.now().isoformat()
            
            # Update the node
            self.kg.update_node(task_id, properties=properties)
            
            # Save the knowledge graph
            self.save()
            
            return True, f"Task {task_id} updated successfully"
        
        except Exception as e:
            logger.error(f"Error updating task: {str(e)}")
            return False, str(e)

    def generate_tasks_from_requirements(self, feature_id: str) -> Tuple[bool, List[str]]:
        """
        Generate tasks automatically from feature requirements
        
        Args:
            feature_id: ID of the feature
            
        Returns:
            Tuple of success boolean and list of created task IDs
        """
        try:
            # Check if feature exists
            feature_node = self.kg.get_node(feature_id)
            if not feature_node:
                return False, [f"Feature {feature_id} not found"]
            
            properties = feature_node.get("properties", {})
            requirements = properties.get("requirements", [])
            
            if not requirements:
                return False, ["No requirements found in feature"]
            
            created_task_ids = []
            
            for i, req in enumerate(requirements):
                task_count = len(self.get_feature_tasks(feature_id)) + 1
                task_id = f"task-{feature_id.split('-')[1]}-{task_count:03d}"
                
                # Create a task for each requirement
                task_data = {
                    "id": task_id,
                    "name": f"Implement: {req[:50]}{'...' if len(req) > 50 else ''}",
                    "description": f"Implementation task for requirement: {req}",
                    "status": "not-started",
                    "priority": properties.get("priority", "medium"),
                    "complexity": "medium",
                    "estimated_hours": 4  # Default estimate
                }
                
                success, result = self.add_task_to_feature(feature_id, task_data)
                if success:
                    created_task_ids.append(result)
            
            return True, created_task_ids
        
        except Exception as e:
            logger.error(f"Error generating tasks from requirements: {str(e)}")
            return False, [str(e)]

# Singleton instance of the knowledge graph connector
_connector_instance = None

def get_knowledge_graph_connector() -> KnowledgeGraphConnector:
    """
    Get the singleton instance of the knowledge graph connector
    
    Returns:
        KnowledgeGraphConnector instance
    """
    global _connector_instance
    if _connector_instance is None:
        _connector_instance = KnowledgeGraphConnector()
    return _connector_instance