#!/usr/bin/env python3
"""
Knowledge Graph Manager

A unified tool for managing features, tasks, and other entities in the knowledge graph.
This replaces the need to create individual scripts for each addition or update.

Usage:
  kg_manager.py add feature <name> --description=<desc> [--milestone=<ms>] [--module=<mod>] [--phase=<phase>] [--priority=<pri>]
  kg_manager.py add task <feature_id> <name> --description=<desc> [--status=<status>] [--priority=<pri>] [--owner=<owner>]
  kg_manager.py update task <task_id> --status=<status> [--progress=<prog>] [--notes=<notes>]
  kg_manager.py add dependency <from_id> <to_id> [--description=<desc>]
  kg_manager.py add milestone <name> --description=<desc>
  kg_manager.py add module <milestone_id> <name> --description=<desc>
  kg_manager.py add phase <milestone_id> <name> --description=<desc>
  kg_manager.py list features [--milestone=<ms>] [--module=<mod>] [--phase=<phase>]
  kg_manager.py list tasks [--feature=<feat>] [--status=<status>]
  kg_manager.py show <entity_id>
  kg_manager.py search <query>

Options:
  -h --help                   Show this help
  --description=<desc>        Description of the entity
  --milestone=<ms>            Milestone name or ID
  --module=<mod>              Module name or ID
  --phase=<phase>             Phase name or ID
  --priority=<pri>            Priority (low, medium, high)
  --status=<status>           Status (not_started, in_progress, blocked, completed)
  --progress=<prog>           Progress percentage (0-100)
  --owner=<owner>             Owner of the task
  --notes=<notes>             Additional notes
"""

import os
import sys
import json
import time
from datetime import datetime
import argparse
import uuid
import re

# Add project root to path
sys.path.append('/mnt/c/Users/angel/Devloop')

# Try to import real implementation, fall back to stub
try:
    from agents.utils.knowledge_graph import KnowledgeGraph
