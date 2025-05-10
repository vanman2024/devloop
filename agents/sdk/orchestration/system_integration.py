#!/usr/bin/env python3
"""
System Integration for SDK-First Architecture

This module provides integration utilities to connect the SDK components with
the broader Devloop platform, enabling seamless interaction between the
prompt manager, knowledge base, and other system components.
"""

import os
import sys
import json
import asyncio
import logging
import importlib.util
from pathlib import Path
from typing import Dict, List, Any, Optional, Union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("sdk_system_integration")

# Add parent directories to path for imports
script_dir = os.path.dirname(os.path.abspath(__file__))
sdk_dir = os.path.abspath(os.path.join(script_dir, ".."))
if sdk_dir not in sys.path:
    sys.path.append(sdk_dir)

try:
    from utils.activity_logger import log_prompt_activity
except ImportError:
    # Fallback for when activity logger is not available
    def log_prompt_activity(subtype: str, details: Dict[str, Any], 
                         title: Optional[str] = None, 
                         description: Optional[str] = None) -> None:
        """Fallback activity logger that just logs to the system_integration logger."""
        logger.debug(f"Activity: {subtype} - {title or 'No title'} - {details}")


# System paths
DEFAULT_PATHS = {
    "system_core": "/mnt/c/Users/angel/Devloop/backups/system-core-backup/system-core",
    "config": "/mnt/c/Users/angel/Devloop/backups/system-core-backup/system-core/config",
    "memory": "/mnt/c/Users/angel/Devloop/backups/system-core-backup/system-core/memory",
    "scripts": "/mnt/c/Users/angel/Devloop/backups/system-core-backup/system-core/scripts",
    "templates": "/mnt/c/Users/angel/Devloop/agents/templates"
}


