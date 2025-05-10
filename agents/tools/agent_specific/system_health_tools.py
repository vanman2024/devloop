#!/usr/bin/env python3
"""
System Health Agent Tools

Provides specialized tools for the System Health Agent to monitor and maintain
the Devloop system health.
"""

import os
import json
import time
import logging
import re
from datetime import datetime
from typing import Dict, List, Any, Optional, Union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("system_health_tools")

# Import tool decorators
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from registry.tool_registry import tool, param_description
from core.base_tool import SystemTool


class SystemHealthTool(SystemTool):
    """Base class for system health tools"""
    
    def __init__(self, name: str = None, description: str = None):
        """Initialize the system health tool
        
        Args:
            name: Tool name
            description: Tool description
        """
        super().__init__(name, description)
        
        # Initialize health data storage
        self.health_path = os.path.join(os.path.dirname(__file__), "../../../system-core/maintenance/health")
        os.makedirs(self.health_path, exist_ok=True)


class LogAnalyzer(SystemHealthTool):
    """Tool for analyzing system logs for health issues"""
    
    def __init__(self):
        """Initialize the log analyzer"""
        super().__init__(name="analyze_logs", 
                         description="Analyze system logs for health issues")
        
        # Define log file patterns and paths
        self.log_dirs = [
            os.path.join(os.path.dirname(__file__), "../../../logs"),
            os.path.join(os.path.dirname(__file__), "../../../logs/server"),
            os.path.join(os.path.dirname(__file__), "../../../logs/ui"),
            os.path.join(os.path.dirname(__file__), "../../../logs/system")
        ]
        
        # Define patterns to look for
        self.error_patterns = [
            r"ERROR",
            r"CRITICAL",
            r"FATAL",
            r"Exception",
            r"Error:",
            r"failed",
            r"Traceback",
            r"stack trace"
        ]
        
        self.warning_patterns = [
            r"WARNING",
            r"WARN",
            r"Warning:",
            r"deprecated"
        ]
        
    @param_description({
        "log_types": "Types of logs to analyze (all, error, warning)",
        "time_range": "Time range to analyze in hours (0 for all)",
        "max_results": "Maximum number of issues to return"
    })
    def execute(self, log_types: str = "all", time_range: int = 24, 
                max_results: int = 20) -> Dict[str, Any]:
        """Analyze logs for health issues
        
        Args:
            log_types: Types of logs to analyze
            time_range: Time range to analyze in hours
            max_results: Maximum number of issues to return
            
        Returns:
            Log analysis results
        """
        # Calculate time cutoff
        cutoff_time = None
        if time_range > 0:
            cutoff_time = time.time() - (time_range * 3600)
            
        # Prepare patterns to match
        patterns = []
        if log_types == "all" or log_types == "error":
            patterns.extend(self.error_patterns)
        if log_types == "all" or log_types == "warning":
            patterns.extend(self.warning_patterns)
            
        # Compile patterns
        compiled_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in patterns]
        
        # Find log files
        log_files = []
        for log_dir in self.log_dirs:
            if os.path.exists(log_dir):
                for filename in os.listdir(log_dir):
                    if filename.endswith(".log"):
                        log_files.append(os.path.join(log_dir, filename))
                        
        # Analyze log files
        issues = []
        
        for log_file in log_files:
            try:
                # Check file modification time
                file_mtime = os.path.getmtime(log_file)
                if cutoff_time and file_mtime < cutoff_time:
                    continue
                    
                # Read file
                with open(log_file, 'r', errors='ignore') as f:
                    for line_number, line in enumerate(f, 1):
                        for pattern in compiled_patterns:
                            if pattern.search(line):
                                # Extract timestamp if possible
                                timestamp_match = re.search(r'\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}', line)
                                timestamp = timestamp_match.group(0) if timestamp_match else None
                                
                                # Determine issue type
                                issue_type = "warning"
                                for error_pattern in self.error_patterns:
                                    if re.search(error_pattern, line, re.IGNORECASE):
                                        issue_type = "error"
                                        break
                                        
                                # Add to issues list
                                issues.append({
                                    "file": os.path.basename(log_file),
                                    "line": line_number,
                                    "content": line.strip(),
                                    "type": issue_type,
                                    "timestamp": timestamp
                                })
                                
                                # Break to avoid matching the same line multiple times
                                break
                                
                        # Check if we've reached the limit
                        if len(issues) >= max_results:
                            break
                            
                    # Check if we've reached the limit
                    if len(issues) >= max_results:
                        break
            except Exception as e:
                logger.error(f"Error analyzing log file {log_file}: {e}")
                
        # Sort issues by timestamp (if available) or file modification time
        def get_sort_key(issue):
            if issue.get("timestamp"):
                try:
                    return datetime.strptime(issue["timestamp"], "%Y-%m-%d %H:%M:%S").timestamp()
                except ValueError:
                    try:
                        return datetime.strptime(issue["timestamp"], "%Y-%m-%dT%H:%M:%S").timestamp()
                    except ValueError:
                        pass
            return float("inf")
            
        issues.sort(key=get_sort_key, reverse=True)
        
        # Limit results
        issues = issues[:max_results]
        
        # Count by type
        error_count = sum(1 for issue in issues if issue["type"] == "error")
        warning_count = sum(1 for issue in issues if issue["type"] == "warning")
        
        return {
            "total_issues": len(issues),
            "error_count": error_count,
            "warning_count": warning_count,
            "log_files_analyzed": len(log_files),
            "time_range_hours": time_range,
            "issues": issues
        }


