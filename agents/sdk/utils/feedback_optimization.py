#!/usr/bin/env python3
"""
Feedback-Based Prompt Optimization System for SDK-First Architecture

This module extends the AdaptivePromptManager with feedback collection and 
optimization capabilities, learning from prompt performance over time.
"""

import os
import sys
import json
import time
import logging
import random
import math
import uuid
from typing import Dict, List, Any, Optional, Tuple, Union, Callable
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("feedback_optimization")

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
        """Fallback activity logger that just logs to the feedback_optimization logger."""
        logger.debug(f"Activity: {subtype} - {title or 'No title'} - {details}")


class FeedbackRecord:
    """Record of feedback for a prompt usage"""
    
    def __init__(self, prompt_id: str, template_id: str, variables: Dict[str, str],
               response_length: int, user_feedback: Optional[int] = None,
               auto_score: Optional[float] = None, tags: Optional[List[str]] = None,
               context_info: Optional[Dict[str, Any]] = None):
        """Initialize a feedback record
        
        Args:
            prompt_id: Unique ID for this prompt instance
            template_id: ID of the template used
            variables: Variables used in the template
            response_length: Length of the AI response
            user_feedback: User feedback score (1-5)
            auto_score: Automated evaluation score (0.0 to 1.0)
            tags: Tags for categorization
            context_info: Information about the context
        """
        self.prompt_id = prompt_id
        self.template_id = template_id
        self.variables = variables
        self.response_length = response_length
        self.user_feedback = user_feedback
        self.auto_score = auto_score
        self.tags = tags or []
        self.context_info = context_info or {}
        self.timestamp = datetime.now().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "prompt_id": self.prompt_id,
            "template_id": self.template_id,
            "variables": self.variables,
            "response_length": self.response_length,
            "user_feedback": self.user_feedback,
            "auto_score": self.auto_score,
            "tags": self.tags,
            "context_info": self.context_info,
            "timestamp": self.timestamp
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'FeedbackRecord':
        """Create from dictionary"""
        return cls(
            prompt_id=data["prompt_id"],
            template_id=data["template_id"],
            variables=data["variables"],
            response_length=data["response_length"],
            user_feedback=data.get("user_feedback"),
            auto_score=data.get("auto_score"),
            tags=data.get("tags", []),
            context_info=data.get("context_info", {})
        )


class PromptVariation:
    """A variation of a prompt template"""
    
    def __init__(self, template_id: str, variation_text: str, 
                variables: List[str], tags: Optional[List[str]] = None):
        """Initialize a prompt variation
        
        Args:
            template_id: ID of the parent template
            variation_text: Text of this variation
            variables: List of variable names used in the template
            tags: Tags for categorization
        """
        self.template_id = template_id
        self.variation_id = f"{template_id}_var_{int(time.time())}"
        self.variation_text = variation_text
        self.variables = variables
        self.tags = tags or []
        self.usage_count = 0
        self.success_count = 0
        self.feedback_scores = []
        self.performance_score = 0.0
    
    def update_performance(self, success: bool, score: Optional[float] = None) -> None:
        """Update performance metrics
        
        Args:
            success: Whether the prompt was successful
            score: Optional performance score (0.0 to 1.0)
        """
        self.usage_count += 1
        if success:
            self.success_count += 1
        
        if score is not None:
            self.feedback_scores.append(score)
            # Update performance score as average of all feedback
            self.performance_score = sum(self.feedback_scores) / len(self.feedback_scores)
    
    def get_success_rate(self) -> float:
        """Get the success rate of this variation
        
        Returns:
            Success rate (0.0 to 1.0) or 0.0 if never used
        """
        if self.usage_count == 0:
            return 0.0
        return self.success_count / self.usage_count
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "template_id": self.template_id,
            "variation_id": self.variation_id,
            "variation_text": self.variation_text,
            "variables": self.variables,
            "tags": self.tags,
            "usage_count": self.usage_count,
            "success_count": self.success_count,
            "feedback_scores": self.feedback_scores,
            "performance_score": self.performance_score
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'PromptVariation':
        """Create from dictionary"""
        variation = cls(
            template_id=data["template_id"],
            variation_text=data["variation_text"],
            variables=data["variables"],
            tags=data.get("tags", [])
        )
        
        # Set ID and metrics
        variation.variation_id = data["variation_id"]
        variation.usage_count = data.get("usage_count", 0)
        variation.success_count = data.get("success_count", 0)
        variation.feedback_scores = data.get("feedback_scores", [])
        variation.performance_score = data.get("performance_score", 0.0)
        
        return variation