except ImportError:
    print("Warning: Real KnowledgeGraph implementation not found. Using stub that simulates operations.")
    
    # Stub implementation for demonstration
    class StubNeo4j:
        def __init__(self):
            self.entities = {}
            self.relationships = []
            
        def create_entity(self, entity_id, labels, properties):
            # This method needs to update the shared entities dictionary
            self.entities[entity_id] = {
                "id": entity_id,
                "labels": labels,
                "properties": properties
            }
            print(f"[NEO4J] Created entity {entity_id} with labels {labels}")
            return self.entities[entity_id]
            
        def create_relationship(self, from_id, to_id, relation_type, properties=None):
            if properties is None:
                properties = {}
            
            rel = {
                "from": from_id,
                "to": to_id,
                "type": relation_type,
                "properties": properties
            }
            self.relationships.append(rel)
            print(f"[NEO4J] Created relationship ({from_id})-[:{relation_type}]->({to_id})")
            return rel
            
        def get_entity(self, entity_id):
            return self.entities.get(entity_id)
            
        def query(self, query, **params):
            print(f"[NEO4J] Would execute: {query}")
            print(f"[NEO4J] With params: {params}")
            return []
            
    class StubMongoDB:
        def __init__(self):
            self.collections = {
                "entities": {},
                "tasks": {},
                "features": {}
            }
            
        def store_entity(self, collection, entity_id, data):
            if collection not in self.collections:
                self.collections[collection] = {}
            
            self.collections[collection][entity_id] = {
                "_id": entity_id,
                **data,
                "updated_at": datetime.now().isoformat()
            }
            print(f"[MONGODB] Stored in {collection}: {entity_id}")
            
        def get_entity(self, collection, entity_id):
            if collection not in self.collections:
                return None
            return self.collections[collection].get(entity_id)
            
    class StubRedis:
        def __init__(self):
            self.data = {}
            self.streams = {}
            
        def set(self, key, value, ex=None):
            self.data[key] = {
                "value": value,
                "expires_at": time.time() + ex if ex else None
            }
            print(f"[REDIS] Set {key} (TTL: {ex}s)")
            
        def get(self, key):
            item = self.data.get(key)
            if not item:
                return None
                
            if item["expires_at"] and time.time() > item["expires_at"]:
                del self.data[key]
                return None
                
            return item["value"]
            
        def xadd(self, stream, fields):
            if stream not in self.streams:
                self.streams[stream] = []
                
            event_id = f"{int(time.time() * 1000)}-{len(self.streams[stream])}"
            self.streams[stream].append({
                "id": event_id,
                "fields": fields
            })
            print(f"[REDIS] Added event to stream {stream}")
            return event_id
            
    class KnowledgeGraph:
        def __init__(self, config=None):
            # Create storage directory
            self.storage_dir = os.path.expanduser("~/.kg_manager")
            os.makedirs(self.storage_dir, exist_ok=True)
            
            # Load or initialize storage files
            self.entities_file = os.path.join(self.storage_dir, "entities.json")
            self.relationships_file = os.path.join(self.storage_dir, "relationships.json")
            
            self.entities = {}
            self.relationships = []
            
            # Load existing data from disk
            self._load_data()
            
            # Initialize stubs with references to our data
            self.long_term = StubNeo4j()
            self.long_term.entities = self.entities  # Share the entities dict
            
            self.medium_term = StubMongoDB()
            self.short_term = StubRedis()
            self.vectors = None  # Not needed for stub
            self.events = self.short_term  # Simplified
            
        def _load_data(self):
            # Load entities
            if os.path.exists(self.entities_file):
                try:
                    with open(self.entities_file, 'r') as f:
                        self.entities = json.load(f)
                except:
                    self.entities = {}
            
            # Load relationships
            if os.path.exists(self.relationships_file):
                try:
                    with open(self.relationships_file, 'r') as f:
                        self.relationships = json.load(f)
                except:
                    self.relationships = []
                        
        def _save_data(self):
            # Make sure the directory exists
            os.makedirs(os.path.dirname(self.entities_file), exist_ok=True)
            
            # Save entities
            with open(self.entities_file, 'w') as f:
                json.dump(self.entities, f, indent=2)
                
            # Save relationships
            with open(self.relationships_file, 'w') as f:
                json.dump(self.relationships, f, indent=2)
                
            # Print a message for debugging
            print(f"Saved {len(self.entities)} entities and {len(self.relationships)} relationships to {self.storage_dir}")
            
        def store_fact(self, entity_id, attribute, value, ttl=None):
            # Update the entity in our stub storage
            if entity_id not in self.entities:
                self.entities[entity_id] = {
                    "id": entity_id,
                    "attributes": {}
                }
                
            self.entities[entity_id]["attributes"][attribute] = {
                "value": value,
                "updated_at": datetime.now().isoformat()
            }
            
            # Also update in the appropriate tier
            if ttl and ttl < 60:
                self.short_term.set(f"{entity_id}:{attribute}", value, ex=ttl)
            else:
                # Update in Neo4j stub
                entity = self.long_term.get_entity(entity_id)
                if entity:
                    entity["properties"][attribute] = value
                    print(f"[NEO4J] Updated property {attribute} on {entity_id}")
                    
            # Save to disk
            self._save_data()
            
            # Publish event
            self.events.xadd("knowledge_changes", {
                "type": "fact_updated",
                "entity_id": entity_id,
                "attribute": attribute,
                "value": str(value)[:100]
            })
            
        def create_relationship(self, from_id, to_id, relation_type, properties=None):
            if properties is None:
                properties = {}
                
            # Create in Neo4j stub
            rel = self.long_term.create_relationship(from_id, to_id, relation_type, properties)
            
            # Add to our stub storage
            relationship = {
                "from": from_id,
                "to": to_id,
                "type": relation_type,
                "properties": properties,
                "created_at": datetime.now().isoformat()
            }
            self.relationships.append(relationship)
            
            # Save to disk
            self._save_data()
            
            # Publish event
            self.events.xadd("knowledge_changes", {
                "type": "relationship_created",
                "from_id": from_id,
                "to_id": to_id,
                "relation_type": relation_type
            })
            
            return relationship

        def get_entity(self, entity_id):
            return self.entities.get(entity_id)
            
        def find_entities(self, query=None, labels=None):
            """Find entities matching criteria"""
            results = []
            
            for entity_id, entity in self.entities.items():
                # Skip if labels don't match
                if labels and not any(label in entity.get("labels", []) for label in labels):
                    continue
                    
                # Skip if query doesn't match any property
                if query:
                    query = query.lower()
                    matched = False
                    
                    # Check ID
                    if query in entity_id.lower():
                        matched = True
                        
                    # Check properties
                    for key, value in entity.get("properties", {}).items():
                        if isinstance(value, str) and query in value.lower():
                            matched = True
                            break
                            
                    # Check attributes
                    for key, attr in entity.get("attributes", {}).items():
                        if isinstance(attr.get("value"), str) and query in attr.get("value").lower():
                            matched = True
                            break
                            
                    if not matched:
                        continue
                
                results.append(entity)
                
            return results
            
        def find_relationships(self, from_id=None, to_id=None, relation_type=None):
            """Find relationships matching criteria"""
            results = []
            
            for rel in self.relationships:
                if from_id and rel["from"] != from_id:
                    continue
                    
                if to_id and rel["to"] != to_id:
                    continue
                    
                if relation_type and rel["type"] != relation_type:
                    continue
                    
                results.append(rel)
                
            return results

