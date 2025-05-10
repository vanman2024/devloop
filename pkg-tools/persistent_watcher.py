#!/usr/bin/env python3
"""
persistent_watcher.py - A permanent monitoring service for requirements.txt

This script runs as a highly reliable background service that updates
requirements.txt whenever packages are installed. It's designed to be extremely
robust in WSL environments.
"""

import os
import sys
import time
import subprocess
from datetime import datetime
from pathlib import Path

# Configuration
VENV_DIR = "/mnt/c/Users/angel/Devloop/venv"
REQUIREMENTS_FILE = "/mnt/c/Users/angel/Devloop/requirements.txt"
PIP_PATH = os.path.join(VENV_DIR, "bin", "pip")
LOG_FILE = "/mnt/c/Users/angel/Devloop/logs/requirements_watcher.log"

# Ensure log directory exists
os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)

def log(message):
    """Log a message to both console and log file."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_message = f"[{timestamp}] {message}"
    
    print(log_message)
    
    # Also write to log file
    with open(LOG_FILE, "a") as f:
        f.write(log_message + "\n")

def update_requirements():
    """Update requirements.txt with current packages."""
    log("Updating requirements.txt...")
    
    try:
        # Get the list of installed packages
        process = subprocess.run(
            [PIP_PATH, "freeze"],
            capture_output=True,
            text=True,
            check=True
        )
        
        # Sort packages alphabetically
        packages = sorted(process.stdout.splitlines())
        
        # Write to temporary file first
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', delete=False) as tmp_file:
            tmp_name = tmp_file.name
            
            # Write header with timestamp
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            tmp_file.write(f"# Requirements updated: {timestamp}\n")
            
            # Write packages
            for package in packages:
                if package.strip():
                    tmp_file.write(f"{package}\n")
            
            tmp_file.close()
            
            # Move the temporary file to the actual requirements.txt
            import shutil
            shutil.move(tmp_name, REQUIREMENTS_FILE)
            
            log(f"✅ {REQUIREMENTS_FILE} updated successfully.")
            return True
            
    except Exception as e:
        log(f"❌ Error updating requirements.txt: {str(e)}")
        return False

def check_changes():
    """Check if any packages have been installed/uninstalled since last update."""
    try:
        # Get current packages
        process = subprocess.run(
            [PIP_PATH, "freeze"],
            capture_output=True,
            text=True,
            check=True
        )
        current_packages = set(process.stdout.splitlines())
        
        # Read existing requirements.txt
        if os.path.exists(REQUIREMENTS_FILE):
            with open(REQUIREMENTS_FILE, 'r') as f:
                # Skip the first line (timestamp)
                lines = f.readlines()[1:]
                previous_packages = set([line.strip() for line in lines if line.strip()])
        else:
            previous_packages = set()
        
        # Compare
        if current_packages != previous_packages:
            log(f"📦 Package changes detected! Updating requirements.txt...")
            return True
    except Exception as e:
        log(f"⚠️ Error checking for changes: {str(e)}")
    
    return False

def main():
    """Main function that runs the continuous monitoring loop."""
    log("=" * 60)
    log("REQUIREMENTS MONITOR STARTING")
    log("=" * 60)
    log(f"Requirements file: {REQUIREMENTS_FILE}")
    log(f"Log file: {LOG_FILE}")
    log("This is a permanent background service")
    log("=" * 60)
    
    # Initial update
    update_requirements()
    
    check_interval = 60  # Check every minute
    force_update_interval = 3600  # Force update every hour regardless of changes
    last_force_update = time.time()
    
    try:
        while True:
            try:
                # Check for changes at regular intervals
                if check_changes():
                    update_requirements()
                
                # Force update periodically
                current_time = time.time()
                if current_time - last_force_update > force_update_interval:
                    log("Performing scheduled requirements check...")
                    update_requirements()
                    last_force_update = current_time
                
                # Sleep for the specified interval
                time.sleep(check_interval)
                
            except Exception as e:
                log(f"⚠️ Error in monitoring loop: {str(e)}")
                log("Continuing monitoring...")
                time.sleep(check_interval)
    
    except KeyboardInterrupt:
        log("Monitoring stopped by user")
    
    log("Exiting requirements monitor")

if __name__ == "__main__":
    main()