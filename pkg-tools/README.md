# Package Management Tools

This directory contains tools for automatically managing Python package dependencies in requirements.txt.

## Tools

### Requirements Management

- `full_sync.sh` - One-time command to fully synchronize your virtual environment with requirements.txt
- `persistent_watcher.py` - Background service that monitors for package changes and updates requirements.txt
- `watch-requirements.sh` - Script to start the background monitoring service

## Usage

### Full Synchronization

To perform a one-time full synchronization of all packages:

```bash
cd /mnt/c/Users/angel/Devloop/pkg-tools
./full_sync.sh
```

### Continuous Monitoring

To start the background watcher that automatically updates requirements.txt:

```bash
cd /mnt/c/Users/angel/Devloop/pkg-tools
./watch-requirements.sh
```

Once started, the watcher runs in the background and:
- Monitors for package changes
- Updates requirements.txt automatically when packages are installed or uninstalled
- Logs all activity to `/mnt/c/Users/angel/Devloop/logs/package_watcher.log`

### Stopping the Watcher

To stop the background watcher:

```bash
kill $(cat /mnt/c/Users/angel/Devloop/pkg-tools/requirements_watcher.pid)
```

## Integration with Agent System

These tools can be invoked by agents to maintain dependency management:

1. An agent can run `full_sync.sh` when packages are installed manually
2. The persistent watcher can notify agents when requirements change
3. The watcher's log can be monitored for package ecosystem health