# Utility Functions
def generate_id(prefix, name):
    """Generate a stable ID from a name"""
    safe_name = re.sub(r'[^a-zA-Z0-9_]', '_', name.lower())
    return f"{prefix}:{safe_name}"

def format_date():
    """Return current date in ISO format"""
    return datetime.now().isoformat()

# Command Implementations
def add_feature(args):
    """Add a new feature to the knowledge graph"""
    kg = KnowledgeGraph()
    
    # Generate feature ID
    feature_id = generate_id("feature", args.name)
    
    # Create feature entity
    properties = {
        "name": args.name,
        "description": args.description,
        "status": "not_started",
        "created_at": format_date(),
        "priority": args.priority or "medium"
    }
    
    # Create the entity in Neo4j stub
    kg.long_term.create_entity(feature_id, ["Feature"], properties)
    
    # Store in medium-term memory too
    kg.medium_term.store_entity("features", feature_id, properties)
    
    # Explicitly save data to ensure entities are written to disk
    kg._save_data()
    
    # Connect to milestone if specified
    if args.milestone:
        milestone_id = generate_id("milestone", args.milestone)
        kg.create_relationship(milestone_id, feature_id, "CONTAINS_FEATURE")
        
    # Connect to module if specified
    if args.module:
        module_id = generate_id("module", args.module)
        kg.create_relationship(module_id, feature_id, "CONTAINS_FEATURE")
        
    # Connect to phase if specified
    if args.phase:
        phase_id = generate_id("phase", args.phase)
        kg.create_relationship(phase_id, feature_id, "CONTAINS_FEATURE")
    
    print(f"Added feature '{args.name}' with ID '{feature_id}'")
    return feature_id

def add_task(args):
    """Add a new task to a feature"""
    kg = KnowledgeGraph()
    
    # Generate task ID
    task_id = generate_id("task", args.name)
    
    # Create task entity
    properties = {
        "name": args.name,
        "description": args.description,
        "status": args.status or "not_started",
        "created_at": format_date(),
        "priority": args.priority or "medium",
        "progress": 0
    }
    
    if args.owner:
        properties["owner"] = args.owner
    
    kg.long_term.create_entity(task_id, ["Task"], properties)
    
    # Store in medium-term memory too
    kg.medium_term.store_entity("tasks", task_id, properties)
    
    # Connect to feature
    kg.create_relationship(args.feature_id, task_id, "HAS_TASK")
    
    print(f"Added task '{args.name}' with ID '{task_id}' to feature '{args.feature_id}'")
    return task_id

def update_task(args):
    """Update a task's status and progress"""
    kg = KnowledgeGraph()
    
    # Get existing task
    task = kg.get_entity(args.task_id)
    if not task:
        print(f"Task '{args.task_id}' not found")
        return None
    
    # Update properties
    updates = {}
    
    if args.status:
        updates["status"] = args.status
        
    if args.progress:
        updates["progress"] = int(args.progress)
        
    if args.notes:
        updates["notes"] = args.notes
        
    # Apply updates
    for key, value in updates.items():
        kg.store_fact(args.task_id, key, value)
    
    # Update last_modified
    kg.store_fact(args.task_id, "last_modified", format_date())
    
    print(f"Updated task '{args.task_id}'")
    return args.task_id