class HealthMonitor(SystemHealthTool):
    """Tool for monitoring and reporting system health"""
    
    def __init__(self):
        """Initialize the health monitor"""
        super().__init__(name="check_system_health", 
                         description="Check and report on system health")
                         
    @param_description({
        "components": "Components to check (all, api, ui, agents, database)",
        "check_level": "Level of detail for the health check (basic, detailed)",
        "save_report": "Whether to save the health report"
    })
    def execute(self, components: str = "all", check_level: str = "basic",
                save_report: bool = True) -> Dict[str, Any]:
        """Check system health
        
        Args:
            components: Components to check
            check_level: Level of detail for the health check
            save_report: Whether to save the health report
            
        Returns:
            Health check results
        """
        import psutil
        
        # Start with basic system metrics
        health_data = {
            "timestamp": datetime.now().isoformat(),
            "check_level": check_level,
            "system": {
                "cpu": {
                    "usage_percent": psutil.cpu_percent(interval=0.5),
                    "cores": psutil.cpu_count()
                },
                "memory": {
                    "total_gb": round(psutil.virtual_memory().total / (1024**3), 2),
                    "available_gb": round(psutil.virtual_memory().available / (1024**3), 2),
                    "percent_used": psutil.virtual_memory().percent
                },
                "disk": {
                    "total_gb": round(psutil.disk_usage('/').total / (1024**3), 2),
                    "free_gb": round(psutil.disk_usage('/').free / (1024**3), 2),
                    "percent_used": psutil.disk_usage('/').percent
                }
            },
            "components": {}
        }
        
        # Check API component
        if components in ["all", "api"]:
            api_health = self._check_api_health(detailed=(check_level == "detailed"))
            health_data["components"]["api"] = api_health
            
        # Check UI component
        if components in ["all", "ui"]:
            ui_health = self._check_ui_health(detailed=(check_level == "detailed"))
            health_data["components"]["ui"] = ui_health
            
        # Check Agent component
        if components in ["all", "agents"]:
            agent_health = self._check_agent_health(detailed=(check_level == "detailed"))
            health_data["components"]["agents"] = agent_health
            
        # Check Database component
        if components in ["all", "database"]:
            db_health = self._check_database_health(detailed=(check_level == "detailed"))
            health_data["components"]["database"] = db_health
            
        # Calculate overall health
        health_scores = []
        for component_name, component_data in health_data["components"].items():
            if "health_score" in component_data:
                health_scores.append(component_data["health_score"])
                
        if health_scores:
            health_data["overall_health_score"] = sum(health_scores) / len(health_scores)
            
            # Determine status based on score
            if health_data["overall_health_score"] >= 90:
                health_data["status"] = "excellent"
            elif health_data["overall_health_score"] >= 75:
                health_data["status"] = "good"
            elif health_data["overall_health_score"] >= 50:
                health_data["status"] = "fair"
            else:
                health_data["status"] = "poor"
        else:
            health_data["overall_health_score"] = 0
            health_data["status"] = "unknown"
            
        # Save health report if requested
        if save_report:
            report_file = os.path.join(self.health_path, f"health_report_{int(time.time())}.json")
            try:
                with open(report_file, 'w') as f:
                    json.dump(health_data, f, indent=2)
                health_data["report_saved"] = True
                health_data["report_path"] = report_file
            except Exception as e:
                logger.error(f"Error saving health report: {e}")
                health_data["report_saved"] = False
                health_data["report_error"] = str(e)
                
        return health_data
        
    def _check_api_health(self, detailed: bool = False) -> Dict[str, Any]:
        """Check API health
        
        Args:
            detailed: Whether to perform a detailed check
            
        Returns:
            API health data
        """
        import socket
        
        api_data = {
            "status": "unknown",
            "health_score": 0,
            "issues": []
        }
        
        # Check if API server is running (port 3000)
        api_running = False
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            result = sock.connect_ex(('localhost', 3000))
            sock.close()
            api_running = (result == 0)
        except:
            api_running = False
            
        api_data["is_running"] = api_running
        
        # Check API server PID file
        pid_file = os.path.join(os.path.dirname(__file__), "../../../api/server.pid")
        if os.path.exists(pid_file):
            try:
                with open(pid_file, 'r') as f:
                    pid = int(f.read().strip())
                    
                # Check if process is running
                try:
                    process = psutil.Process(pid)
                    api_data["process_running"] = True
                    api_data["process_name"] = process.name()
                    
                    if detailed:
                        api_data["process_details"] = {
                            "cpu_percent": process.cpu_percent(interval=0.1),
                            "memory_percent": process.memory_percent(),
                            "create_time": datetime.fromtimestamp(process.create_time()).isoformat(),
                            "uptime_seconds": time.time() - process.create_time()
                        }
                except psutil.NoSuchProcess:
                    api_data["process_running"] = False
                    api_data["issues"].append("API server process not running, but PID file exists")
            except:
                api_data["process_running"] = False
                api_data["issues"].append("Could not read API server PID file")
        else:
            api_data["process_running"] = False
            api_data["issues"].append("API server PID file not found")
            
        # Calculate health score
        if api_running and api_data.get("process_running", False):
            api_data["status"] = "healthy"
            api_data["health_score"] = 100
        elif api_running:
            api_data["status"] = "partial"
            api_data["health_score"] = 70
            api_data["issues"].append("API is accessible but process info missing")
        elif api_data.get("process_running", False):
            api_data["status"] = "degraded"
            api_data["health_score"] = 40
            api_data["issues"].append("API process is running but not accessible")
        else:
            api_data["status"] = "offline"
            api_data["health_score"] = 0
            api_data["issues"].append("API is offline")
            
        return api_data
        
    def _check_ui_health(self, detailed: bool = False) -> Dict[str, Any]:
        """Check UI health
        
        Args:
            detailed: Whether to perform a detailed check
            
        Returns:
            UI health data
        """
        ui_data = {
            "status": "unknown",
            "health_score": 0,
            "issues": []
        }
        
        # Check UI server PID file
        pid_file = os.path.join(os.path.dirname(__file__), "../../../system-core/ui-system/ui-server.log")
        ui_running = os.path.exists(pid_file)
            
        ui_data["is_running"] = ui_running
        
        # Look for UI processes
        ui_processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                cmdline = proc.info['cmdline']
                if cmdline and any('react' in cmd.lower() for cmd in cmdline):
                    ui_processes.append(proc)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
                
        ui_data["ui_process_count"] = len(ui_processes)
        
        if ui_processes and detailed:
            ui_data["processes"] = []
            for proc in ui_processes:
                try:
                    ui_data["processes"].append({
                        "pid": proc.pid,
                        "name": proc.name(),
                        "cpu_percent": proc.cpu_percent(interval=0.1),
                        "memory_percent": proc.memory_percent(),
                        "create_time": datetime.fromtimestamp(proc.create_time()).isoformat(),
                        "uptime_seconds": time.time() - proc.create_time()
                    })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
                    
        # Calculate health score
        if ui_running and ui_processes:
            ui_data["status"] = "healthy"
            ui_data["health_score"] = 100
        elif ui_running:
            ui_data["status"] = "degraded"
            ui_data["health_score"] = 50
            ui_data["issues"].append("UI log exists but no UI processes found")
        elif ui_processes:
            ui_data["status"] = "partial"
            ui_data["health_score"] = 70
            ui_data["issues"].append("UI processes found but no log file")
        else:
            ui_data["status"] = "offline"
            ui_data["health_score"] = 0
            ui_data["issues"].append("UI is offline")
            
        return ui_data
        
    def _check_agent_health(self, detailed: bool = False) -> Dict[str, Any]:
        """Check agent health
        
        Args:
            detailed: Whether to perform a detailed check
            
        Returns:
            Agent health data
        """
        agent_data = {
            "status": "unknown",
            "health_score": 0,
            "issues": []
        }
        
        # Check for active Python processes that might be agents
        agent_processes = []
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                if proc.name() in ['python', 'python3']:
                    cmdline = proc.info['cmdline']
                    if cmdline and any('agent' in cmd.lower() for cmd in cmdline):
                        agent_processes.append(proc)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
                
        agent_data["agent_process_count"] = len(agent_processes)
        
        if agent_processes and detailed:
            agent_data["processes"] = []
            for proc in agent_processes:
                try:
                    cmdline = proc.info['cmdline']
                    agent_type = None
                    for cmd in cmdline:
                        if 'agent' in cmd.lower():
                            agent_type = cmd
                            break
                            
                    agent_data["processes"].append({
                        "pid": proc.pid,
                        "type": agent_type,
                        "cpu_percent": proc.cpu_percent(interval=0.1),
                        "memory_percent": proc.memory_percent(),
                        "create_time": datetime.fromtimestamp(proc.create_time()).isoformat(),
                        "uptime_seconds": time.time() - proc.create_time()
                    })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
                    
        # Check if system-health-agent is running
        health_agent_running = False
        for proc in agent_processes:
            try:
                cmdline = proc.info['cmdline']
                if cmdline and any('system-health-agent' in cmd.lower() for cmd in cmdline):
                    health_agent_running = True
                    break
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
                
        agent_data["health_agent_running"] = health_agent_running
        
        # Calculate health score
        if health_agent_running and len(agent_processes) >= 2:
            agent_data["status"] = "healthy"
            agent_data["health_score"] = 100
        elif health_agent_running:
            agent_data["status"] = "partial"
            agent_data["health_score"] = 80
            agent_data["issues"].append("Health agent running but fewer agents than expected")
        elif agent_processes:
            agent_data["status"] = "degraded"
            agent_data["health_score"] = 50
            agent_data["issues"].append("Some agents running but health agent is offline")
        else:
            agent_data["status"] = "offline"
            agent_data["health_score"] = 0
            agent_data["issues"].append("No agent processes found")
            
        return agent_data
        
    def _check_database_health(self, detailed: bool = False) -> Dict[str, Any]:
        """Check database health
        
        Args:
            detailed: Whether to perform a detailed check
            
        Returns:
            Database health data
        """
        db_data = {
            "status": "unknown",
            "health_score": 0,
            "issues": []
        }
        
        # Check for memory directory (where we store JSON data)
        memory_dir = os.path.join(os.path.dirname(__file__), "../../../system-core/memory")
        memory_exists = os.path.exists(memory_dir)
        
        db_data["memory_directory_exists"] = memory_exists
        
        if memory_exists:
            # Check memory files
            memory_files = [f for f in os.listdir(memory_dir) if f.endswith('.json')]
            db_data["memory_file_count"] = len(memory_files)
            
            # Check for essential files
            essential_files = ['feature-registry.json', 'init-memory.json', 'memory-schema.json']
            missing_files = [f for f in essential_files if f not in memory_files]
            
            if missing_files:
                db_data["missing_essential_files"] = missing_files
                db_data["issues"].append(f"Missing essential memory files: {', '.join(missing_files)}")
                
            # Check file integrity
            if detailed:
                db_data["file_status"] = {}
                for memory_file in memory_files:
                    file_path = os.path.join(memory_dir, memory_file)
                    try:
                        with open(file_path, 'r') as f:
                            json.load(f)
                        db_data["file_status"][memory_file] = "valid"
                    except json.JSONDecodeError:
                        db_data["file_status"][memory_file] = "invalid_json"
                        db_data["issues"].append(f"Invalid JSON in {memory_file}")
                    except Exception as e:
                        db_data["file_status"][memory_file] = "error"
                        db_data["issues"].append(f"Error reading {memory_file}: {str(e)}")
        else:
            db_data["issues"].append("Memory directory not found")
            
        # Calculate health score
        if memory_exists and not db_data.get("missing_essential_files") and not db_data.get("issues"):
            db_data["status"] = "healthy"
            db_data["health_score"] = 100
        elif memory_exists and not db_data.get("missing_essential_files"):
            db_data["status"] = "degraded"
            db_data["health_score"] = 70
            db_data["issues"].append("Memory files exist but some have integrity issues")
        elif memory_exists:
            db_data["status"] = "impaired"
            db_data["health_score"] = 40
            db_data["issues"].append("Memory directory exists but missing essential files")
        else:
            db_data["status"] = "offline"
            db_data["health_score"] = 0
            db_data["issues"].append("Memory system is offline")
            
        return db_data


