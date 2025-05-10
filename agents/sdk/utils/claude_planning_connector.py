#!/usr/bin/env python3
"""
Claude Planning Connector for SDK-First Architecture

This module provides a connector to Claude API that generates structured project
plans and integrates with the PlanningAgentParser to convert them into a format
usable by the Roadmap UI and Knowledge Graph.

Usage:
    from agents.sdk.utils.claude_planning_connector import ClaudePlanningConnector
    
    connector = ClaudePlanningConnector()
    plan_structure = connector.generate_plan("Create a user authentication system")
"""

import os
import sys
import json
import logging
import requests
from typing import Dict, List, Any, Optional

# Import planning agent parser
from agents.sdk.utils.planning_agent_parser import PlanningAgentParser

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("claude_planning_connector")

class ClaudePlanningConnector:
    """
    Connector to Claude API for generating structured project plans
    and integrating with the planning agent parser.
    """
    
    def __init__(self, api_key: Optional[str] = None, model: str = "claude-3-opus-20240229"):
        """
        Initialize the Claude planning connector.
        
        Args:
            api_key: Anthropic API key (if None, uses ANTHROPIC_API_KEY env var)
            model: Claude model to use
        """
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        if not self.api_key:
            logger.warning("No Anthropic API key provided. Set ANTHROPIC_API_KEY environment variable or pass api_key parameter.")
        
        self.model = model
        self.parser = PlanningAgentParser()
        
        logger.info(f"ClaudePlanningConnector initialized with model {model}")
    
    def generate_plan(self, project_description: str, format_for_roadmap: bool = True) -> Dict[str, Any]:
        """
        Generate a project plan using Claude and parse it into a structured format.
        
        Args:
            project_description: User's description of the project to plan
            format_for_roadmap: Whether to format the plan for the Roadmap UI
            
        Returns:
            Parsed plan structure
        """
        # Generate the plan using Claude
        logger.info(f"Generating plan for project: {project_description[:50]}...")
        
        markdown_plan = self._call_claude_api(project_description)
        
        if not markdown_plan:
            logger.error("Failed to generate plan with Claude")
            return {"error": "Failed to generate plan"}
        
        # Parse the plan
        plan = self.parser.parse_plan(markdown_plan)
        
        # Format for roadmap UI if requested
        if format_for_roadmap:
            plan = self.parser.convert_to_roadmap_format(plan)
        
        return plan
    
    def _call_claude_api(self, project_description: str) -> str:
        """
        Call the Claude API to generate a project plan.
        
        Args:
            project_description: Description of the project to plan
            
        Returns:
            Markdown plan text
        """
        if not self.api_key:
            logger.error("No API key available for Claude API call")
            return ""
        
        # Prepare the prompt
        prompt = self._create_planning_prompt(project_description)
        
        try:
            headers = {
                "x-api-key": self.api_key,
                "content-type": "application/json",
                "anthropic-version": "2023-06-01"
            }
            
            data = {
                "model": self.model,
                "max_tokens": 4000,
                "messages": [
                    {"role": "user", "content": prompt}
                ]
            }
            
            response = requests.post(
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                json=data
            )
            
            if response.status_code != 200:
                logger.error(f"Claude API error: {response.text}")
                return ""
            
            result = response.json()
            return result["content"][0]["text"]
            
        except Exception as e:
            logger.error(f"Error calling Claude API: {e}")
            return ""
    
    def _create_planning_prompt(self, project_description: str) -> str:
        """
        Create a prompt for Claude to generate a well-structured project plan.
        
        Args:
            project_description: Description of the project to plan
            
        Returns:
            Complete prompt for Claude
        """
        return f"""
Please create a detailed project plan for the following project:

{project_description}

Structure your response as a well-organized plan with the following hierarchy:
1. Milestone(s) - High-level goals
2. Phases - Major stages within each milestone
3. Modules - Functional groupings within each phase
4. Features - Specific capabilities within each module

Use clear headers with the following format:
# Milestone: [Milestone Name]
## Phase: [Phase Name]
### Module: [Module Name]
- Feature: [Feature Name]: [Brief Description]

For each milestone, provide:
- A clear, descriptive name
- 3-5 phases that represent logical progression
- Thoughtful organization of modules (2-3 per phase)
- Concrete features (3-5 per module)

Please ensure:
- The output is clean, well-formatted Markdown
- Each component has a clear, descriptive name
- The names follow a consistent naming pattern
- Features are specific and implementable
- The overall structure is logical and balanced

Be detailed but concise. Focus on providing a comprehensive project structure rather than explaining implementation details.
"""
    
    def save_plan_to_file(self, plan: Dict[str, Any], output_file: str) -> None:
        """
        Save a generated plan to a JSON file.
        
        Args:
            plan: The plan to save
            output_file: Path to save the plan to
        """
        try:
            with open(output_file, 'w') as f:
                json.dump(plan, f, indent=2)
            logger.info(f"Plan saved to {output_file}")
        except Exception as e:
            logger.error(f"Error saving plan to {output_file}: {e}")


if __name__ == "__main__":
    # Example usage
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate project plans using Claude")
    parser.add_argument("description", help="Project description")
    parser.add_argument("--output", "-o", help="Path to save the output JSON")
    parser.add_argument("--raw", action="store_true", help="Output raw plan structure instead of roadmap format")
    parser.add_argument("--model", default="claude-3-opus-20240229", help="Claude model to use")
    
    args = parser.parse_args()
    
    try:
        connector = ClaudePlanningConnector(model=args.model)
        plan = connector.generate_plan(args.description, format_for_roadmap=not args.raw)
        
        if args.output:
            connector.save_plan_to_file(plan, args.output)
            print(f"Plan saved to {args.output}")
        else:
            print(json.dumps(plan, indent=2))
            
    except Exception as e:
        print(f"Error: {e}")