def add_dependency(args):
    """Add a dependency relationship between entities"""
    kg = KnowledgeGraph()
    
    # Create relationship
    properties = {}
    if args.description:
        properties["description"] = args.description
        
    properties["created_at"] = format_date()
    
    kg.create_relationship(args.from_id, args.to_id, "DEPENDS_ON", properties)
    
    print(f"Added dependency '{args.from_id}' -> '{args.to_id}'")
    return True

def add_milestone(args):
    """Add a new milestone"""
    kg = KnowledgeGraph()
    
    # Generate milestone ID
    milestone_id = generate_id("milestone", args.name)
    
    # Create milestone entity
    properties = {
        "name": args.name,
        "description": args.description,
        "created_at": format_date(),
        "status": "not_started"
    }
    
    kg.long_term.create_entity(milestone_id, ["Milestone"], properties)
    
    print(f"Added milestone '{args.name}' with ID '{milestone_id}'")
    return milestone_id

def add_module(args):
    """Add a new module to a milestone"""
    kg = KnowledgeGraph()
    
    # Generate module ID
    module_id = generate_id("module", args.name)
    
    # Create module entity
    properties = {
        "name": args.name,
        "description": args.description,
        "created_at": format_date()
    }
    
    kg.long_term.create_entity(module_id, ["Module"], properties)
    
    # Connect to milestone
    kg.create_relationship(args.milestone_id, module_id, "CONTAINS_MODULE")
    
    print(f"Added module '{args.name}' with ID '{module_id}' to milestone '{args.milestone_id}'")
    return module_id

def add_phase(args):
    """Add a new phase to a milestone"""
    kg = KnowledgeGraph()
    
    # Generate phase ID
    phase_id = generate_id("phase", args.name)
    
    # Create phase entity
    properties = {
        "name": args.name,
        "description": args.description,
        "created_at": format_date()
    }
    
    kg.long_term.create_entity(phase_id, ["Phase"], properties)
    
    # Connect to milestone
    kg.create_relationship(args.milestone_id, phase_id, "CONTAINS_PHASE")
    
    print(f"Added phase '{args.name}' with ID '{phase_id}' to milestone '{args.milestone_id}'")
    return phase_id

def list_features(args):
    """List features matching criteria"""
    kg = KnowledgeGraph()
    
    # Find features
    features = kg.find_entities(labels=["Feature"])
    
    # Filter by milestone if specified
    if args.milestone:
        milestone_id = generate_id("milestone", args.milestone)
        milestone_features = []
        
        rels = kg.find_relationships(from_id=milestone_id, relation_type="CONTAINS_FEATURE")
        feature_ids = [rel["to"] for rel in rels]
        
        for feature in features:
            if feature.get("id") in feature_ids:
                milestone_features.append(feature)
                
        features = milestone_features
    
    # Filter by module if specified
    if args.module:
        module_id = generate_id("module", args.module)
        module_features = []
        
        rels = kg.find_relationships(from_id=module_id, relation_type="CONTAINS_FEATURE")
        feature_ids = [rel["to"] for rel in rels]
        
        for feature in features:
            if feature.get("id") in feature_ids:
                module_features.append(feature)
                
        features = module_features
        
    # Filter by phase if specified
    if args.phase:
        phase_id = generate_id("phase", args.phase)
        phase_features = []
        
        rels = kg.find_relationships(from_id=phase_id, relation_type="CONTAINS_FEATURE")
        feature_ids = [rel["to"] for rel in rels]
        
        for feature in features:
            if feature.get("id") in feature_ids:
                phase_features.append(feature)
                
        features = phase_features
    
    # Display results
    if not features:
        print("No features found matching criteria")
        return []
        
    print(f"Found {len(features)} features:")
    for feature in features:
        props = feature.get("properties", {})
        attrs = feature.get("attributes", {})
        
        status = attrs.get("status", {}).get("value") if "status" in attrs else props.get("status", "unknown")
        priority = attrs.get("priority", {}).get("value") if "priority" in attrs else props.get("priority", "medium")
        
        print(f"  - {props.get('name')} ({feature.get('id')})")
        print(f"    Status: {status}, Priority: {priority}")
        print(f"    {props.get('description', '')[:80]}...")
        print()
        
    return features

