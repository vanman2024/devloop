# UI System Renamed and Relocated

## Summary of Changes

The UI system has been renamed from `feature-manager-ui` to simply `ui` and relocated for better organization and access:

1. Moved from `/mnt/c/Users/angel/devloop/feature-manager-ui` to `/mnt/c/Users/angel/devloop/ui`
2. Updated all scripts to reference the new location:
   - `start-ui.sh` in the root directory
   - `ui.sh` symlink in the root directory
   - All scripts in the `scripts/ui` directory
3. Added documentation about the move:
   - Updated `README.md` in the UI directory
   - Added `README-UI-MOVED.md` in the old location

## How to Start the UI

The UI can be started using the same commands as before:

```bash
# From the root directory
./ui.sh
# or
./start-ui.sh

# Directly from the UI directory
cd ui
./start.sh
```

## Launch Options

```bash
# Start both UI and API
./ui.sh

# Start only the UI
./ui.sh --ui-only

# Start only the API
./ui.sh --api-only

# Start without opening a browser
./ui.sh --no-browser

# Show all options
./ui.sh --help
```

## Next Steps

1. The original directory at `system-core/ui-system` still exists with a README noting the move
2. In a future cleanup, the old directory can be removed completely