class OptimizationStrategy:
    """Base class for prompt optimization strategies"""
    
    def generate_variations(self, template: str, variables: List[str], 
                          count: int = 3) -> List[str]:
        """Generate variations of a prompt template
        
        Args:
            template: Original template
            variables: Variables used in the template
            count: Number of variations to generate
            
        Returns:
            List of template variations
        """
        raise NotImplementedError("Subclasses must implement this method")
    
    def select_best_variation(self, variations: List[PromptVariation]) -> PromptVariation:
        """Select the best variation based on performance
        
        Args:
            variations: List of variations
            
        Returns:
            Best variation
        """
        if not variations:
            raise ValueError("No variations provided")
        
        # Sort by performance score, breaking ties with usage count
        sorted_variations = sorted(
            variations, 
            key=lambda v: (v.performance_score, v.usage_count), 
            reverse=True
        )
        
        return sorted_variations[0]


class SimpleOptimizationStrategy(OptimizationStrategy):
    """Simple optimization strategy with predefined templates"""
    
    def generate_variations(self, template: str, variables: List[str], 
                          count: int = 3) -> List[str]:
        """Generate variations of a prompt template
        
        Args:
            template: Original template
            variables: Variables used in the template
            count: Number of variations to generate
            
        Returns:
            List of template variations
        """
        variations = [template]  # Original template
        
        # Add simple variations
        variation1 = f"Please respond in a concise and direct manner.\n\n{template}"
        variation2 = f"{template}\n\nFocus on providing practical and actionable information."
        
        variations.extend([variation1, variation2])
        
        # Generate more variations if needed
        while len(variations) < count:
            # Add emphasis or clarity modifiers
            emphasis = [
                "It's particularly important to be precise and accurate.",
                "Please ensure your response is comprehensive and thorough.",
                "Focus on the most essential information.",
                "Prioritize clarity and simplicity in your response."
            ]
            
            tone = [
                "Use a professional and technical tone.",
                "Respond in a conversational and helpful manner.",
                "Adopt an instructional tone, as if teaching a concept."
            ]
            
            format_guide = [
                "Structure your response with clear headings and bullet points.",
                "Include examples to illustrate key points.",
                "Organize information logically, from general to specific."
            ]
            
            # Randomly select modifiers
            modifier = random.choice(emphasis + tone + format_guide)
            new_variation = f"{template}\n\n{modifier}"
            
            if new_variation not in variations:
                variations.append(new_variation)
        
        return variations[:count]


