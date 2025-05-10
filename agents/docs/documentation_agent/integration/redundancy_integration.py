"""
Integration layer for redundancy detection and document management.

This module connects the redundancy detection system with the rest
of the documentation agent system, enabling seamless document processing
and redundancy management.
"""

import logging
import asyncio
from typing import Dict, List, Any, Optional, Union
from datetime import datetime

from ..models.document_model import Document
from ..connectors.knowledge_graph_connector import DocumentKnowledgeGraphConnector
from ..connectors.vector_store_connector import DocumentVectorStoreConnector
from ..core.inter_agent_handoff import (
    HandoffManager,
    HandoffRegistry,
    HandoffContext,
    HandoffPriority,
    HandoffStatus,
    CapabilityRegistry
)
from ..core.redundancy_detection import (
    RedundancyDetector,
    RedundancyManager,
    RedundancyDetectionResult
)
from ..core.document_processing_pipeline import DocumentProcessingPipeline
from ..core.documentation_agent_hub import DocumentationAgentHub
from ..agents.document_consolidation_agent import DocumentConsolidationAgent

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RedundancyIntegrationService:
    """
    Service for integrating redundancy detection with the document processing pipeline.
    
    This service:
    1. Connects redundancy detection to the document processing pipeline
    2. Registers redundancy-related agents in the system
    3. Configures handoff capabilities for redundancy management
    4. Orchestrates the redundancy detection workflow
    """
    
    def __init__(self, agent_hub: DocumentationAgentHub,
                 processing_pipeline: DocumentProcessingPipeline,
                 knowledge_graph: DocumentKnowledgeGraphConnector,
                 vector_store: DocumentVectorStoreConnector,
                 handoff_registry: HandoffRegistry,
                 capability_registry: CapabilityRegistry,
                 config: Dict[str, Any] = None):
        """Initialize the redundancy integration service."""
        self.agent_hub = agent_hub
        self.processing_pipeline = processing_pipeline
        self.knowledge_graph = knowledge_graph
        self.vector_store = vector_store
        self.handoff_registry = handoff_registry
        self.capability_registry = capability_registry
        self.config = config or {}
        
        # Create redundancy detector
        self.redundancy_detector = RedundancyDetector(
            vector_store=vector_store,
            knowledge_graph=knowledge_graph,
            config=self.config.get("detector_config", {})
        )
        
        # Create handoff managers for agents
        self.detection_handoff_manager = None
        self.consolidation_handoff_manager = None
        self.refactoring_handoff_manager = None
        
        # Create agents
        self.redundancy_manager = None
        self.consolidation_agent = None
        
        # Status
        self.initialized = False
        self.active = False
        self.active_tasks = {}
        
        logger.info("RedundancyIntegrationService created")
    
    async def initialize(self) -> bool:
        """
        Initialize the redundancy integration components.
        
        Returns:
            Initialization success status
        """
        try:
            # Create handoff managers
            self.detection_handoff_manager = HandoffManager(
                agent_id="redundancy_detection_agent",
                registry=self.handoff_registry,
                event_bus=self.agent_hub.event_bus
            )
            
            self.consolidation_handoff_manager = HandoffManager(
                agent_id="document_consolidation_agent",
                registry=self.handoff_registry,
                event_bus=self.agent_hub.event_bus
            )
            
            self.refactoring_handoff_manager = HandoffManager(
                agent_id="document_refactoring_agent",
                registry=self.handoff_registry,
                event_bus=self.agent_hub.event_bus
            )
            
            # Create redundancy manager
            self.redundancy_manager = RedundancyManager(
                detector=self.redundancy_detector,
                handoff_manager=self.detection_handoff_manager,
                config=self.config.get("manager_config", {})
            )
            
            # Create consolidation agent
            self.consolidation_agent = DocumentConsolidationAgent(
                agent_id="document_consolidation_agent",
                knowledge_graph=self.knowledge_graph,
                vector_store=self.vector_store,
                handoff_manager=self.consolidation_handoff_manager,
                llm_service=self.agent_hub.llm_service,
                config=self.config.get("consolidation_config", {})
            )
            
            # Register agent capabilities
            await self._register_agent_capabilities()
            
            # Register event handlers
            await self._register_event_handlers()
            
            # Start agents
            await self.consolidation_agent.start()
            
            self.initialized = True
            logger.info("RedundancyIntegrationService initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Error initializing RedundancyIntegrationService: {e}")
            return False
    
    async def start(self) -> bool:
        """
        Start the redundancy integration service.
        
        Returns:
            Start success status
        """
        if not self.initialized:
            success = await self.initialize()
            if not success:
                logger.error("Failed to initialize RedundancyIntegrationService")
                return False
        
        try:
            # Register with document processing pipeline
            self._register_with_pipeline()
            
            # Set active status
            self.active = True
            
            logger.info("RedundancyIntegrationService started")
            return True
        except Exception as e:
            logger.error(f"Error starting RedundancyIntegrationService: {e}")
            return False
    
    async def stop(self) -> bool:
        """
        Stop the redundancy integration service.
        
        Returns:
            Stop success status
        """
        try:
            # Unregister from document processing pipeline
            self._unregister_from_pipeline()
            
            # Set inactive status
            self.active = False
            
            logger.info("RedundancyIntegrationService stopped")
            return True
        except Exception as e:
            logger.error(f"Error stopping RedundancyIntegrationService: {e}")
            return False
    
    async def _register_agent_capabilities(self) -> None:
        """Register agent capabilities in the capability registry."""
        # Register redundancy detection agent capabilities
        detection_capabilities = self._create_detection_agent_capabilities()
        self.capability_registry.register_agent(detection_capabilities)
        
        # Register consolidation agent capabilities
        consolidation_capabilities = self._create_consolidation_agent_capabilities()
        self.capability_registry.register_agent(consolidation_capabilities)
        
        # Register refactoring agent capabilities (simplified for now)
        refactoring_capabilities = self._create_refactoring_agent_capabilities()
        self.capability_registry.register_agent(refactoring_capabilities)
        
        logger.info("Registered agent capabilities for redundancy management")
    
    def _create_detection_agent_capabilities(self) -> Any:
        """Create capabilities for redundancy detection agent."""
        from ..core.inter_agent_handoff import AgentCapability
        
        capability = AgentCapability(
            agent_id="redundancy_detection_agent",
            agent_type="analysis",
            agent_name="Redundancy Detection Agent"
        )
        
        # Add tasks
        capability.add_task(
            task_name="detect_redundancy",
            task_description="Detect redundancy in documentation",
            priority=HandoffPriority.MEDIUM,
            expected_duration=120  # seconds
        )
        
        capability.add_task(
            task_name="analyze_document_overlap",
            task_description="Analyze overlap between documents",
            priority=HandoffPriority.MEDIUM,
            expected_duration=90  # seconds
        )
        
        # Add document types
        capability.add_document_type("markdown")
        capability.add_document_type("html")
        capability.add_document_type("pdf")
        
        # Add handoff conditions
        capability.add_handoff_condition(
            condition_name="high_similarity_found",
            condition_description="High similarity with other documents detected",
            target_agent_id="document_consolidation_agent",
            condition_check=lambda doc, context: (
                context.metadata.get("max_similarity", 0) > 0.8
            )
        )
        
        capability.add_handoff_condition(
            condition_name="multiple_sections_overlap",
            condition_description="Multiple sections overlap with other documents",
            target_agent_id="document_refactoring_agent",
            condition_check=lambda doc, context: (
                len(context.metadata.get("overlapping_sections", [])) > 2
            )
        )
        
        return capability
    
    def _create_consolidation_agent_capabilities(self) -> Any:
        """Create capabilities for document consolidation agent."""
        from ..core.inter_agent_handoff import AgentCapability
        
        capability = AgentCapability(
            agent_id="document_consolidation_agent",
            agent_type="creation",
            agent_name="Document Consolidation Agent"
        )
        
        # Add tasks
        capability.add_task(
            task_name="merge_documents",
            task_description="Merge similar documents",
            priority=HandoffPriority.HIGH,
            expected_duration=300  # seconds
        )
        
        capability.add_task(
            task_name="consolidation_strategy",
            task_description="Develop consolidation strategy",
            priority=HandoffPriority.MEDIUM,
            expected_duration=240  # seconds
        )
        
        capability.add_task(
            task_name="create_documentation_hub",
            task_description="Create documentation hub",
            priority=HandoffPriority.MEDIUM,
            expected_duration=600  # seconds
        )
        
        # Add document types
        capability.add_document_type("markdown")
        capability.add_document_type("html")
        
        # Add handoff conditions
        capability.add_handoff_condition(
            condition_name="needs_human_review",
            condition_description="Consolidated document requires human review",
            target_agent_id="human_interface",
            condition_check=lambda doc, context: (
                context.metadata.get("consolidated_doc_size", 0) > 10000
            )
        )
        
        capability.add_handoff_condition(
            condition_name="needs_technical_validation",
            condition_description="Technical content needs validation",
            target_agent_id="technical_validator_agent",
            condition_check=lambda doc, context: (
                "code" in doc.content.lower() or 
                "api" in doc.content.lower() or
                "function" in doc.content.lower()
            )
        )
        
        return capability
    
    def _create_refactoring_agent_capabilities(self) -> Any:
        """Create capabilities for document refactoring agent."""
        from ..core.inter_agent_handoff import AgentCapability
        
        capability = AgentCapability(
            agent_id="document_refactoring_agent",
            agent_type="editing",
            agent_name="Document Refactoring Agent"
        )
        
        # Add tasks
        capability.add_task(
            task_name="refactor_segments",
            task_description="Refactor duplicate segments in documents",
            priority=HandoffPriority.MEDIUM,
            expected_duration=180  # seconds
        )
        
        capability.add_task(
            task_name="reorganize_section",
            task_description="Reorganize overlapping sections",
            priority=HandoffPriority.MEDIUM,
            expected_duration=240  # seconds
        )
        
        capability.add_task(
            task_name="add_cross_references",
            task_description="Add cross-references between documents",
            priority=HandoffPriority.LOW,
            expected_duration=120  # seconds
        )
        
        # Add document types
        capability.add_document_type("markdown")
        capability.add_document_type("html")
        
        return capability
    
    async def _register_event_handlers(self) -> None:
        """Register event handlers for redundancy-related events."""
        event_bus = self.agent_hub.event_bus
        if not event_bus:
            logger.warning("No event bus available for event registration")
            return
        
        # Register handlers for document events
        await event_bus.subscribe(
            "document.created",
            self._handle_document_created
        )
        
        await event_bus.subscribe(
            "document.updated",
            self._handle_document_updated
        )
        
        # Register handlers for handoff events
        await self.detection_handoff_manager.register_callback(
            "handoff_request",
            self._handle_detection_handoff_request
        )
        
        await self.consolidation_handoff_manager.register_callback(
            "handoff_request",
            self._handle_consolidation_handoff_request
        )
        
        await self.refactoring_handoff_manager.register_callback(
            "handoff_request",
            self._handle_refactoring_handoff_request
        )
        
        logger.info("Registered event handlers for redundancy management")
    
    def _register_with_pipeline(self) -> None:
        """Register with the document processing pipeline."""
        # Register post-processing hook to perform redundancy detection
        if hasattr(self.processing_pipeline, 'add_post_processing_hook'):
            self.processing_pipeline.add_post_processing_hook(
                "redundancy_detection",
                self._document_post_processing_hook
            )
            logger.info("Registered with document processing pipeline")
        else:
            logger.warning("Document processing pipeline does not support hooks")
    
    def _unregister_from_pipeline(self) -> None:
        """Unregister from the document processing pipeline."""
        # Unregister post-processing hook
        if hasattr(self.processing_pipeline, 'remove_post_processing_hook'):
            self.processing_pipeline.remove_post_processing_hook(
                "redundancy_detection"
            )
            logger.info("Unregistered from document processing pipeline")
        else:
            logger.warning("Document processing pipeline does not support hooks")
    
    async def _document_post_processing_hook(self, document: Document, 
                                           context: Dict[str, Any]) -> Document:
        """
        Hook called after document processing to detect redundancy.
        
        Args:
            document: Processed document
            context: Processing context
            
        Returns:
            Document, possibly updated
        """
        if not self.active:
            logger.debug("Redundancy detection inactive, skipping")
            return document
        
        # Skip redundancy detection in certain cases
        if context.get("skip_redundancy_detection", False):
            logger.debug(f"Skipping redundancy detection for {document.id} as requested")
            return document
        
        # Check if this is a system document
        if document.document_type.startswith("system_"):
            logger.debug(f"Skipping redundancy detection for system document {document.id}")
            return document
        
        try:
            # Start redundancy detection in background
            task_id = f"redundancy_{document.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            # Track task
            self.active_tasks[task_id] = {
                "document_id": document.id,
                "started_at": datetime.now().isoformat(),
                "status": "pending"
            }
            
            # Run redundancy detection
            asyncio.create_task(
                self._run_redundancy_detection(document, task_id)
            )
            
            logger.info(f"Scheduled redundancy detection for {document.id}")
            
            return document
        except Exception as e:
            logger.error(f"Error in redundancy detection hook: {e}")
            return document
    
    async def _run_redundancy_detection(self, document: Document, task_id: str) -> None:
        """
        Run redundancy detection for a document.
        
        Args:
            document: Document to check
            task_id: Task identifier
        """
        try:
            # Update task status
            self.active_tasks[task_id]["status"] = "in_progress"
            
            # Run redundancy detection
            result = await self.redundancy_manager.process_document(document)
            
            # Update task status
            self.active_tasks[task_id]["status"] = "completed"
            self.active_tasks[task_id]["completed_at"] = datetime.now().isoformat()
            self.active_tasks[task_id]["result"] = {
                "similar_docs_count": len(result.similar_docs),
                "duplicate_segments_count": len(result.duplicate_segments),
                "consolidation_candidates_count": len(result.consolidation_candidates),
                "actions_count": len(result.recommended_actions)
            }
            
            # Publish result event
            if self.agent_hub.event_bus:
                await self.agent_hub.event_bus.publish(
                    "redundancy.detected",
                    {
                        "document_id": document.id,
                        "similar_docs_count": len(result.similar_docs),
                        "duplicate_segments_count": len(result.duplicate_segments),
                        "actions_count": len(result.recommended_actions)
                    }
                )
            
            logger.info(f"Completed redundancy detection for {document.id}")
            
        except Exception as e:
            # Update task status
            self.active_tasks[task_id]["status"] = "failed"
            self.active_tasks[task_id]["error"] = str(e)
            
            logger.error(f"Error in redundancy detection for {document.id}: {e}")
    
    async def _handle_document_created(self, event: Any) -> None:
        """
        Handle document creation event.
        
        Args:
            event: Document created event
        """
        if not self.active:
            return
        
        try:
            # Extract document info from event
            document_id = event.data.get("document_id")
            
            if not document_id:
                return
                
            # Get the document from knowledge graph
            doc_data = await self.knowledge_graph.get_document(document_id)
            
            if not doc_data:
                logger.warning(f"Document {document_id} not found in knowledge graph")
                return
            
            # Create document object
            document = Document(
                id=document_id,
                title=doc_data.get("title", "Untitled"),
                content=doc_data.get("content", ""),
                document_type=doc_data.get("document_type", "text")
            )
            
            # Schedule redundancy detection
            task_id = f"redundancy_{document_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            # Track task
            self.active_tasks[task_id] = {
                "document_id": document_id,
                "started_at": datetime.now().isoformat(),
                "status": "pending",
                "trigger": "document.created"
            }
            
            # Run redundancy detection
            asyncio.create_task(
                self._run_redundancy_detection(document, task_id)
            )
            
            logger.info(f"Scheduled redundancy detection for newly created document {document_id}")
            
        except Exception as e:
            logger.error(f"Error handling document created event: {e}")
    
    async def _handle_document_updated(self, event: Any) -> None:
        """
        Handle document update event.
        
        Args:
            event: Document updated event
        """
        if not self.active:
            return
        
        try:
            # Extract document info from event
            document_id = event.data.get("document_id")
            
            if not document_id:
                return
                
            # Check if document is eligible for redundancy detection
            skip_types = self.config.get("skip_document_types", [
                "system_", "temp_", "draft_", "consolidated_"
            ])
            
            doc_data = await self.knowledge_graph.get_document(document_id)
            
            if not doc_data:
                logger.warning(f"Document {document_id} not found in knowledge graph")
                return
            
            doc_type = doc_data.get("document_type", "")
            
            if any(doc_type.startswith(skip) for skip in skip_types):
                logger.debug(f"Skipping redundancy detection for {doc_type} document {document_id}")
                return
            
            # Create document object
            document = Document(
                id=document_id,
                title=doc_data.get("title", "Untitled"),
                content=doc_data.get("content", ""),
                document_type=doc_type
            )
            
            # Schedule redundancy detection
            task_id = f"redundancy_{document_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            # Track task
            self.active_tasks[task_id] = {
                "document_id": document_id,
                "started_at": datetime.now().isoformat(),
                "status": "pending",
                "trigger": "document.updated"
            }
            
            # Run redundancy detection
            asyncio.create_task(
                self._run_redundancy_detection(document, task_id)
            )
            
            logger.info(f"Scheduled redundancy detection for updated document {document_id}")
            
        except Exception as e:
            logger.error(f"Error handling document updated event: {e}")
    
    async def _handle_detection_handoff_request(self, request: Any) -> None:
        """
        Handle handoff request to redundancy detection agent.
        
        Args:
            request: Handoff request
        """
        if not self.active:
            # Reject handoff if service is not active
            await self.detection_handoff_manager.reject_handoff(
                request.id,
                "Redundancy detection service is not active"
            )
            return
        
        try:
            # Accept the handoff
            await self.detection_handoff_manager.accept_handoff(request.id)
            
            # Extract document info
            document_id = request.context.document_id
            
            # Get the document
            doc_data = await self.knowledge_graph.get_document(document_id)
            
            if not doc_data:
                await self.detection_handoff_manager.complete_handoff(
                    request.id,
                    {"status": "failed", "reason": "Document not found"},
                    status=HandoffStatus.FAILED
                )
                return
            
            # Create document object
            document = Document(
                id=document_id,
                title=doc_data.get("title", "Untitled"),
                content=doc_data.get("content", ""),
                document_type=doc_data.get("document_type", "text")
            )
            
            # Run redundancy detection
            result = await self.redundancy_detector.detect_redundancy(document)
            
            # Complete the handoff
            await self.detection_handoff_manager.complete_handoff(
                request.id,
                {
                    "similar_docs_count": len(result.similar_docs),
                    "duplicate_segments_count": len(result.duplicate_segments),
                    "consolidation_candidates_count": len(result.consolidation_candidates),
                    "actions_count": len(result.recommended_actions),
                    "recommended_actions": result.recommended_actions
                }
            )
            
            logger.info(f"Completed detection handoff for {document_id}")
            
        except Exception as e:
            logger.error(f"Error handling detection handoff: {e}")
            
            # Complete with error
            try:
                await self.detection_handoff_manager.complete_handoff(
                    request.id,
                    {"status": "failed", "reason": str(e)},
                    status=HandoffStatus.FAILED
                )
            except Exception as complete_error:
                logger.error(f"Error completing handoff with failure: {complete_error}")
    
    async def _handle_consolidation_handoff_request(self, request: Any) -> None:
        """
        Handle handoff request to consolidation agent.
        
        Args:
            request: Handoff request
        """
        if not self.active or not self.consolidation_agent:
            # Reject handoff if service is not active
            await self.consolidation_handoff_manager.reject_handoff(
                request.id,
                "Consolidation agent is not active"
            )
            return
        
        try:
            # Process handoff using consolidation agent
            result = await self.consolidation_agent.process_handoff(
                handoff_id=request.id,
                handoff_context=request.context,
                task=request.task
            )
            
            logger.info(f"Processed consolidation handoff {request.id}")
            
        except Exception as e:
            logger.error(f"Error handling consolidation handoff: {e}")
            
            # Complete with error
            try:
                await self.consolidation_handoff_manager.complete_handoff(
                    request.id,
                    {"status": "failed", "reason": str(e)},
                    status=HandoffStatus.FAILED
                )
            except Exception as complete_error:
                logger.error(f"Error completing handoff with failure: {complete_error}")
    
    async def _handle_refactoring_handoff_request(self, request: Any) -> None:
        """
        Handle handoff request to refactoring agent.
        
        Args:
            request: Handoff request
        """
        # Note: Refactoring agent not implemented yet, so accept and complete with message
        try:
            # Accept the handoff
            await self.refactoring_handoff_manager.accept_handoff(request.id)
            
            # Complete with info message
            await self.refactoring_handoff_manager.complete_handoff(
                request.id,
                {
                    "status": "partial",
                    "message": "Document refactoring agent not fully implemented yet. Task recorded for future processing."
                }
            )
            
            logger.info(f"Accepted refactoring handoff {request.id}")
            
        except Exception as e:
            logger.error(f"Error handling refactoring handoff: {e}")
            
            # Complete with error
            try:
                await self.refactoring_handoff_manager.complete_handoff(
                    request.id,
                    {"status": "failed", "reason": str(e)},
                    status=HandoffStatus.FAILED
                )
            except Exception as complete_error:
                logger.error(f"Error completing handoff with failure: {complete_error}")
    
    async def get_status(self) -> Dict[str, Any]:
        """
        Get the current status of the redundancy integration service.
        
        Returns:
            Status information
        """
        # Get counts of active tasks by status
        task_counts = {}
        for task in self.active_tasks.values():
            status = task.get("status", "unknown")
            if status not in task_counts:
                task_counts[status] = 0
            task_counts[status] += 1
        
        # Get agent status
        agents_status = {
            "redundancy_detection_agent": {
                "active": self.active,
                "initialized": self.initialized
            },
            "document_consolidation_agent": {
                "active": self.active and self.consolidation_agent is not None,
                "task_count": len(self.consolidation_agent.active_tasks) if self.consolidation_agent else 0
            }
        }
        
        # Return status
        return {
            "service_active": self.active,
            "initialized": self.initialized,
            "tasks": {
                "total": len(self.active_tasks),
                "by_status": task_counts
            },
            "agents": agents_status,
            "config": {
                "similarity_threshold": self.redundancy_detector.similarity_threshold,
                "human_review_required": self.config.get("human_review_required", True)
            }
        }
    
    async def run_redundancy_check(self, document_id: str) -> Dict[str, Any]:
        """
        Run a redundancy check for a specific document.
        
        Args:
            document_id: Document ID to check
            
        Returns:
            Redundancy check results
        """
        try:
            # Get the document
            doc_data = await self.knowledge_graph.get_document(document_id)
            
            if not doc_data:
                return {"status": "error", "message": "Document not found"}
            
            # Create document object
            document = Document(
                id=document_id,
                title=doc_data.get("title", "Untitled"),
                content=doc_data.get("content", ""),
                document_type=doc_data.get("document_type", "text")
            )
            
            # Run redundancy detection
            task_id = f"redundancy_{document_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            # Track task
            self.active_tasks[task_id] = {
                "document_id": document_id,
                "started_at": datetime.now().isoformat(),
                "status": "in_progress",
                "trigger": "manual"
            }
            
            # Run detection
            result = await self.redundancy_detector.detect_redundancy(document)
            
            # Update task status
            self.active_tasks[task_id]["status"] = "completed"
            self.active_tasks[task_id]["completed_at"] = datetime.now().isoformat()
            self.active_tasks[task_id]["result"] = {
                "similar_docs_count": len(result.similar_docs),
                "duplicate_segments_count": len(result.duplicate_segments),
                "consolidation_candidates_count": len(result.consolidation_candidates),
                "actions_count": len(result.recommended_actions)
            }
            
            # Return results
            return {
                "status": "success",
                "document_id": document_id,
                "document_title": document.title,
                "results": {
                    "similar_docs": [
                        {
                            "id": doc["id"],
                            "title": doc["title"],
                            "similarity_score": doc["similarity_score"]
                        }
                        for doc in result.similar_docs
                    ],
                    "duplicate_segments_count": len(result.duplicate_segments),
                    "consolidation_candidates_count": len(result.consolidation_candidates),
                    "recommended_actions": [
                        {
                            "action_type": action["action_type"],
                            "priority": action["priority"],
                            "description": action["description"]
                        }
                        for action in result.recommended_actions
                    ]
                }
            }
            
        except Exception as e:
            logger.error(f"Error running redundancy check for {document_id}: {e}")
            return {"status": "error", "message": str(e)}
    
    async def consolidate_documents(self, source_document_id: str, 
                                 target_document_ids: List[str]) -> Dict[str, Any]:
        """
        Consolidate multiple documents into one.
        
        Args:
            source_document_id: Source document ID
            target_document_ids: Target document IDs to merge with source
            
        Returns:
            Consolidation results
        """
        if not self.active or not self.consolidation_agent:
            return {"status": "error", "message": "Consolidation agent is not active"}
        
        try:
            # Get source document
            doc_data = await self.knowledge_graph.get_document(source_document_id)
            
            if not doc_data:
                return {"status": "error", "message": "Source document not found"}
            
            # Create document object
            document = Document(
                id=source_document_id,
                title=doc_data.get("title", "Untitled"),
                content=doc_data.get("content", ""),
                document_type=doc_data.get("document_type", "text")
            )
            
            # Create context
            context = HandoffContext(
                document_id=source_document_id,
                document_type=document.document_type,
                metadata={
                    "actions": [
                        {
                            "action_type": "merge_documents",
                            "priority": "high",
                            "description": f"Merge document '{document.title}' with target documents",
                            "target_document_id": target_id
                        }
                        for target_id in target_document_ids
                    ]
                }
            )
            
            # Create handoff request
            handoff_id = await self.consolidation_handoff_manager.initiate_handoff(
                recipient_id="document_consolidation_agent",
                task=f"Merge document '{document.title}' with {len(target_document_ids)} target documents",
                context=context,
                priority=HandoffPriority.HIGH
            )
            
            # Return tracking information
            return {
                "status": "initiated",
                "handoff_id": handoff_id,
                "source_document_id": source_document_id,
                "target_document_ids": target_document_ids,
                "message": f"Consolidation initiated with handoff ID {handoff_id}"
            }
            
        except Exception as e:
            logger.error(f"Error consolidating documents: {e}")
            return {"status": "error", "message": str(e)}