class SDKSystemIntegration:
    """
    System integration layer for the SDK-First Architecture.
    
    This class provides integration between the SDK components and the broader
    Devloop platform, including connections to memory, tools, and AI services.
    """
    
    def __init__(self, 
                config_path: Optional[str] = None, 
                paths: Optional[Dict[str, str]] = None):
        """
        Initialize the system integration layer.
        
        Args:
            config_path: Path to configuration file (optional)
            paths: Dictionary of system paths (optional)
        """
        # Initialize paths
        self.paths = DEFAULT_PATHS.copy()
        if paths:
            self.paths.update(paths)
        
        # Load configuration
        self.config = self._load_config(config_path)
        
        # Initialize components
        self.prompt_manager = None
        self.knowledge_base = None
        self.tools_registry = None
        self.ai_service = None
        self.memory_manager = None
        self.workflow_manager = None
        
        # Try to import memory manager if available
        try:
            memory_manager_path = os.path.join(self.paths["memory"], "manager", "memory_manager.py")
            if os.path.exists(memory_manager_path):
                spec = importlib.util.spec_from_file_location("memory_manager", memory_manager_path)
                memory_manager = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(memory_manager)
                self.memory_manager = memory_manager.MemoryManager()
                logger.info("Memory manager loaded successfully")
            else:
                logger.warning(f"Memory manager not found at {memory_manager_path}")
        except Exception as e:
            logger.error(f"Error loading memory manager: {e}")
        
        # Log initialization
        log_prompt_activity("init_system_integration", {
            "config_path": config_path,
            "memory_manager_loaded": self.memory_manager is not None
        })
    
    def _load_config(self, config_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Load configuration from file.
        
        Args:
            config_path: Path to configuration file
            
        Returns:
            Configuration dictionary
        """
        # Try specified config path first
        if config_path and os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    config = json.load(f)
                logger.info(f"Loaded configuration from {config_path}")
                return config
            except Exception as e:
                logger.error(f"Error loading config from {config_path}: {e}")
        
        # Try default locations
        config_locations = [
            os.path.join(self.paths["config"], "devloop-config.json"),
            os.path.join(self.paths["config"], "sdk-config.json"),
            os.path.join(sdk_dir, "config", "sdk-config.json"),
            os.path.join(sdk_dir, "config", "system-integration.json")
        ]
        
        for path in config_locations:
            if os.path.exists(path):
                try:
                    with open(path, 'r') as f:
                        config = json.load(f)
                    logger.info(f"Loaded configuration from {path}")
                    return config
                except Exception as e:
                    logger.error(f"Error loading config from {path}: {e}")
        
        # If no config found, use defaults
        logger.warning("No configuration file found, using defaults")
        return {
            "sdk": {
                "enabled": True,
                "auto_register_components": True,
                "default_models": {
                    "openai": "gpt-4o",
                    "claude": "claude-3-opus-20240229"
                }
            }
        }
    
    async def initialize(self) -> bool:
        """
        Initialize all system components.
        
        Returns:
            Success status
        """
        logger.info("Initializing SDK system integration")
        
        # Initialize prompt manager
        success = await self.initialize_prompt_manager()
        
        # Only proceed if prompt manager initialized successfully
        if not success:
            logger.error("Failed to initialize prompt manager, stopping initialization")
            return False
        
        # Initialize knowledge base
        await self.initialize_knowledge_base()
        
        # Initialize tools registry
        await self.initialize_tools_registry()
        
        # Initialize AI service
        await self.initialize_ai_service()
        
        # Initialize workflow manager
        await self.initialize_workflow_manager()
        
        # Register components with the system
        if self.config.get("sdk", {}).get("auto_register_components", True):
            await self.register_components()
        
        logger.info("SDK system integration initialized")
        
        # Log completion of initialization
        log_prompt_activity("system_integration_initialized", {
            "prompt_manager": self.prompt_manager is not None,
            "knowledge_base": self.knowledge_base is not None,
            "tools_registry": self.tools_registry is not None,
            "ai_service": self.ai_service is not None,
            "workflow_manager": self.workflow_manager is not None
        })
        
        return True
    
    async def initialize_prompt_manager(self) -> bool:
        """
        Initialize the prompt manager component.
        
        Returns:
            Success status
        """
        logger.info("Initializing prompt manager")
        
        try:
            # Try to import AdaptivePromptManager
            from utils.prompt_manager import AdaptivePromptManager
            
            # Get configuration
            config_path = self.config.get("prompt_manager", {}).get("config_path")
            if not config_path:
                config_path = os.path.join(sdk_dir, "config", "prompt_manager_config.json")
            
            # Create prompt manager
            self.prompt_manager = AdaptivePromptManager(config_path=config_path)
            
            logger.info("Prompt manager initialized successfully")
            
            # Log activity
            log_prompt_activity("init_prompt_manager", {
                "config_path": config_path,
                "templates_loaded": len(self.prompt_manager.template_manager.templates)
            })
            
            return True
            
        except Exception as e:
            logger.error(f"Error initializing prompt manager: {e}")
            
            # Log activity
            log_prompt_activity("init_prompt_manager_error", {
                "error": str(e)
            })
            
            return False
    
    async def initialize_knowledge_base(self) -> bool:
        """
        Initialize the knowledge base component.
        
        Returns:
            Success status
        """
        logger.info("Initializing knowledge base")
        
        try:
            # Try to import knowledge base adapter
            from adapters.knowledge_base_adapter import KnowledgeBaseFactory
            
            # Get configuration
            kb_config = self.config.get("knowledge_base", {})
            adapter_type = kb_config.get("adapter_type", "knowledge_graph")
            
            # Create adapter
            self.knowledge_base = KnowledgeBaseFactory.create_adapter(adapter_type, kb_config)
            
            logger.info(f"Knowledge base initialized with adapter type: {adapter_type}")
            
            # Log activity
            log_prompt_activity("init_knowledge_base", {
                "adapter_type": adapter_type,
                "config": kb_config
            })
            
            return True
            
        except Exception as e:
            logger.error(f"Error initializing knowledge base: {e}")
            
            # Log activity
            log_prompt_activity("init_knowledge_base_error", {
                "error": str(e)
            })
            
            return False
    
    async def initialize_tools_registry(self) -> bool:
        """
        Initialize the tools registry component.
        
        Returns:
            Success status
        """
        logger.info("Initializing tools registry")
        
        try:
            # Try to import tools registry
            tools_module_locations = [
                os.path.join(sdk_dir, "tools", "registry", "tool_registry.py"),
                os.path.join(self.paths["system_core"], "tools", "registry", "tool_registry.py")
            ]
            
            tools_module = None
            for location in tools_module_locations:
                if os.path.exists(location):
                    spec = importlib.util.spec_from_file_location("tool_registry", location)
                    tools_module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(tools_module)
                    break
            
            if not tools_module:
                logger.warning("Tools registry module not found")
                return False
            
            # Create tools registry
            self.tools_registry = tools_module.ToolRegistry()
            
            # Load tools
            tools_dir = self.config.get("tools", {}).get("tools_dir")
            if tools_dir and os.path.exists(tools_dir):
                await self.tools_registry.load_tools(tools_dir)
            
            logger.info("Tools registry initialized successfully")
            
            # Log activity
            log_prompt_activity("init_tools_registry", {
                "tools_loaded": len(self.tools_registry.tools) if hasattr(self.tools_registry, "tools") else 0
            })
            
            return True
            
        except Exception as e:
            logger.error(f"Error initializing tools registry: {e}")
            
            # Log activity
            log_prompt_activity("init_tools_registry_error", {
                "error": str(e)
            })
            
            return False
    
    async def initialize_ai_service(self) -> bool:
        """
        Initialize the AI service component.
        
        Returns:
            Success status
        """
        logger.info("Initializing AI service")
        
        try:
            # Try to import AI service adapter
            from adapters.ai_service_adapter import AIServiceAdapter
            
            # Get configuration
            ai_config = self.config.get("ai_service", {})
            
            # Create AI service
            self.ai_service = AIServiceAdapter(ai_config)
            
            logger.info("AI service initialized successfully")
            
            # Log activity
            log_prompt_activity("init_ai_service", {
                "providers": ai_config.get("providers", ["openai", "claude"])
            })
            
            return True
            
        except Exception as e:
            logger.error(f"Error initializing AI service: {e}")
            
            # Log activity
            log_prompt_activity("init_ai_service_error", {
                "error": str(e)
            })
            
            return False
    
    async def initialize_workflow_manager(self) -> bool:
        """
        Initialize the workflow manager component.
        
        Returns:
            Success status
        """
        logger.info("Initializing workflow manager")
        
        try:
            # Get configuration
            workflow_config = self.config.get("workflow", {})
            
            # Try to import workflow manager
            workflow_module_path = workflow_config.get("module_path")
            if not workflow_module_path:
                workflow_module_path = os.path.join(sdk_dir, "orchestration", "workflow_manager.py")
            
            if os.path.exists(workflow_module_path):
                spec = importlib.util.spec_from_file_location("workflow_manager", workflow_module_path)
                workflow_module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(workflow_module)
                
                # Create workflow manager
                self.workflow_manager = workflow_module.WorkflowManager(workflow_config)
                
                logger.info("Workflow manager initialized successfully")
                
                # Log activity
                log_prompt_activity("init_workflow_manager", {
                    "config": workflow_config
                })
                
                return True
            else:
                logger.warning(f"Workflow manager module not found at {workflow_module_path}")
                return False
            
        except Exception as e:
            logger.error(f"Error initializing workflow manager: {e}")
            
            # Log activity
            log_prompt_activity("init_workflow_manager_error", {
                "error": str(e)
            })
            
            return False
    
    async def register_components(self) -> bool:
        """
        Register all components with the system.
        
        Returns:
            Success status
        """
        logger.info("Registering components with the system")
        
        # Register components with memory manager if available
        if self.memory_manager:
            try:
                # Register prompt manager
                if self.prompt_manager:
                    self.memory_manager.update_memory_section("sdk", {
                        "prompt_manager": {
                            "status": "active",
                            "templates_count": len(self.prompt_manager.template_manager.templates),
                            "updated_at": time.time()
                        }
                    })
                
                # Register knowledge base
                if self.knowledge_base:
                    self.memory_manager.update_memory_section("sdk", {
                        "knowledge_base": {
                            "status": "active",
                            "adapter_type": self.knowledge_base.__class__.__name__,
                            "updated_at": time.time()
                        }
                    })
                
                # Register tools registry
                if self.tools_registry:
                    self.memory_manager.update_memory_section("sdk", {
                        "tools_registry": {
                            "status": "active",
                            "tools_count": len(self.tools_registry.tools) if hasattr(self.tools_registry, "tools") else 0,
                            "updated_at": time.time()
                        }
                    })
                
                # Register AI service
                if self.ai_service:
                    self.memory_manager.update_memory_section("sdk", {
                        "ai_service": {
                            "status": "active",
                            "providers": self.ai_service.providers if hasattr(self.ai_service, "providers") else [],
                            "updated_at": time.time()
                        }
                    })
                
                # Register workflow manager
                if self.workflow_manager:
                    self.memory_manager.update_memory_section("sdk", {
                        "workflow_manager": {
                            "status": "active",
                            "workflows_count": len(self.workflow_manager.workflows) if hasattr(self.workflow_manager, "workflows") else 0,
                            "updated_at": time.time()
                        }
                    })
                
                logger.info("Components registered with memory manager")
                
                # Log activity
                log_prompt_activity("register_components", {
                    "prompt_manager": self.prompt_manager is not None,
                    "knowledge_base": self.knowledge_base is not None,
                    "tools_registry": self.tools_registry is not None,
                    "ai_service": self.ai_service is not None,
                    "workflow_manager": self.workflow_manager is not None
                })
                
                return True
                
            except Exception as e:
                logger.error(f"Error registering components with memory manager: {e}")
                
                # Log activity
                log_prompt_activity("register_components_error", {
                    "error": str(e)
                })
                
                return False
        
        # No memory manager available
        logger.warning("Memory manager not available for component registration")
        return False
    
    async def register_natural_language_workflow(self) -> str:
        """
        Register a workflow for natural language processing.
        
        Returns:
            Workflow ID
        """
        if not self.workflow_manager:
            logger.error("Workflow manager not initialized")
            return ""
        
        logger.info("Registering natural language workflow")
        
        # Look for intent recognition
        intent_recognizer = None
        if hasattr(self.prompt_manager, "intent_recognizer"):
            intent_recognizer = self.prompt_manager.intent_recognizer
        
        # Create workflow
        try:
            workflow_id = await self.workflow_manager.create_workflow(
                name="Natural Language Processing",
                description="Process natural language commands and requests"
            )
            
            # Add intent recognition step
            intent_step = await self.workflow_manager.add_workflow_step(
                workflow_id=workflow_id,
                name="Intent Recognition",
                description="Identify user intent from natural language",
                component="intent_recognizer",
                method="recognize_intent",
                input_mapping={"text": "inputs.text"},
                output_mapping={"intent": "intent", "parameters": "parameters"}
            )
            
            # Add context resolution step
            context_step = await self.workflow_manager.add_workflow_step(
                workflow_id=workflow_id,
                name="Context Resolution",
                description="Resolve context for the identified intent",
                component="context_manager",
                method="extract_relevant_context",
                input_mapping={
                    "query": "steps.intent.intent.intent_type"
                },
                output_mapping={"context": "context"}
            )
            
            # Add action generation step
            action_step = await self.workflow_manager.add_workflow_step(
                workflow_id=workflow_id,
                name="Action Generation",
                description="Generate actions based on intent and context",
                component="intent_processor",
                method="process_intent",
                input_mapping={
                    "intent": "steps.intent.intent"
                },
                output_mapping={"result": "result"}
            )
            
            # Connect steps
            await self.workflow_manager.connect_workflow_steps(
                workflow_id=workflow_id,
                from_step=intent_step,
                to_step=context_step
            )
            
            await self.workflow_manager.connect_workflow_steps(
                workflow_id=workflow_id,
                from_step=context_step,
                to_step=action_step
            )
            
            # Set entry and exit points
            await self.workflow_manager.set_entry_point(
                workflow_id=workflow_id,
                step_id=intent_step
            )
            
            await self.workflow_manager.set_exit_point(
                workflow_id=workflow_id,
                step_id=action_step
            )
            
            logger.info(f"Natural language workflow registered with ID: {workflow_id}")
            
            # Log activity
            log_prompt_activity("register_nl_workflow", {
                "workflow_id": workflow_id,
                "steps": ["intent_recognition", "context_resolution", "action_generation"]
            })
            
            return workflow_id
            
        except Exception as e:
            logger.error(f"Error registering natural language workflow: {e}")
            
            # Log activity
            log_prompt_activity("register_nl_workflow_error", {
                "error": str(e)
            })
            
            return ""
    
    async def process_natural_language(self, text: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Process natural language input.
        
        Args:
            text: Natural language text to process
            context: Optional context information
            
        Returns:
            Processing results
        """
        logger.info(f"Processing natural language: {text[:50]}...")
        
        # Check if we have a workflow manager with NL workflow
        if self.workflow_manager:
            # Find or register NL workflow
            workflow_id = None
            for wf_id in self.workflow_manager.workflows:
                workflow = self.workflow_manager.workflows[wf_id]
                if workflow["name"] == "Natural Language Processing":
                    workflow_id = wf_id
                    break
            
            # Register workflow if not found
            if not workflow_id:
                workflow_id = await self.register_natural_language_workflow()
            
            # Execute workflow if available
            if workflow_id:
                try:
                    # Prepare inputs
                    inputs = {
                        "text": text
                    }
                    
                    # Prepare context
                    if not context:
                        context = {}
                    
                    # Execute workflow
                    result = await self.workflow_manager.execute_workflow(
                        workflow_id=workflow_id,
                        inputs=inputs,
                        context=context
                    )
                    
                    # Log activity
                    log_prompt_activity("process_nl_workflow", {
                        "text_preview": text[:50] + "..." if len(text) > 50 else text,
                        "workflow_id": workflow_id,
                        "success": result.get("success", False)
                    })
                    
                    return result
                    
                except Exception as e:
                    logger.error(f"Error executing natural language workflow: {e}")
                    
                    # Log activity
                    log_prompt_activity("process_nl_workflow_error", {
                        "error": str(e)
                    })
                    
                    return {
                        "success": False,
                        "error": str(e)
                    }
        
        # No workflow manager, try direct processing with prompt manager
        if self.prompt_manager and hasattr(self.prompt_manager, "process_intent"):
            try:
                result = self.prompt_manager.process_intent(text)
                
                # Log activity
                log_prompt_activity("process_nl_direct", {
                    "text_preview": text[:50] + "..." if len(text) > 50 else text,
                    "success": result.get("success", False)
                })
                
                return result
                
            except Exception as e:
                logger.error(f"Error processing natural language directly: {e}")
                
                # Log activity
                log_prompt_activity("process_nl_direct_error", {
                    "error": str(e)
                })
                
                return {
                    "success": False,
                    "error": str(e)
                }
        
        # No processing capability available
        logger.error("No natural language processing capability available")
        return {
            "success": False,
            "error": "No natural language processing capability available"
        }
    
    async def connect_to_feature_registry(self) -> bool:
        """
        Connect to the feature registry and register SDK components as features.
        
        Returns:
            Success status
        """
        logger.info("Connecting to feature registry")
        
        try:
            # Try to load feature registry
            registry_path = os.path.join(self.paths["memory"], "feature-registry.json")
            
            if not os.path.exists(registry_path):
                logger.warning(f"Feature registry not found at {registry_path}")
                return False
            
            # Load registry
            with open(registry_path, 'r') as f:
                registry = json.load(f)
            
            # Define SDK features
            sdk_features = [
                {
                    "id": "sdk-prompt-manager",
                    "name": "SDK Prompt Manager",
                    "description": "Adaptive prompt management system with templates and context awareness",
                    "type": "core",
                    "status": "active" if self.prompt_manager else "inactive",
                    "tags": ["sdk", "ai", "prompt", "template"]
                },
                {
                    "id": "sdk-knowledge-base",
                    "name": "SDK Knowledge Base",
                    "description": "Knowledge base integration with graph and vector storage",
                    "type": "core",
                    "status": "active" if self.knowledge_base else "inactive",
                    "tags": ["sdk", "knowledge", "graph", "vector"]
                },
                {
                    "id": "sdk-intent-recognition",
                    "name": "SDK Intent Recognition",
                    "description": "Natural language intent recognition and parameter extraction",
                    "type": "core",
                    "status": "active" if hasattr(self.prompt_manager, "intent_recognizer") and self.prompt_manager.intent_recognizer else "inactive",
                    "tags": ["sdk", "ai", "intent", "nlp"]
                },
                {
                    "id": "sdk-workflow-manager",
                    "name": "SDK Workflow Manager",
                    "description": "Workflow orchestration for SDK components",
                    "type": "core",
                    "status": "active" if self.workflow_manager else "inactive",
                    "tags": ["sdk", "workflow", "orchestration"]
                }
            ]
            
            # Add features to registry
            if "features" not in registry:
                registry["features"] = {}
            
            for feature in sdk_features:
                registry["features"][feature["id"]] = feature
            
            # Save registry
            with open(registry_path, 'w') as f:
                json.dump(registry, f, indent=2)
            
            logger.info(f"SDK features registered in feature registry")
            
            # Log activity
            log_prompt_activity("connect_feature_registry", {
                "features": [f["id"] for f in sdk_features],
                "registry_path": registry_path
            })
            
            return True
            
        except Exception as e:
            logger.error(f"Error connecting to feature registry: {e}")
            
            # Log activity
            log_prompt_activity("connect_feature_registry_error", {
                "error": str(e)
            })
            
            return False
    
    async def shutdown(self) -> None:
        """Shut down the system integration."""
        logger.info("Shutting down SDK system integration")
        
        # Clean up components
        
        # Log activity
        log_prompt_activity("system_integration_shutdown", {})


async def main():
    """Main entry point for script execution."""
    # Parse command line arguments
    import argparse
    
    parser = argparse.ArgumentParser(description="SDK System Integration")
    parser.add_argument("--config", help="Path to configuration file")
    parser.add_argument("--action", choices=["init", "nl"], default="init", help="Action to perform")
    parser.add_argument("--text", help="Natural language text to process")
    
    args = parser.parse_args()
    
    # Create and initialize integration
    integration = SDKSystemIntegration(config_path=args.config)
    
    if args.action == "init":
        # Initialize all components
        await integration.initialize()
        
        # Connect to feature registry
        await integration.connect_to_feature_registry()
        
        print("System integration initialization complete")
        
    elif args.action == "nl":
        # First initialize
        await integration.initialize()
        
        # Process natural language if provided
        if args.text:
            result = await integration.process_natural_language(args.text)
            print("Processing result:")
            print(json.dumps(result, indent=2))
        else:
            print("Error: --text is required for 'nl' action")
    
    # Shutdown
    await integration.shutdown()


if __name__ == "__main__":
    asyncio.run(main())