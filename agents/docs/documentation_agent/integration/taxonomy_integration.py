"""
Taxonomy Integration Module - Connects the action taxonomy with the document system

This module integrates the action taxonomy with the document processing pipeline,
redundancy detection, and search functionality, enhancing the entire documentation
management system.
"""

import logging
import os
import asyncio
from typing import Dict, List, Any, Optional, Tuple, Set, Union
from datetime import datetime

from ..taxonomy.action_taxonomy import ActionTaxonomy, TaxonomyEnhancedSearch
from ..core.redundancy_enhanced_detection import (
    TaxonomyEnhancedRedundancyDetector,
    RedundancyActionAnalyzer
)
from ..core.document_processing_pipeline import DocumentProcessingPipeline
from ..core.documentation_agent_hub import DocumentationAgentHub
from ..connectors.vector_store_connector import DocumentVectorStoreConnector
from ..connectors.knowledge_graph_connector import DocumentKnowledgeGraphConnector
from ..models.document_model import Document

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TaxonomyIntegrationService:
    """
    Service for integrating the action taxonomy into the document system.
    
    This service connects the taxonomy with existing components, enhancing
    their capabilities with semantic understanding of programming actions.
    """
    
    def __init__(self, agent_hub: DocumentationAgentHub,
                processing_pipeline: DocumentProcessingPipeline,
                knowledge_graph: DocumentKnowledgeGraphConnector,
                vector_store: DocumentVectorStoreConnector,
                config: Dict[str, Any] = None):
        """
        Initialize the taxonomy integration service.
        
        Args:
            agent_hub: Documentation agent hub
            processing_pipeline: Document processing pipeline
            knowledge_graph: Knowledge graph connector
            vector_store: Vector store connector
            config: Configuration dictionary
        """
        self.agent_hub = agent_hub
        self.processing_pipeline = processing_pipeline
        self.knowledge_graph = knowledge_graph
        self.vector_store = vector_store
        self.config = config or {}
        
        # Create taxonomy
        self.taxonomy = ActionTaxonomy(vector_store=vector_store)
        
        # Create enhanced components
        self.enhanced_search = TaxonomyEnhancedSearch(vector_store, self.taxonomy)
        self.enhanced_redundancy_detector = TaxonomyEnhancedRedundancyDetector(
            vector_store, knowledge_graph, self.taxonomy, self.config
        )
        self.action_analyzer = RedundancyActionAnalyzer(self.taxonomy, vector_store)
        
        # Track initialization state
        self.initialized = False
        
        logger.info("TaxonomyIntegrationService created")
    
    async def initialize(self) -> bool:
        """
        Initialize the taxonomy integration service.
        
        Returns:
            Initialization success status
        """
        try:
            # Load the taxonomy
            self.taxonomy.load_taxonomy()
            
            # Initialize embeddings
            await self.taxonomy.initialize_embeddings()
            
            # Register hooks with document processing pipeline
            self._register_processing_hooks()
            
            # Register taxonomy with agent hub
            self._register_with_agent_hub()
            
            self.initialized = True
            logger.info("TaxonomyIntegrationService initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error initializing TaxonomyIntegrationService: {e}")
            return False
    
    def _register_processing_hooks(self) -> None:
        """Register hooks with the document processing pipeline."""
        if hasattr(self.processing_pipeline, 'add_post_processing_hook'):
            self.processing_pipeline.add_post_processing_hook(
                "taxonomy_classification",
                self._document_classification_hook
            )
            logger.info("Registered taxonomy classification hook with processing pipeline")
        else:
            logger.warning("Document processing pipeline does not support hooks")
    
    def _register_with_agent_hub(self) -> None:
        """Register taxonomy services with the agent hub."""
        try:
            # Register enhanced services
            self.agent_hub.register_service("taxonomy", self.taxonomy)
            self.agent_hub.register_service("enhanced_search", self.enhanced_search)
            self.agent_hub.register_service("enhanced_redundancy_detector", self.enhanced_redundancy_detector)
            self.agent_hub.register_service("action_analyzer", self.action_analyzer)
            
            logger.info("Registered taxonomy services with agent hub")
            
        except Exception as e:
            logger.error(f"Error registering with agent hub: {e}")
    
    async def _document_classification_hook(self, document: Document, 
                                          context: Dict[str, Any]) -> Document:
        """
        Hook to classify documents using the taxonomy.
        
        Args:
            document: Processed document
            context: Processing context
            
        Returns:
            Document with taxonomy classifications
        """
        if not self.initialized:
            return document
        
        try:
            # Analyze document content
            categorization = await self.taxonomy.categorize_text(document.content)
            
            # Extract action and category names
            actions = [a["verb"] for a in categorization.get("actions", [])]
            categories = [c["category"] for c in categorization.get("categories", [])]
            
            # Add taxonomy classifications to document metadata
            if not hasattr(document.metadata, "custom_metadata"):
                document.metadata.custom_metadata = {}
                
            document.metadata.custom_metadata["taxonomy"] = {
                "actions": actions,
                "categories": categories,
                "classified_at": datetime.now().isoformat()
            }
            
            # Add taxonomy classifications to knowledge graph
            await self._update_knowledge_graph(document.id, actions, categories)
            
            logger.info(f"Classified document {document.id} with {len(actions)} actions and {len(categories)} categories")
            
        except Exception as e:
            logger.error(f"Error in taxonomy classification hook: {e}")
        
        return document
    
    async def _update_knowledge_graph(self, document_id: str, 
                                    actions: List[str], 
                                    categories: List[str]) -> None:
        """
        Update knowledge graph with taxonomy classifications.
        
        Args:
            document_id: Document ID
            actions: Detected actions
            categories: Detected categories
        """
        try:
            # Add actions as properties to document node
            await self.knowledge_graph.update_document_properties(
                document_id,
                {"taxonomy_actions": actions, "taxonomy_categories": categories}
            )
            
            # Create relationships to action concept nodes
            for action in actions:
                # Create action concept node if it doesn't exist
                action_node_id = f"action_{action}"
                if not await self.knowledge_graph.node_exists(action_node_id):
                    await self.knowledge_graph.add_node({
                        "id": action_node_id,
                        "label": "Action",
                        "properties": {
                            "name": action,
                            "description": self.taxonomy.get_action_details(action)["description"]
                        }
                    })
                
                # Create relationship
                await self.knowledge_graph.add_relationship({
                    "source_id": document_id,
                    "target_id": action_node_id,
                    "type": "IMPLEMENTS",
                    "properties": {
                        "confidence": 0.8
                    }
                })
            
            # Create relationships to category concept nodes
            for category in categories:
                # Create category concept node if it doesn't exist
                category_node_id = f"category_{category.replace(' ', '_')}"
                if not await self.knowledge_graph.node_exists(category_node_id):
                    await self.knowledge_graph.add_node({
                        "id": category_node_id,
                        "label": "Category",
                        "properties": {
                            "name": category
                        }
                    })
                
                # Create relationship
                await self.knowledge_graph.add_relationship({
                    "source_id": document_id,
                    "target_id": category_node_id,
                    "type": "BELONGS_TO",
                    "properties": {
                        "confidence": 0.8
                    }
                })
            
        except Exception as e:
            logger.error(f"Error updating knowledge graph with taxonomy classifications: {e}")
    
    async def analyze_code_document(self, document_id: str) -> Dict[str, Any]:
        """
        Analyze a code document to identify actions and patterns.
        
        Args:
            document_id: Document ID
            
        Returns:
            Analysis results
        """
        if not self.initialized:
            await self.initialize()
        
        try:
            # Get the document
            doc_data = await self.knowledge_graph.get_document(document_id)
            
            if not doc_data:
                return {"error": "Document not found"}
            
            # Create document object
            document = Document(
                id=document_id,
                title=doc_data.get("title", ""),
                content=doc_data.get("content", ""),
                document_type=doc_data.get("document_type", "")
            )
            
            # Check if taxonomy data is already in metadata
            if doc_data.get("properties", {}).get("taxonomy_actions"):
                actions = doc_data["properties"]["taxonomy_actions"]
                categories = doc_data["properties"].get("taxonomy_categories", [])
                
                analysis = {
                    "document_id": document_id,
                    "title": document.title,
                    "actions": actions,
                    "categories": categories,
                    "from_cache": True
                }
            else:
                # Perform fresh analysis
                categorization = await self.taxonomy.categorize_text(document.content)
                
                # Extract action and category information
                actions = [
                    {
                        "verb": a["verb"],
                        "description": self.taxonomy.get_action_details(a["verb"])["description"],
                        "similarity": a["similarity"]
                    }
                    for a in categorization.get("actions", [])
                ]
                
                categories = [
                    {
                        "category": c["category"],
                        "similarity": c["similarity"]
                    }
                    for c in categorization.get("categories", [])
                ]
                
                # Get code-specific insights if it's a code document
                code_insights = {}
                if document.document_type == "code":
                    code_analysis = await self.taxonomy.analyze_code(document.content)
                    code_insights = {
                        "summary": code_analysis.get("summary", ""),
                        "primary_actions": [a["verb"] for a in code_analysis.get("actions", [])[:3]],
                        "primary_categories": [c["category"] for c in code_analysis.get("categories", [])[:2]]
                    }
                
                analysis = {
                    "document_id": document_id,
                    "title": document.title,
                    "actions": actions,
                    "categories": categories,
                    "code_insights": code_insights,
                    "from_cache": False
                }
                
                # Update knowledge graph
                await self._update_knowledge_graph(
                    document_id, 
                    [a["verb"] for a in actions], 
                    [c["category"] for c in categories]
                )
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing code document: {e}")
            return {"error": str(e)}
    
    async def find_similar_operations(self, action: str, top_k: int = 10) -> Dict[str, Any]:
        """
        Find documents implementing similar operations.
        
        Args:
            action: Action verb to search for
            top_k: Number of results to return
            
        Returns:
            Search results
        """
        if not self.initialized:
            await self.initialize()
        
        try:
            # Get action details
            action_details = self.taxonomy.get_action_details(action)
            
            if not action_details:
                return {"error": f"Unknown action: {action}"}
            
            # Search for similar documents
            results = await self.enhanced_search.search_by_action(action, top_k=top_k)
            
            # Enhance results with knowledge graph information
            enhanced_results = []
            
            for result in results:
                # Get related documents from knowledge graph
                doc_id = result.get("id")
                if not doc_id:
                    continue
                    
                related_docs = await self.knowledge_graph.get_document_relationships(doc_id)
                related_action_docs = [
                    rel for rel in related_docs
                    if rel.get("type") == "IMPLEMENTS" and rel.get("target_id", "").startswith("action_")
                ]
                
                # Get related actions
                related_actions = []
                for rel in related_action_docs:
                    action_id = rel.get("target_id", "")
                    action_name = action_id.replace("action_", "") if action_id else ""
                    if action_name and action_name != action:
                        related_actions.append(action_name)
                
                # Add to enhanced results
                enhanced_result = {
                    **result,
                    "related_actions": related_actions
                }
                
                enhanced_results.append(enhanced_result)
            
            return {
                "action": action,
                "description": action_details["description"],
                "category": action_details["category"],
                "examples": action_details["examples"],
                "results": enhanced_results
            }
            
        except Exception as e:
            logger.error(f"Error finding similar operations: {e}")
            return {"error": str(e)}
    
    async def generate_semantic_report(self, document_ids: List[str]) -> Dict[str, Any]:
        """
        Generate a semantic report for a set of documents.
        
        Args:
            document_ids: List of document IDs
            
        Returns:
            Semantic report
        """
        if not self.initialized:
            await self.initialize()
        
        try:
            # Get all documents
            documents = []
            
            for doc_id in document_ids:
                doc_data = await self.knowledge_graph.get_document(doc_id)
                
                if not doc_data:
                    continue
                    
                document = Document(
                    id=doc_id,
                    title=doc_data.get("title", ""),
                    content=doc_data.get("content", ""),
                    document_type=doc_data.get("document_type", "")
                )
                
                documents.append(document)
            
            if not documents:
                return {"error": "No valid documents found"}
            
            # Analyze all documents
            analyses = []
            action_counts = {}
            category_counts = {}
            
            for document in documents:
                categorization = await self.taxonomy.categorize_text(document.content)
                
                # Track actions and categories
                actions = [a["verb"] for a in categorization.get("actions", [])]
                categories = [c["category"] for c in categorization.get("categories", [])]
                
                # Update counts
                for action in actions:
                    if action not in action_counts:
                        action_counts[action] = 0
                    action_counts[action] += 1
                
                for category in categories:
                    if category not in category_counts:
                        category_counts[category] = 0
                    category_counts[category] += 1
                
                analyses.append({
                    "document_id": document.id,
                    "title": document.title,
                    "actions": actions,
                    "categories": categories
                })
            
            # Sort actions and categories by frequency
            sorted_actions = sorted(action_counts.items(), key=lambda x: x[1], reverse=True)
            sorted_categories = sorted(category_counts.items(), key=lambda x: x[1], reverse=True)
            
            # Generate insights
            common_actions = [action for action, count in sorted_actions if count > 1]
            common_categories = [category for category, count in sorted_categories if count > 1]
            
            # Find action patterns
            action_patterns = []
            document_count = len(documents)
            
            if document_count > 1:
                # Look for actions present in all or most documents
                full_coverage_actions = [action for action, count in action_counts.items() if count == document_count]
                high_coverage_actions = [action for action, count in action_counts.items() 
                                      if count >= document_count * 0.7 and count < document_count]
                
                if full_coverage_actions:
                    action_patterns.append({
                        "type": "universal_actions",
                        "actions": full_coverage_actions,
                        "description": f"These actions appear across all documents: {', '.join(full_coverage_actions)}"
                    })
                
                if high_coverage_actions:
                    action_patterns.append({
                        "type": "common_actions",
                        "actions": high_coverage_actions,
                        "description": f"These actions appear in most documents: {', '.join(high_coverage_actions)}"
                    })
                
                # Look for category patterns
                full_coverage_categories = [cat for cat, count in category_counts.items() if count == document_count]
                
                if full_coverage_categories:
                    action_patterns.append({
                        "type": "domain_focus",
                        "categories": full_coverage_categories,
                        "description": f"All documents focus on the same domain: {', '.join(full_coverage_categories)}"
                    })
            
            # Generate summary
            if common_categories and common_actions:
                summary = f"These documents primarily perform {', '.join(common_actions[:3])} operations in the {', '.join(common_categories[:2])} domain."
            elif common_actions:
                summary = f"These documents primarily perform {', '.join(common_actions[:3])} operations."
            elif common_categories:
                summary = f"These documents focus on the {', '.join(common_categories[:2])} domain."
            else:
                summary = "These documents have diverse operations without a clear pattern."
            
            # Create report
            report = {
                "summary": summary,
                "document_count": document_count,
                "common_actions": common_actions,
                "common_categories": common_categories,
                "action_patterns": action_patterns,
                "action_frequencies": dict(sorted_actions[:10]),
                "category_frequencies": dict(sorted_categories),
                "documents": analyses
            }
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating semantic report: {e}")
            return {"error": str(e)}
    
    async def recommend_consolidation(self, document_ids: List[str]) -> Dict[str, Any]:
        """
        Recommend consolidation for a set of documents.
        
        Args:
            document_ids: List of document IDs
            
        Returns:
            Consolidation recommendations
        """
        if not self.initialized:
            await self.initialize()
        
        try:
            # First generate a semantic report
            report = await self.generate_semantic_report(document_ids)
            
            if "error" in report:
                return report
            
            # Determine if consolidation is recommended
            common_actions = report.get("common_actions", [])
            common_categories = report.get("common_categories", [])
            action_patterns = report.get("action_patterns", [])
            
            # Check consolidation criteria
            consolidation_recommended = False
            consolidation_reason = ""
            
            # Documents with the same primary actions should be consolidated
            universal_actions = next((pattern for pattern in action_patterns if pattern["type"] == "universal_actions"), None)
            if universal_actions and len(universal_actions["actions"]) >= 2:
                consolidation_recommended = True
                consolidation_reason = f"Multiple documents implementing the same set of actions: {', '.join(universal_actions['actions'])}"
            
            # Documents in the same domain with overlapping actions
            if common_categories and len(common_actions) >= 2:
                consolidation_recommended = True
                consolidation_reason = f"Documents in the {common_categories[0]} domain with overlapping actions: {', '.join(common_actions[:3])}"
            
            # Generate consolidation recommendations
            recommendations = []
            
            if consolidation_recommended:
                # Generate different recommendations based on patterns
                if "transform" in common_actions or "process" in common_actions:
                    recommendations.append({
                        "type": "extract_utility",
                        "description": "Extract common transformation logic into a shared utility class",
                        "priority": "high"
                    })
                
                if "validate" in common_actions:
                    recommendations.append({
                        "type": "validation_library",
                        "description": "Create a unified validation library",
                        "priority": "high"
                    })
                
                # Default recommendation
                if not recommendations:
                    recommendations.append({
                        "type": "merge_documents",
                        "description": "Consolidate similar functionality into a unified implementation",
                        "priority": "medium"
                    })
            
            # Create recommendation response
            response = {
                "consolidation_recommended": consolidation_recommended,
                "reason": consolidation_reason,
                "recommendations": recommendations,
                "semantic_report": report
            }
            
            return response
            
        except Exception as e:
            logger.error(f"Error recommending consolidation: {e}")
            return {"error": str(e)}