# Function-based tools using decorators

@tool(
    name="resolve_health_issue",
    description="Attempt to resolve a system health issue",
    categories=["health", "maintenance"],
    permissions=["system_maintenance"]
)
@param_description({
    "issue_type": "Type of issue to resolve (process, file, resource)",
    "component": "Affected component (api, ui, agent, database)",
    "action": "Resolution action to take (restart, cleanup, repair)",
    "specific_details": "Additional details specific to the issue"
})
def resolve_health_issue(issue_type: str, component: str, 
                        action: str, specific_details: Dict[str, Any] = None) -> Dict[str, Any]:
    """Attempt to resolve a system health issue
    
    Args:
        issue_type: Type of issue to resolve
        component: Affected component
        action: Resolution action to take
        specific_details: Additional details
        
    Returns:
        Resolution result
    """
    specific_details = specific_details or {}
    result = {
        "success": False,
        "issue_type": issue_type,
        "component": component,
        "action": action,
        "timestamp": datetime.now().isoformat()
    }
    
    # Handle process-related issues
    if issue_type == "process":
        if action == "restart":
            # Get the restart command for the component
            restart_commands = {
                "api": "cd /mnt/c/Users/angel/Devloop/api && node server.js &",
                "ui": "/mnt/c/Users/angel/Devloop/start-ui.sh",
                "agent": f"cd /mnt/c/Users/angel/Devloop/agents && python3 {component}",
                "database": "echo 'Database is file-based, no restart needed'"
            }
            
            if component in restart_commands:
                command = restart_commands[component]
                try:
                    # Execute command (using subprocess for background execution)
                    import subprocess
                    process = subprocess.Popen(command, shell=True)
                    
                    # Check if process started
                    if process.poll() is None:  # Still running
                        result["success"] = True
                        result["message"] = f"Restarted {component} with PID {process.pid}"
                        result["pid"] = process.pid
                    else:
                        result["message"] = f"Failed to restart {component}"
                except Exception as e:
                    result["message"] = f"Error restarting {component}: {str(e)}"
            else:
                result["message"] = f"No restart command configured for {component}"
                
    # Handle file-related issues
    elif issue_type == "file":
        if action == "cleanup":
            # Clean up log files or temporary files
            if component == "logs":
                log_dir = "/mnt/c/Users/angel/Devloop/logs"
                deleted_count = 0
                
                # Delete old log files
                try:
                    for filename in os.listdir(log_dir):
                        if filename.endswith(".log"):
                            file_path = os.path.join(log_dir, filename)
                            file_age_days = (time.time() - os.path.getmtime(file_path)) / (3600 * 24)
                            
                            # Delete if older than 30 days
                            if file_age_days > 30:
                                os.remove(file_path)
                                deleted_count += 1
                                
                    result["success"] = True
                    result["message"] = f"Cleaned up {deleted_count} old log files"
                    result["deleted_count"] = deleted_count
                except Exception as e:
                    result["message"] = f"Error cleaning up log files: {str(e)}"
            else:
                result["message"] = f"No cleanup procedure configured for {component} files"
                
    # Handle resource-related issues
    elif issue_type == "resource":
        if action == "repair":
            if component == "database" and specific_details.get("file"):
                # Repair a database file
                file_name = specific_details.get("file")
                file_path = os.path.join("/mnt/c/Users/angel/Devloop/system-core/memory", file_name)
                
                if os.path.exists(file_path):
                    try:
                        # Try to read and validate the file
                        with open(file_path, 'r') as f:
                            data = json.load(f)
                            
                        # Create a backup
                        backup_path = f"{file_path}.bak"
                        with open(backup_path, 'w') as f:
                            json.dump(data, f, indent=2)
                            
                        result["success"] = True
                        result["message"] = f"Repaired and backed up {file_name}"
                        result["backup_path"] = backup_path
                    except json.JSONDecodeError:
                        # File is corrupted, try to recover
                        try:
                            # Check if there's a backup
                            backup_path = f"{file_path}.bak"
                            if os.path.exists(backup_path):
                                with open(backup_path, 'r') as f:
                                    data = json.load(f)
                                    
                                # Restore from backup
                                with open(file_path, 'w') as f:
                                    json.dump(data, f, indent=2)
                                    
                                result["success"] = True
                                result["message"] = f"Restored {file_name} from backup"
                            else:
                                result["message"] = f"Could not repair {file_name}, no backup found"
                        except Exception as e:
                            result["message"] = f"Error repairing {file_name}: {str(e)}"
                    except Exception as e:
                        result["message"] = f"Error processing {file_name}: {str(e)}"
                else:
                    result["message"] = f"File {file_name} not found"
            else:
                result["message"] = f"No repair procedure configured for {component} resources"
    else:
        result["message"] = f"Unknown issue type: {issue_type}"
        
    # Record the resolution attempt
    log_dir = os.path.join(os.path.dirname(__file__), "../../../logs/maintenance")
    os.makedirs(log_dir, exist_ok=True)
    
    log_file = os.path.join(log_dir, f"health_resolution_{datetime.now().strftime('%Y-%m-%d')}.json")
    
    try:
        # Load existing log
        resolutions = []
        if os.path.exists(log_file):
            with open(log_file, 'r') as f:
                resolutions = json.load(f)
                
        # Add this resolution
        resolutions.append(result)
        
        # Save log
        with open(log_file, 'w') as f:
            json.dump(resolutions, f, indent=2)
            
        result["logged"] = True
    except Exception as e:
        logger.error(f"Error logging resolution: {e}")
        result["logged"] = False
        
    return result