def list_tasks(args):
    """List tasks matching criteria"""
    kg = KnowledgeGraph()
    
    # Find tasks
    tasks = kg.find_entities(labels=["Task"])
    
    # Filter by feature if specified
    if args.feature:
        feature_tasks = []
        
        rels = kg.find_relationships(from_id=args.feature, relation_type="HAS_TASK")
        task_ids = [rel["to"] for rel in rels]
        
        for task in tasks:
            if task.get("id") in task_ids:
                feature_tasks.append(task)
                
        tasks = feature_tasks
    
    # Filter by status if specified
    if args.status:
        status_tasks = []
        
        for task in tasks:
            props = task.get("properties", {})
            attrs = task.get("attributes", {})
            
            status = attrs.get("status", {}).get("value") if "status" in attrs else props.get("status", "unknown")
            
            if status == args.status:
                status_tasks.append(task)
                
        tasks = status_tasks
    
    # Display results
    if not tasks:
        print("No tasks found matching criteria")
        return []
        
    print(f"Found {len(tasks)} tasks:")
    for task in tasks:
        props = task.get("properties", {})
        attrs = task.get("attributes", {})
        
        status = attrs.get("status", {}).get("value") if "status" in attrs else props.get("status", "unknown")
        priority = attrs.get("priority", {}).get("value") if "priority" in attrs else props.get("priority", "medium")
        progress = attrs.get("progress", {}).get("value") if "progress" in attrs else props.get("progress", 0)
        
        print(f"  - {props.get('name')} ({task.get('id')})")
        print(f"    Status: {status}, Priority: {priority}, Progress: {progress}%")
        print(f"    {props.get('description', '')[:80]}...")
        print()
        
    return tasks

def show_entity(args):
    """Show details of a specific entity"""
    kg = KnowledgeGraph()
    
    # Get entity
    entity = kg.get_entity(args.entity_id)
    if not entity:
        print(f"Entity '{args.entity_id}' not found")
        return None
        
    # Get relationships
    out_rels = kg.find_relationships(from_id=args.entity_id)
    in_rels = kg.find_relationships(to_id=args.entity_id)
    
    # Display entity details
    print(f"Entity: {args.entity_id}")
    print(f"Labels: {', '.join(entity.get('labels', []))}")
    print()
    
    print("Properties:")
    for key, value in entity.get("properties", {}).items():
        print(f"  {key}: {value}")
        
    print()
    
    print("Attributes:")
    for key, attr in entity.get("attributes", {}).items():
        print(f"  {key}: {attr.get('value')} (updated: {attr.get('updated_at')})")
        
    print()
    
    print(f"Outgoing Relationships ({len(out_rels)}):")
    for rel in out_rels:
        print(f"  -[{rel['type']}]-> {rel['to']}")
        
    print()
    
    print(f"Incoming Relationships ({len(in_rels)}):")
    for rel in in_rels:
        print(f"  <-[{rel['type']}]- {rel['from']}")
        
    return entity

def search_entities(args):
    """Search for entities matching the query"""
    kg = KnowledgeGraph()
    
    # Find entities matching query
    entities = kg.find_entities(query=args.query)
    
    # Display results
    if not entities:
        print("No entities found matching query")
        return []
        
    print(f"Found {len(entities)} entities matching '{args.query}':")
    for entity in entities:
        props = entity.get("properties", {})
        
        print(f"  - {props.get('name', entity.get('id'))} ({entity.get('id')})")
        print(f"    Type: {', '.join(entity.get('labels', []))}")
        
        if "description" in props:
            print(f"    {props['description'][:80]}...")
            
        print()
        
    return entities