class AIBasedStrategy(OptimizationStrategy):
    """
    AI-based optimization strategy that uses the LLM itself to generate variations
    based on feedback and usage patterns.
    """
    
    def __init__(self, ai_client: Optional[Any] = None, api_key: Optional[str] = None):
        """
        Initialize the AI-based strategy.
        
        Args:
            ai_client: Optional AI client (LLM provider client)
            api_key: API key for LLM provider
        """
        self.ai_client = ai_client
        self.api_key = api_key
        self.provider = os.environ.get("SDK_OPTIMIZATION_PROVIDER", "openai")
        
        # Try to import the right API client if not provided
        if not self.ai_client:
            try:
                if self.provider == "openai":
                    import openai
                    self.ai_client = openai.OpenAI(api_key=self.api_key or os.environ.get("OPENAI_API_KEY"))
                elif self.provider == "claude":
                    import anthropic
                    self.ai_client = anthropic.Anthropic(api_key=self.api_key or os.environ.get("ANTHROPIC_API_KEY"))
            except (ImportError, Exception) as e:
                logger.warning(f"Failed to initialize AI client for optimization: {e}")
    
    def generate_variations(self, template: str, variables: List[str], 
                          count: int = 3, feedback: List[Dict[str, Any]] = None) -> List[str]:
        """
        Generate variations of a prompt template using AI.
        
        Args:
            template: Original template
            variables: Variables used in the template
            count: Number of variations to generate
            feedback: Optional feedback data for context
            
        Returns:
            List of template variations
        """
        # Fallback to simple strategy if AI client not available
        if not self.ai_client:
            logger.warning("AI client not available, falling back to simple strategy")
            return SimpleOptimizationStrategy().generate_variations(template, variables, count)
        
        variations = [template]  # Always include original template
        
        try:
            # Create a prompt for the AI to generate variations
            system_prompt = (
                "You are an expert prompt engineer. Your task is to create variations of a prompt template "
                "that will be more effective. Each variation should preserve the core information request "
                "but may adjust tone, structure, specificity, or add clarifications."
            )
            
            user_prompt = f"""
Original prompt template:
```
{template}
```

Template variables: {", ".join(variables)}

Please generate {count-1} variations of this prompt template. Each variation should:
1. Preserve all variable placeholders (e.g., {{variable_name}})
2. Maintain the core information request
3. Enhance clarity, specificity, or effectiveness
4. Avoid redundancy with other variations

Return just the variations, one per paragraph, without numbering or extra commentary.
"""
            
            # Add feedback context if available
            if feedback:
                feedback_summary = "\n\nFeedback on previous prompts:\n"
                for idx, item in enumerate(feedback[:5]):  # Limit to 5 items
                    score = item.get("user_feedback", item.get("auto_score", "unknown"))
                    feedback_summary += f"- Prompt {idx+1} (score: {score}): {item.get('notes', 'No specific feedback')}\n"
                user_prompt += feedback_summary
            
            # Generate variations
            if self.provider == "openai":
                response = self.ai_client.chat.completions.create(
                    model="gpt-4o",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.7,
                    max_tokens=1000
                )
                variations_text = response.choices[0].message.content
            elif self.provider == "claude":
                response = self.ai_client.messages.create(
                    model="claude-3-opus-20240229",
                    max_tokens=1000,
                    system=system_prompt,
                    messages=[
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.7
                )
                variations_text = response.content[0].text
            
            # Parse variations from response
            ai_variations = [v.strip() for v in variations_text.split("\n\n") if v.strip()]
            
            # Add AI-generated variations (ensuring we don't exceed the requested count)
            for var in ai_variations:
                if len(variations) < count:
                    variations.append(var)
                else:
                    break
            
            log_prompt_activity("generate_template_variations", {
                "strategy": "ai_based",
                "original_template": template[:50] + "...",
                "variables": variables,
                "variations_generated": len(variations) - 1
            })
        
        except Exception as e:
            logger.error(f"Error generating AI-based variations: {e}")
            # Fallback to simple strategy
            simple_strategy = SimpleOptimizationStrategy()
            remaining_count = count - len(variations)
            if remaining_count > 0:
                variations.extend(simple_strategy.generate_variations(template, variables, remaining_count)[1:])
        
        return variations[:count]
    
    def select_best_variation(self, variations: List[PromptVariation]) -> PromptVariation:
        """
        Select the best variation based on performance, with exploration component.
        
        Args:
            variations: List of variations
            
        Returns:
            Best variation
        """
        if not variations:
            raise ValueError("No variations provided")
        
        # Implementation of Upper Confidence Bound (UCB) algorithm
        # A simplified version of multi-armed bandit problem
        total_usage = sum(var.usage_count for var in variations) + 1  # Avoid division by zero
        
        # Calculate UCB for each variation
        for var in variations:
            # Skip if no data
            if var.usage_count == 0:
                var.ucb_score = float('inf')  # Encourage exploration
                continue
                
            # Calculate exploitation term (performance score)
            exploitation = var.performance_score
            
            # Calculate exploration term (uncertainty based on usage count)
            exploration = math.sqrt(2 * math.log(total_usage) / var.usage_count)
            
            # Combined UCB score
            var.ucb_score = exploitation + 0.5 * exploration  # Weighted for more exploitation
        
        # Sort by UCB score
        sorted_variations = sorted(variations, key=lambda v: v.ucb_score, reverse=True)
        
        return sorted_variations[0]


class FeedbackOptimizationSystem:
    """System for collecting feedback and optimizing prompts"""
    
    def __init__(self, 
               data_dir: Optional[str] = None, 
               strategy: Optional[OptimizationStrategy] = None,
               use_redis: bool = True,
               use_mongodb: bool = True):
        """Initialize the feedback system
        
        Args:
            data_dir: Directory for storing feedback data
            strategy: Optimization strategy to use
            use_redis: Whether to use Redis for caching
            use_mongodb: Whether to use MongoDB for persistent storage
        """
        self.data_dir = data_dir or os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "feedback_data"
        )
        self.strategy = strategy or SimpleOptimizationStrategy()
        self.feedback_records: List[FeedbackRecord] = []
        self.variations: Dict[str, List[PromptVariation]] = {}
        
        # Initialize integrations
        self.redis_client = None
        self.mongo_client = None
        self.database = None
        
        if use_redis or use_mongodb:
            self._init_integrations(use_redis, use_mongodb)
        
        # Load existing data
        os.makedirs(self.data_dir, exist_ok=True)
        self._load_data()
        
        log_prompt_activity("init_feedback_system", {
            "strategy_type": self.strategy.__class__.__name__,
            "data_dir": self.data_dir,
            "redis_enabled": self.redis_client is not None,
            "mongodb_enabled": self.mongo_client is not None
        })
    
    def _init_integrations(self, use_redis: bool, use_mongodb: bool) -> None:
        """Initialize integrations with Redis and MongoDB"""
        # Try to import from integrations if available
        try:
            # Try to import with relative path
            from .integrations import get_redis_client, get_mongodb_client
            
            # Try to get Redis client
            if use_redis:
                self.redis_client = get_redis_client()
                if self.redis_client:
                    logger.info("Redis client initialized for feedback optimization")
            
            # Try to get MongoDB client
            if use_mongodb:
                self.mongo_client = get_mongodb_client()
                if self.mongo_client:
                    self.database = self.mongo_client.get_database("devloop")
                    logger.info("MongoDB client initialized for feedback optimization")
        
        except ImportError:
            # Direct initialization if integrations module not available
            if use_redis:
                try:
                    import redis
                    self.redis_client = redis.Redis(
                        host=os.environ.get("REDIS_HOST", "localhost"),
                        port=int(os.environ.get("REDIS_PORT", 6379)),
                        db=int(os.environ.get("REDIS_DB", 0)),
                        password=os.environ.get("REDIS_PASSWORD", None),
                        decode_responses=True
                    )
                    # Test connection
                    self.redis_client.ping()
                    logger.info("Redis client initialized for feedback optimization")
                except (ImportError, Exception) as e:
                    logger.warning(f"Failed to initialize Redis: {e}")
            
            if use_mongodb:
                try:
                    import pymongo
                    self.mongo_client = pymongo.MongoClient(
                        host=os.environ.get("MONGO_HOST", "localhost"),
                        port=int(os.environ.get("MONGO_PORT", 27017)),
                        username=os.environ.get("MONGO_USERNAME", None),
                        password=os.environ.get("MONGO_PASSWORD", None)
                    )
                    self.database = self.mongo_client.get_database("devloop")
                    logger.info("MongoDB client initialized for feedback optimization")
                except (ImportError, Exception) as e:
                    logger.warning(f"Failed to initialize MongoDB: {e}")
    
    def _load_data(self) -> None:
        """Load feedback and variation data from files"""
        # First try MongoDB if available
        if self.database:
            try:
                # Load feedback records
                feedback_collection = self.database.get_collection("feedback_records")
                records = list(feedback_collection.find())
                if records:
                    self.feedback_records = [FeedbackRecord.from_dict(record) for record in records]
                    logger.info(f"Loaded {len(records)} feedback records from MongoDB")
                
                # Load prompt variations
                variations_collection = self.database.get_collection("prompt_variations")
                variations_docs = list(variations_collection.find())
                if variations_docs:
                    for doc in variations_docs:
                        template_id = doc["template_id"]
                        variations = [PromptVariation.from_dict(var) for var in doc["variations"]]
                        self.variations[template_id] = variations
                    logger.info(f"Loaded variations for {len(self.variations)} templates from MongoDB")
                
                # If data was loaded from MongoDB, return
                if records or variations_docs:
                    return
            except Exception as e:
                logger.error(f"Error loading data from MongoDB: {e}")
        
        # Fall back to file-based storage
        feedback_path = os.path.join(self.data_dir, "feedback_records.json")
        variations_path = os.path.join(self.data_dir, "prompt_variations.json")
        
        # Load feedback records
        if os.path.exists(feedback_path):
            try:
                with open(feedback_path, 'r') as f:
                    records_data = json.load(f)
                    self.feedback_records = [
                        FeedbackRecord.from_dict(record) for record in records_data
                    ]
                logger.info(f"Loaded {len(self.feedback_records)} feedback records from file")
            except Exception as e:
                logger.error(f"Error loading feedback records: {e}")
        
        # Load prompt variations
        if os.path.exists(variations_path):
            try:
                with open(variations_path, 'r') as f:
                    variations_data = json.load(f)
                    for template_id, vars_data in variations_data.items():
                        self.variations[template_id] = [
                            PromptVariation.from_dict(var) for var in vars_data
                        ]
                logger.info(f"Loaded variations for {len(self.variations)} templates from file")
            except Exception as e:
                logger.error(f"Error loading prompt variations: {e}")
    
    def _save_data(self) -> None:
        """Save feedback and variation data"""
        # First try MongoDB if available
        if self.database:
            try:
                # Save feedback records
                feedback_collection = self.database.get_collection("feedback_records")
                # Clear existing records and insert new ones
                feedback_collection.delete_many({})
                if self.feedback_records:
                    feedback_collection.insert_many([record.to_dict() for record in self.feedback_records])
                
                # Save prompt variations
                variations_collection = self.database.get_collection("prompt_variations")
                # Clear existing variations and insert new ones
                variations_collection.delete_many({})
                if self.variations:
                    variation_docs = []
                    for template_id, variations in self.variations.items():
                        variation_docs.append({
                            "template_id": template_id,
                            "variations": [var.to_dict() for var in variations]
                        })
                    variations_collection.insert_many(variation_docs)
                
                logger.info(f"Saved data to MongoDB ({len(self.feedback_records)} records, {len(self.variations)} template variations)")
                
                # If data was saved to MongoDB, we can skip file storage
                return
            except Exception as e:
                logger.error(f"Error saving data to MongoDB: {e}")
        
        # Fall back to file-based storage
        feedback_path = os.path.join(self.data_dir, "feedback_records.json")
        variations_path = os.path.join(self.data_dir, "prompt_variations.json")
        
        # Save feedback records
        try:
            with open(feedback_path, 'w') as f:
                json.dump([record.to_dict() for record in self.feedback_records], f, indent=2)
        except Exception as e:
            logger.error(f"Error saving feedback records: {e}")
        
        # Save prompt variations
        try:
            variations_data = {}
            for template_id, variations in self.variations.items():
                variations_data[template_id] = [var.to_dict() for var in variations]
            
            with open(variations_path, 'w') as f:
                json.dump(variations_data, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving prompt variations: {e}")
    
    def record_feedback(self, record: FeedbackRecord) -> None:
        """Record feedback for a prompt
        
        Args:
            record: Feedback record
        """
        self.feedback_records.append(record)
        
        # Update variation performance if this was a variation
        for variations in self.variations.values():
            for var in variations:
                if var.variation_id == record.template_id:
                    success = record.user_feedback >= 4 if record.user_feedback else None
                    var.update_performance(
                        success=success if success is not None else record.auto_score >= 0.7,
                        score=record.auto_score
                    )
                    
                    # Log the performance update
                    log_prompt_activity("update_variation_performance", {
                        "variation_id": var.variation_id,
                        "template_id": var.template_id,
                        "success": success,
                        "score": record.auto_score,
                        "new_performance_score": var.performance_score
                    })
        
        # Cache the record in Redis if available
        if self.redis_client:
            try:
                key = f"feedback:record:{record.prompt_id}"
                self.redis_client.setex(key, 86400, json.dumps(record.to_dict()))  # 24 hour TTL
            except Exception as e:
                logger.error(f"Error caching feedback record in Redis: {e}")
        
        # Save data
        self._save_data()
        
        # Log the activity
        log_prompt_activity("record_feedback", {
            "record_id": record.prompt_id,
            "template_id": record.template_id,
            "user_feedback": record.user_feedback,
            "auto_score": record.auto_score,
            "response_length": record.response_length
        })
    
    def generate_variations(self, template_id: str, template: str, 
                         variables: List[str], count: int = 3) -> List[PromptVariation]:
        """Generate variations for a template
        
        Args:
            template_id: Template ID
            template: Template text
            variables: Variables used in the template
            count: Number of variations to generate
            
        Returns:
            List of prompt variations
        """
        # Check if we already have variations
        if template_id in self.variations and len(self.variations[template_id]) >= count:
            return self.variations[template_id]
        
        # Try Redis cache if available
        if self.redis_client:
            try:
                key = f"template:variations:{template_id}"
                cached_data = self.redis_client.get(key)
                if cached_data:
                    variations_data = json.loads(cached_data)
                    variations = [PromptVariation.from_dict(var) for var in variations_data]
                    if len(variations) >= count:
                        # Add to local cache
                        self.variations[template_id] = variations
                        return variations
            except Exception as e:
                logger.error(f"Error retrieving cached variations from Redis: {e}")
        
        # Get feedback for this template to help guide generation
        template_feedback = []
        for record in self.feedback_records:
            if record.template_id == template_id:
                template_feedback.append({
                    "user_feedback": record.user_feedback,
                    "auto_score": record.auto_score,
                    "response_length": record.response_length
                })
        
        # Generate variations using the strategy
        # If we're using the AI-based strategy, pass feedback data
        if isinstance(self.strategy, AIBasedStrategy):
            variation_texts = self.strategy.generate_variations(
                template, variables, count, feedback=template_feedback
            )
        else:
            variation_texts = self.strategy.generate_variations(template, variables, count)
        
        variations = []
        
        for var_text in variation_texts:
            variation = PromptVariation(
                template_id=template_id,
                variation_text=var_text,
                variables=variables
            )
            variations.append(variation)
        
        # Store variations
        self.variations[template_id] = variations
        self._save_data()
        
        # Cache in Redis if available
        if self.redis_client:
            try:
                key = f"template:variations:{template_id}"
                self.redis_client.setex(
                    key, 
                    86400 * 7,  # 7 day TTL 
                    json.dumps([var.to_dict() for var in variations])
                )
            except Exception as e:
                logger.error(f"Error caching variations in Redis: {e}")
        
        # Log the generation
        log_prompt_activity("generate_variations", {
            "template_id": template_id,
            "count": len(variations),
            "strategy": self.strategy.__class__.__name__
        })
        
        return variations
    
    def get_best_variation(self, template_id: str, template: str, 
                        variables: List[str]) -> PromptVariation:
        """Get the best variation for a template
        
        Args:
            template_id: Template ID
            template: Template text
            variables: Variables used in the template
            
        Returns:
            Best prompt variation
        """
        # Generate variations if needed
        if template_id not in self.variations or not self.variations[template_id]:
            self.generate_variations(template_id, template, variables)
        
        variations = self.variations[template_id]
        
        # If we have sufficient usage data, select the best variation
        sufficient_data = any(var.usage_count >= 5 for var in variations)
        
        if sufficient_data:
            best_var = self.strategy.select_best_variation(variations)
            
            # Log the selection
            log_prompt_activity("select_best_variation", {
                "template_id": template_id,
                "variation_id": best_var.variation_id,
                "performance_score": best_var.performance_score,
                "usage_count": best_var.usage_count
            })
            
            return best_var
        else:
            # Otherwise, do exploration (select random variation to gather data)
            selected_var = random.choice(variations)
            
            # Log the exploration
            log_prompt_activity("explore_variation", {
                "template_id": template_id,
                "variation_id": selected_var.variation_id,
                "usage_count": selected_var.usage_count
            })
            
            return selected_var
    
    def analyze_feedback(self, template_id: Optional[str] = None) -> Dict[str, Any]:
        """Analyze feedback data
        
        Args:
            template_id: Optional template ID to filter by
            
        Returns:
            Analysis results
        """
        # Filter records by template if specified
        records = self.feedback_records
        if template_id:
            records = [r for r in records if r.template_id == template_id]
        
        if not records:
            return {"message": "No feedback records found"}
        
        # Calculate metrics
        user_feedback = [r.user_feedback for r in records if r.user_feedback is not None]
        auto_scores = [r.auto_score for r in records if r.auto_score is not None]
        
        avg_user_feedback = sum(user_feedback) / len(user_feedback) if user_feedback else None
        avg_auto_score = sum(auto_scores) / len(auto_scores) if auto_scores else None
        
        # Get performance by template
        template_performance = {}
        for record in records:
            tid = record.template_id
            if tid not in template_performance:
                template_performance[tid] = {
                    "count": 0,
                    "user_feedback": [],
                    "auto_scores": []
                }
            
            template_performance[tid]["count"] += 1
            
            if record.user_feedback is not None:
                template_performance[tid]["user_feedback"].append(record.user_feedback)
            
            if record.auto_score is not None:
                template_performance[tid]["auto_scores"].append(record.auto_score)
        
        # Calculate average performance by template
        for tid, perf in template_performance.items():
            if perf["user_feedback"]:
                perf["avg_user_feedback"] = sum(perf["user_feedback"]) / len(perf["user_feedback"])
            else:
                perf["avg_user_feedback"] = None
            
            if perf["auto_scores"]:
                perf["avg_auto_score"] = sum(perf["auto_scores"]) / len(perf["auto_scores"])
            else:
                perf["avg_auto_score"] = None
        
        # Log analysis activity
        log_prompt_activity("analyze_feedback", {
            "template_id": template_id or "all",
            "record_count": len(records),
            "avg_user_feedback": avg_user_feedback,
            "avg_auto_score": avg_auto_score
        })
        
        return {
            "total_records": len(records),
            "avg_user_feedback": avg_user_feedback,
            "avg_auto_score": avg_auto_score,
            "template_performance": template_performance
        }
    
    def suggest_improvements(self, template_id: str, template: str) -> List[Dict[str, str]]:
        """Suggest improvements for a template based on feedback
        
        Args:
            template_id: Template ID
            template: Template text
            
        Returns:
            List of improvement suggestions
        """
        # Analyze feedback for this template
        analysis = self.analyze_feedback(template_id)
        
        # Get relevant records
        records = [r for r in self.feedback_records if r.template_id == template_id]
        
        # Default suggestions
        suggestions = []
        
        # Low user feedback suggestions
        avg_feedback = analysis.get("avg_user_feedback")
        if avg_feedback and avg_feedback < 3.5:
            suggestions.append({
                "type": "clarity",
                "suggestion": "Improve clarity by adding more specific instructions."
            })
            suggestions.append({
                "type": "structure",
                "suggestion": "Add more structure to help guide the AI response."
            })
        
        # Check response length patterns
        response_lengths = [r.response_length for r in records]
        avg_length = sum(response_lengths) / len(response_lengths) if response_lengths else 0
        
        if avg_length < 200:
            suggestions.append({
                "type": "detail",
                "suggestion": "Prompt may be too vague - add more specific requirements to get detailed responses."
            })
        elif avg_length > 2000:
            suggestions.append({
                "type": "conciseness",
                "suggestion": "Responses are very long - add instructions to keep responses concise and focused."
            })
        
        # Suggest improvements based on best performing variation
        if template_id in self.variations and self.variations[template_id]:
            best_var = self.strategy.select_best_variation(self.variations[template_id])
            
            if best_var.performance_score > analysis.get("avg_auto_score", 0):
                suggestions.append({
                    "type": "variation",
                    "suggestion": f"Consider using this better performing variation: {best_var.variation_id}",
                    "variation_text": best_var.variation_text
                })
        
        # Log suggestions
        log_prompt_activity("suggest_improvements", {
            "template_id": template_id,
            "suggestion_count": len(suggestions),
            "types": [s["type"] for s in suggestions]
        })
        
        return suggestions


# Integration with the AdaptivePromptManager
def integrate_with_prompt_manager(prompt_manager_path: str):
    """
    Integrate the FeedbackOptimizationSystem with the AdaptivePromptManager.
    
    Args:
        prompt_manager_path: Path to prompt_manager.py
    """
    try:
        # Check if the file exists
        if not os.path.exists(prompt_manager_path):
            logger.error(f"Prompt manager file not found at {prompt_manager_path}")
            return False
        
        # Read the file
        with open(prompt_manager_path, 'r') as f:
            content = f.read()
        
        # Check if integration already exists
        if "FeedbackOptimizationSystem" in content:
            logger.info("FeedbackOptimizationSystem integration already exists")
            return True
        
        # Define the integration code
        integration_code = '''
    # Initialize feedback optimization system if enabled
    self.feedback_optimization = None
    if config.get("feedback_optimization", {}).get("enabled", False):
        try:
            from .feedback_optimization import FeedbackOptimizationSystem
            
            # Create feedback optimization system
            optimization_strategy = config.get("feedback_optimization", {}).get("strategy", "simple")
            self.feedback_optimization = FeedbackOptimizationSystem(
                data_dir=config.get("feedback_optimization", {}).get("data_dir"),
                use_redis=config.get("feedback_optimization", {}).get("use_redis", True),
                use_mongodb=config.get("feedback_optimization", {}).get("use_mongodb", True)
            )
            logger.info("Feedback optimization system initialized")
        except Exception as e:
            logger.error(f"Failed to initialize feedback optimization system: {e}")
'''
        
        # Define optimization-aware render_template method
        optimization_render_code = '''
    def render_template_optimized(self, name: str, variables: Dict[str, Any]) -> str:
        """
        Render a template with optimization based on feedback.
        
        Args:
            name: Template name
            variables: Variables to substitute
            
        Returns:
            Rendered template
        """
        # If feedback optimization is not enabled, use regular rendering
        if not hasattr(self, "feedback_optimization") or not self.feedback_optimization:
            return self.render_template(name, variables)
        
        # Get template
        template = self.get_template(name)
        if not template:
            raise ValueError(f"Template not found: {name}")
        
        # Get the best variation for this template
        variable_names = [var.name for var in template.variables]
        best_variation = self.feedback_optimization.get_best_variation(
            template_id=name,
            template=template.template,
            variables=variable_names
        )
        
        # Use the variation as the template
        template_text = best_variation.variation_text
        
        # Render the template
        rendered = ""
        for key, value in variables.items():
            placeholder = f"{{{{{key}}}}}"
            if isinstance(value, (dict, list)):
                value_str = json.dumps(value, indent=2)
            else:
                value_str = str(value)
            template_text = template_text.replace(placeholder, value_str)
        
        # Record rendering for feedback
        prompt_id = f"prompt_{str(uuid.uuid4())[:8]}"
        self.last_rendered_prompt = {
            "prompt_id": prompt_id,
            "template_id": best_variation.variation_id,
            "variables": variables,
            "rendered_text": template_text
        }
        
        return template_text
        
    def record_prompt_feedback(self, user_feedback: Optional[int] = None, 
                             auto_score: Optional[float] = None,
                             response_length: Optional[int] = None) -> None:
        """
        Record feedback for the last rendered prompt.
        
        Args:
            user_feedback: User feedback score (1-5)
            auto_score: Automated evaluation score (0.0 to 1.0)
            response_length: Length of the AI response
        """
        if not hasattr(self, "feedback_optimization") or not self.feedback_optimization:
            logger.warning("Feedback optimization not enabled, ignoring feedback")
            return
        
        if not hasattr(self, "last_rendered_prompt") or not self.last_rendered_prompt:
            logger.warning("No prompt to record feedback for")
            return
        
        # Get last prompt details
        prompt_id = self.last_rendered_prompt["prompt_id"]
        template_id = self.last_rendered_prompt["template_id"]
        variables = self.last_rendered_prompt["variables"]
        
        # Create feedback record
        record = FeedbackRecord(
            prompt_id=prompt_id,
            template_id=template_id,
            variables=variables,
            response_length=response_length or 0,
            user_feedback=user_feedback,
            auto_score=auto_score
        )
        
        # Record feedback
        self.feedback_optimization.record_feedback(record)
        
        # Clear last prompt
        self.last_rendered_prompt = None
'''

        # Find the right locations to insert the integration code
        # Insert feedback initialization in the AdaptivePromptManager.__init__ method
        init_pattern = "def __init__(self,"
        init_end_pattern = "        # Log completion of initialization"
        
        # Find the location to insert the initialization code
        init_pos = content.find(init_pattern)
        if init_pos == -1:
            logger.error("Could not find AdaptivePromptManager.__init__ method")
            return False
        
        init_end_pos = content.find(init_end_pattern, init_pos)
        if init_end_pos == -1:
            logger.error("Could not find initialization completion marker")
            return False
        
        # Insert the initialization code
        content = content[:init_end_pos] + integration_code + content[init_end_pos:]
        
        # Find the end of the AdaptivePromptManager class to add the new methods
        class_end_pattern = "if __name__ == \"__main__\":"
        class_end_pos = content.find(class_end_pattern)
        if class_end_pos == -1:
            logger.error("Could not find AdaptivePromptManager class end")
            return False
        
        # Insert the optimization methods
        content = content[:class_end_pos] + optimization_render_code + "\n\n" + content[class_end_pos:]
        
        # Write the updated file
        with open(prompt_manager_path, 'w') as f:
            f.write(content)
        
        logger.info(f"Successfully integrated FeedbackOptimizationSystem with {prompt_manager_path}")
        return True
    
    except Exception as e:
        logger.error(f"Error integrating with prompt manager: {e}")
        return False


if __name__ == "__main__":
    # Parse command line arguments
    import argparse
    
    parser = argparse.ArgumentParser(description="Feedback-Based Prompt Optimization System")
    parser.add_argument("--data-dir", help="Directory for storing feedback data")
    parser.add_argument("--strategy", choices=["simple", "ai"], default="simple", help="Optimization strategy")
    parser.add_argument("--integrate", action="store_true", help="Integrate with AdaptivePromptManager")
    parser.add_argument("--prompt-manager-path", help="Path to prompt_manager.py")
    parser.add_argument("--template", help="Template text to generate variations for")
    parser.add_argument("--template-id", help="Template ID", default="test_template")
    parser.add_argument("--variables", help="Comma-separated list of variables", default="var1,var2")
    parser.add_argument("--count", type=int, default=3, help="Number of variations to generate")
    parser.add_argument("--redis", action="store_true", help="Use Redis for caching")
    parser.add_argument("--mongodb", action="store_true", help="Use MongoDB for storage")
    
    args = parser.parse_args()
    
    # Choose strategy
    if args.strategy == "simple":
        strategy = SimpleOptimizationStrategy()
    elif args.strategy == "ai":
        strategy = AIBasedStrategy()
    
    # Create feedback system
    feedback_system = FeedbackOptimizationSystem(
        data_dir=args.data_dir,
        strategy=strategy,
        use_redis=args.redis,
        use_mongodb=args.mongodb
    )
    
    # Integrate with AdaptivePromptManager if requested
    if args.integrate:
        if not args.prompt_manager_path:
            prompt_manager_path = os.path.join(script_dir, "prompt_manager.py")
            if not os.path.exists(prompt_manager_path):
                logger.error("No prompt_manager.py path provided, and default not found")
                sys.exit(1)
        else:
            prompt_manager_path = args.prompt_manager_path
        
        success = integrate_with_prompt_manager(prompt_manager_path)
        if success:
            print(f"Successfully integrated with {prompt_manager_path}")
        else:
            print(f"Failed to integrate with {prompt_manager_path}")
        sys.exit(0)
    
    # Generate variations for a template if provided
    if args.template:
        template = args.template
        variables = args.variables.split(",")
        
        print(f"Generating {args.count} variations for template: {template}")
        variations = feedback_system.generate_variations(
            template_id=args.template_id,
            template=template,
            variables=variables,
            count=args.count
        )
        
        print("Generated variations:")
        for var in variations:
            print(f"- {var.variation_id}: {var.variation_text[:100]}...")
        
        # Simulate some feedback
        print("\nSimulating feedback...")
        feedback = FeedbackRecord(
            prompt_id="test_prompt_1",
            template_id=variations[0].variation_id,
            variables={var: f"test_{var}" for var in variables},
            response_length=1200,
            user_feedback=4,
            auto_score=0.85
        )
        
        feedback_system.record_feedback(feedback)
        
        # Get best variation
        print("\nGetting best variation...")
        best_var = feedback_system.get_best_variation(
            template_id=args.template_id,
            template=template,
            variables=variables
        )
        
        print(f"Best variation: {best_var.variation_id}")
        print(f"Performance score: {best_var.performance_score}")
        
        # Analyze feedback
        print("\nAnalyzing feedback...")
        analysis = feedback_system.analyze_feedback()
        print(f"Feedback analysis: {json.dumps(analysis, indent=2)}")
        
        # Get improvement suggestions
        print("\nGetting improvement suggestions...")
        suggestions = feedback_system.suggest_improvements(args.template_id, template)
        print(f"Improvement suggestions: {json.dumps(suggestions, indent=2)}")
    else:
        print("No template provided. Use --template to generate variations.")