# Register our tools
def register_system_health_tools():
    """Register all system health tools with the registry"""
    # Create and register class-based tools
    log_analyzer = LogAnalyzer()
    log_analyzer.register(
        categories=["health", "logs"],
        permissions=["system_maintenance"]
    )
    
    health_monitor = HealthMonitor()
    health_monitor.register(
        categories=["health", "monitoring"],
        permissions=["system_maintenance"]
    )
    
    # Function-based tools are registered via decorators
    # No need to explicitly register them here
    
    logger.info("Registered system health tools")


# Example usage
if __name__ == "__main__":
    # Register all system health tools
    register_system_health_tools()
    
    # Import the registry
    from ..registry.tool_registry import ToolRegistry
    
    # Get the registry
    registry = ToolRegistry()
    
    # Analyze logs
    result = registry.execute_tool("analyze_logs", {
        "log_types": "error", 
        "time_range": 24
    })
    print(f"Log analysis result: {json.dumps(result, indent=2)}")
    
    # Check system health
    result = registry.execute_tool("check_system_health", {
        "components": "all", 
        "check_level": "basic"
    })
    print(f"Health check result: {json.dumps(result, indent=2)}")
    
    # Resolve a health issue
    result = registry.execute_tool("resolve_health_issue", {
        "issue_type": "file",
        "component": "logs",
        "action": "cleanup"
    })
    print(f"Resolution result: {json.dumps(result, indent=2)}")