# Command Line Parser
def parse_args():
    parser = argparse.ArgumentParser(description="Knowledge Graph Manager")
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    # Add Feature
    add_feature_parser = subparsers.add_parser("add-feature", help="Add a new feature")
    add_feature_parser.add_argument("name", help="Feature name")
    add_feature_parser.add_argument("--description", required=True, help="Feature description")
    add_feature_parser.add_argument("--milestone", help="Milestone name or ID")
    add_feature_parser.add_argument("--module", help="Module name or ID")
    add_feature_parser.add_argument("--phase", help="Phase name or ID")
    add_feature_parser.add_argument("--priority", choices=["low", "medium", "high"], default="medium", help="Priority")
    
    # Add Task
    add_task_parser = subparsers.add_parser("add-task", help="Add a new task to a feature")
    add_task_parser.add_argument("feature_id", help="Feature ID")
    add_task_parser.add_argument("name", help="Task name")
    add_task_parser.add_argument("--description", required=True, help="Task description")
    add_task_parser.add_argument("--status", choices=["not_started", "in_progress", "blocked", "completed"], default="not_started", help="Status")
    add_task_parser.add_argument("--priority", choices=["low", "medium", "high"], default="medium", help="Priority")
    add_task_parser.add_argument("--owner", help="Task owner")
    
    # Update Task
    update_task_parser = subparsers.add_parser("update-task", help="Update a task")
    update_task_parser.add_argument("task_id", help="Task ID")
    update_task_parser.add_argument("--status", choices=["not_started", "in_progress", "blocked", "completed"], help="Status")
    update_task_parser.add_argument("--progress", type=int, choices=range(0, 101), help="Progress percentage (0-100)")
    update_task_parser.add_argument("--notes", help="Additional notes")
    
    # Add Dependency
    add_dependency_parser = subparsers.add_parser("add-dependency", help="Add a dependency relationship")
    add_dependency_parser.add_argument("from_id", help="Source entity ID")
    add_dependency_parser.add_argument("to_id", help="Target entity ID")
    add_dependency_parser.add_argument("--description", help="Dependency description")
    
    # Add Milestone
    add_milestone_parser = subparsers.add_parser("add-milestone", help="Add a new milestone")
    add_milestone_parser.add_argument("name", help="Milestone name")
    add_milestone_parser.add_argument("--description", required=True, help="Milestone description")
    
    # Add Module
    add_module_parser = subparsers.add_parser("add-module", help="Add a new module to a milestone")
    add_module_parser.add_argument("milestone_id", help="Milestone ID")
    add_module_parser.add_argument("name", help="Module name")
    add_module_parser.add_argument("--description", required=True, help="Module description")
    
    # Add Phase
    add_phase_parser = subparsers.add_parser("add-phase", help="Add a new phase to a milestone")
    add_phase_parser.add_argument("milestone_id", help="Milestone ID")
    add_phase_parser.add_argument("name", help="Phase name")
    add_phase_parser.add_argument("--description", required=True, help="Phase description")
    
    # List Features
    list_features_parser = subparsers.add_parser("list-features", help="List features")
    list_features_parser.add_argument("--milestone", help="Filter by milestone")
    list_features_parser.add_argument("--module", help="Filter by module")
    list_features_parser.add_argument("--phase", help="Filter by phase")
    
    # List Tasks
    list_tasks_parser = subparsers.add_parser("list-tasks", help="List tasks")
    list_tasks_parser.add_argument("--feature", help="Filter by feature ID")
    list_tasks_parser.add_argument("--status", choices=["not_started", "in_progress", "blocked", "completed"], help="Filter by status")
    
    # Show Entity
    show_entity_parser = subparsers.add_parser("show", help="Show entity details")
    show_entity_parser.add_argument("entity_id", help="Entity ID to show")
    
    # Search
    search_parser = subparsers.add_parser("search", help="Search for entities")
    search_parser.add_argument("query", help="Search query")
    
    return parser.parse_args()

# Main Function
def main():
    args = parse_args()
    
    if args.command == "add-feature":
        add_feature(args)
    elif args.command == "add-task":
        add_task(args)
    elif args.command == "update-task":
        update_task(args)
    elif args.command == "add-dependency":
        add_dependency(args)
    elif args.command == "add-milestone":
        add_milestone(args)
    elif args.command == "add-module":
        add_module(args)
    elif args.command == "add-phase":
        add_phase(args)
    elif args.command == "list-features":
        list_features(args)
    elif args.command == "list-tasks":
        list_tasks(args)
    elif args.command == "show":
        show_entity(args)
    elif args.command == "search":
        search_entities(args)
    else:
        print(__doc__)

if __name__ == "__main__":
    main()