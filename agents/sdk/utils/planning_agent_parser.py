#!/usr/bin/env python3
"""
Planning Agent Parser for SDK-First Architecture

This module provides functionality to parse Claude's structured markdown plans and
convert them into a data structure that can be used by the Roadmap UI and Knowledge Graph.
It extracts milestones, phases, modules, and features from markdown text.

Usage:
    from agents.sdk.utils.planning_agent_parser import PlanningAgentParser
    
    parser = PlanningAgentParser()
    plan_structure = parser.parse_plan(claude_markdown_text)
"""

import re
import uuid
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("planning_agent_parser")

class PlanningAgentParser:
    """
    Parser for Claude-generated project plans in markdown format.
    Extracts structured data about milestones, phases, modules, and features.
    """
    
    def __init__(self):
        """Initialize the planning agent parser."""
        self.current_timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    
    def parse_plan(self, markdown_text: str) -> Dict[str, Any]:
        """
        Parse a markdown project plan into a structured format.
        
        Args:
            markdown_text: Claude-generated markdown plan text
            
        Returns:
            Dict containing structured project plan
        """
        logger.info("Parsing planning agent markdown")
        
        # Initialize the plan structure
        plan = {
            "id": f"plan-{self.current_timestamp}",
            "created_at": datetime.now().isoformat(),
            "milestones": [],
            "metadata": {
                "source": "claude",
                "parser_version": "1.0"
            }
        }
        
        # Extract milestones with their phases and features
        milestones = self._extract_milestones(markdown_text)
        
        # Process each milestone
        for milestone in milestones:
            processed_milestone = self._process_milestone(milestone)
            if processed_milestone:
                plan["milestones"].append(processed_milestone)
        
        # Add additional metadata
        plan["metadata"]["milestone_count"] = len(plan["milestones"])
        phase_count = 0
        module_count = 0
        feature_count = 0
        
        for milestone in plan["milestones"]:
            phase_count += len(milestone.get("phases", []))
            for phase in milestone.get("phases", []):
                module_count += len(phase.get("modules", []))
                for module in phase.get("modules", []):
                    feature_count += len(module.get("features", []))
        
        plan["metadata"]["phase_count"] = phase_count
        plan["metadata"]["module_count"] = module_count
        plan["metadata"]["feature_count"] = feature_count
        
        logger.info(f"Parsed plan with {len(plan['milestones'])} milestones, {phase_count} phases, {module_count} modules, and {feature_count} features")
        
        return plan
    
    def _extract_milestones(self, markdown_text: str) -> List[Dict[str, Any]]:
        """
        Extract milestone sections from markdown text.
        
        Args:
            markdown_text: The markdown text to parse
            
        Returns:
            List of dictionaries containing milestone data
        """
        # Normalize line endings and clean up the text
        markdown_text = markdown_text.replace('\r\n', '\n').strip()
        
        # Look for top-level milestone headers (either # Milestone or ## Milestone)
        milestone_pattern = r'(?:^|\n)#{1,2}\s+Milestone[:\s]+([^\n]+)(?:\n|$)'
        milestone_matches = re.finditer(milestone_pattern, markdown_text, re.MULTILINE)
        
        milestones = []
        
        # Process each milestone match
        for i, m in enumerate(milestone_matches):
            milestone_name = m.group(1).strip()
            start_pos = m.start()
            
            # Find the start of the next milestone or end of text
            next_match = re.search(milestone_pattern, markdown_text[start_pos + 1:], re.MULTILINE)
            if next_match:
                end_pos = start_pos + 1 + next_match.start()
            else:
                end_pos = len(markdown_text)
            
            milestone_text = markdown_text[start_pos:end_pos]
            
            # Create milestone object
            milestone = {
                "name": milestone_name,
                "description": self._extract_description(milestone_text),
                "raw_text": milestone_text,
                "index": i
            }
            
            milestones.append(milestone)
        
        # If no milestones found, check if the entire text is one milestone
        if not milestones and markdown_text:
            # Look for phase headers to determine if this is a single milestone
            phase_pattern = r'(?:^|\n)#{1,3}\s+Phase[:\s]+([^\n]+)(?:\n|$)'
            if re.search(phase_pattern, markdown_text, re.MULTILINE):
                milestones.append({
                    "name": "Unnamed Milestone",
                    "description": self._extract_description(markdown_text),
                    "raw_text": markdown_text,
                    "index": 0
                })
        
        return milestones
    
    def _extract_description(self, text: str) -> str:
        """
        Extract description text from a section.
        
        Args:
            text: Section text to parse
            
        Returns:
            Description text
        """
        # Remove the header line
        lines = text.split('\n')
        if lines and (lines[0].startswith('#') or lines[0].startswith('Milestone') or lines[0].startswith('Phase')):
            lines = lines[1:]
        
        # Find the first paragraph after the header
        description = []
        for line in lines:
            line = line.strip()
            # Skip empty lines at the beginning
            if not description and not line:
                continue
            # Stop at the next header or section
            if line.startswith('#') or line.startswith('Phase') or line.startswith('Module') or line.startswith('Feature'):
                break
            description.append(line)
        
        return ' '.join(description).strip()
    
    def _process_milestone(self, milestone: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a milestone dictionary into the final structured format.
        
        Args:
            milestone: Dictionary containing milestone data
            
        Returns:
            Processed milestone dictionary
        """
        milestone_slug = self._create_slug(milestone["name"])
        milestone_id = f"milestone-{milestone_slug}"
        
        # Extract phases from the milestone text
        phases = self._extract_phases(milestone["raw_text"])
        processed_phases = []
        
        for i, phase in enumerate(phases):
            processed_phase = self._process_phase(phase, i + 1)
            if processed_phase:
                processed_phases.append(processed_phase)
        
        # Create the final milestone structure
        result = {
            "id": milestone_id,
            "name": milestone["name"],
            "description": milestone["description"],
            "status": "not_started",  # Default status
            "phases": processed_phases,
            "type": "milestone"
        }
        
        return result
    
    def _extract_phases(self, milestone_text: str) -> List[Dict[str, Any]]:
        """
        Extract phase sections from milestone text.
        
        Args:
            milestone_text: Milestone text to parse
            
        Returns:
            List of dictionaries containing phase data
        """
        # Look for phase headers
        phase_pattern = r'(?:^|\n)#{1,3}\s+Phase[:\s]+([^\n]+)(?:\n|$)'
        phase_matches = re.finditer(phase_pattern, milestone_text, re.MULTILINE)
        
        phases = []
        
        # Process each phase match
        for i, m in enumerate(phase_matches):
            phase_name = m.group(1).strip()
            start_pos = m.start()
            
            # Find the start of the next phase or end of text
            next_match = re.search(phase_pattern, milestone_text[start_pos + 1:], re.MULTILINE)
            if next_match:
                end_pos = start_pos + 1 + next_match.start()
            else:
                end_pos = len(milestone_text)
            
            phase_text = milestone_text[start_pos:end_pos]
            
            # Create phase object
            phase = {
                "name": phase_name,
                "description": self._extract_description(phase_text),
                "raw_text": phase_text,
                "index": i
            }
            
            phases.append(phase)
        
        return phases
    
    def _process_phase(self, phase: Dict[str, Any], phase_number: int) -> Dict[str, Any]:
        """
        Process a phase dictionary into the final structured format.
        
        Args:
            phase: Dictionary containing phase data
            phase_number: The phase number
            
        Returns:
            Processed phase dictionary
        """
        phase_id = f"phase-{phase_number:02d}"
        
        # Extract modules from the phase text
        modules = self._extract_modules(phase["raw_text"])
        processed_modules = []
        
        for i, module in enumerate(modules):
            processed_module = self._process_module(module)
            if processed_module:
                processed_modules.append(processed_module)
        
        # If no explicit modules were found, check for direct feature lists
        if not processed_modules:
            features = self._extract_features(phase["raw_text"])
            if features:
                # Create a default module for these features
                default_module = {
                    "id": f"module-default-{phase_id}",
                    "name": f"{phase['name']} Features",
                    "description": "Default module containing phase features",
                    "features": [self._process_feature(feature) for feature in features],
                    "status": "not_started",
                    "type": "module"
                }
                processed_modules.append(default_module)
        
        # Create the final phase structure
        result = {
            "id": phase_id,
            "name": phase["name"],
            "description": phase["description"],
            "modules": processed_modules,
            "status": "not_started",
            "type": "phase"
        }
        
        return result
    
    def _extract_modules(self, phase_text: str) -> List[Dict[str, Any]]:
        """
        Extract module sections from phase text.
        
        Args:
            phase_text: Phase text to parse
            
        Returns:
            List of dictionaries containing module data
        """
        # Look for module headers
        module_pattern = r'(?:^|\n)#{1,4}\s+Module[:\s]+([^\n]+)(?:\n|$)'
        module_matches = re.finditer(module_pattern, phase_text, re.MULTILINE)
        
        modules = []
        
        # Process each module match
        for i, m in enumerate(module_matches):
            module_name = m.group(1).strip()
            start_pos = m.start()
            
            # Find the start of the next module or end of text
            next_match = re.search(module_pattern, phase_text[start_pos + 1:], re.MULTILINE)
            if next_match:
                end_pos = start_pos + 1 + next_match.start()
            else:
                end_pos = len(phase_text)
            
            module_text = phase_text[start_pos:end_pos]
            
            # Create module object
            module = {
                "name": module_name,
                "description": self._extract_description(module_text),
                "raw_text": module_text,
                "index": i
            }
            
            modules.append(module)
        
        return modules
    
    def _process_module(self, module: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a module dictionary into the final structured format.
        
        Args:
            module: Dictionary containing module data
            
        Returns:
            Processed module dictionary
        """
        module_slug = self._create_slug(module["name"])
        module_id = f"module-{module_slug}"
        
        # Extract features from the module text
        features = self._extract_features(module["raw_text"])
        processed_features = []
        
        for feature in features:
            processed_feature = self._process_feature(feature)
            if processed_feature:
                processed_features.append(processed_feature)
        
        # Create the final module structure
        result = {
            "id": module_id,
            "name": module["name"],
            "description": module["description"],
            "features": processed_features,
            "status": "not_started",
            "type": "module"
        }
        
        return result
    
    def _extract_features(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract feature items from text.
        
        Args:
            text: Text to parse
            
        Returns:
            List of dictionaries containing feature data
        """
        features = []
        
        # Try different feature patterns
        patterns = [
            # Bullet point followed by feature name and optional description
            r'(?:^|\n)[*\-•]\s+(?:Feature[:\s]+)?([^:\n]+)(?::?\s+([^\n]+))?',
            # Numbered list with feature name and optional description
            r'(?:^|\n)\d+\.\s+(?:Feature[:\s]+)?([^:\n]+)(?::?\s+([^\n]+))?',
            # Feature header with name
            r'(?:^|\n)#{1,5}\s+Feature[:\s]+([^\n]+)(?:\n|$)'
        ]
        
        for pattern in patterns:
            feature_matches = re.finditer(pattern, text, re.MULTILINE)
            
            for i, m in enumerate(feature_matches):
                feature_name = m.group(1).strip()
                feature_description = m.group(2).strip() if len(m.groups()) > 1 and m.group(2) else ""
                
                # Skip non-features (often seen in bullet lists with other content)
                skip_prefixes = ["phase", "module", "milestone", "implement"]
                if any(feature_name.lower().startswith(prefix) for prefix in skip_prefixes):
                    continue
                
                # Create feature object
                feature = {
                    "name": feature_name,
                    "description": feature_description,
                    "index": i
                }
                
                features.append(feature)
        
        return features
    
    def _process_feature(self, feature: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a feature dictionary into the final structured format.
        
        Args:
            feature: Dictionary containing feature data
            
        Returns:
            Processed feature dictionary
        """
        feature_id = f"feature-{str(uuid.uuid4())[:8]}"
        
        # Create the final feature structure
        result = {
            "id": feature_id,
            "name": feature["name"],
            "description": feature["description"],
            "status": "not_started",
            "type": "feature"
        }
        
        return result
    
    def _create_slug(self, name: str) -> str:
        """
        Create a URL-friendly slug from a name.
        
        Args:
            name: Name to convert to slug
            
        Returns:
            Slug string
        """
        # Convert to lowercase and replace spaces with hyphens
        slug = name.lower().strip()
        # Remove special characters
        slug = re.sub(r'[^a-z0-9\s-]', '', slug)
        # Replace spaces with hyphens
        slug = re.sub(r'\s+', '-', slug)
        # Remove consecutive hyphens
        slug = re.sub(r'-+', '-', slug)
        # Trim hyphens from beginning and end
        slug = slug.strip('-')
        
        return slug
    
    def generate_json(self, plan: Dict[str, Any], output_file: Optional[str] = None) -> str:
        """
        Generate JSON from the parsed plan structure.
        
        Args:
            plan: The parsed plan dictionary
            output_file: Path to save JSON (optional)
            
        Returns:
            JSON string representation of the plan
        """
        # Generate the JSON string
        json_str = json.dumps(plan, indent=2)
        
        # Write to file if output_file is specified
        if output_file:
            with open(output_file, 'w') as f:
                f.write(json_str)
            logger.info(f"Plan JSON saved to {output_file}")
        
        return json_str
    
    def convert_to_roadmap_format(self, plan: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert the parsed plan to the format expected by the Roadmap UI component.
        
        Args:
            plan: The parsed plan dictionary
            
        Returns:
            Plan formatted for the Roadmap UI
        """
        roadmap_data = []
        
        # Process each milestone
        for milestone in plan.get("milestones", []):
            roadmap_milestone = {
                "id": milestone["id"],
                "name": milestone["name"],
                "type": "milestone",
                "status": milestone.get("status", "not_started"),
                "children": []
            }
            
            # Convert status format to roadmap format (replace underscores with hyphens)
            roadmap_milestone["status"] = roadmap_milestone["status"].replace("_", "-")
            
            # Process each phase
            for phase in milestone.get("phases", []):
                roadmap_phase = {
                    "id": phase["id"],
                    "name": phase["name"],
                    "type": "phase",
                    "status": phase.get("status", "not_started").replace("_", "-"),
                    "children": []
                }
                
                # Process each module
                for module in phase.get("modules", []):
                    roadmap_module = {
                        "id": module["id"],
                        "name": module["name"],
                        "type": "module",
                        "status": module.get("status", "not_started").replace("_", "-"),
                        "children": []
                    }
                    
                    # Process each feature
                    for feature in module.get("features", []):
                        roadmap_feature = {
                            "id": feature["id"],
                            "name": feature["name"],
                            "type": "feature",
                            "status": feature.get("status", "not_started").replace("_", "-")
                        }
                        
                        roadmap_module["children"].append(roadmap_feature)
                    
                    roadmap_phase["children"].append(roadmap_module)
                
                roadmap_milestone["children"].append(roadmap_phase)
            
            roadmap_data.append(roadmap_milestone)
        
        return {
            "milestones": roadmap_data
        }


if __name__ == "__main__":
    # Example usage
    import argparse
    
    parser = argparse.ArgumentParser(description="Parse Claude markdown plans into structured data")
    parser.add_argument("input_file", help="Path to the markdown plan file")
    parser.add_argument("--output", "-o", help="Path to save the output JSON")
    parser.add_argument("--roadmap", "-r", action="store_true", help="Convert to Roadmap UI format")
    
    args = parser.parse_args()
    
    try:
        with open(args.input_file, 'r') as f:
            markdown_text = f.read()
        
        planning_parser = PlanningAgentParser()
        plan = planning_parser.parse_plan(markdown_text)
        
        if args.roadmap:
            plan = planning_parser.convert_to_roadmap_format(plan)
        
        if args.output:
            planning_parser.generate_json(plan, args.output)
            print(f"Plan saved to {args.output}")
        else:
            print(json.dumps(plan, indent=2))
            
    except Exception as e:
        print(f"Error: {e}")