#!/bin/bash

# Service Health Check Script
# This script checks the health of all registered services

REGISTRY_FILE="/mnt/c/Users/angel/devloop/system-core/service-registry.json"

# Text colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo "DevLoop Service Health Check"
echo "==========================="
echo 

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is not installed. Unable to parse service registry.${NC}"
    echo "This script requires jq to parse JSON."
    echo
    echo "Alternative: Use curl directly to check each service:"
    echo "  curl -f http://localhost:8080/api/v1/health"
    echo "  curl -f http://localhost:3000/"
    echo "  curl -f http://localhost:3002/api/documents/health"
    echo "  curl -f http://localhost:8000/api/graph/health"
    echo "  curl -f http://localhost:8001/api/memory/health"
    echo "  curl -f http://localhost:8002/api/activity/health"
    exit 1
fi

# Check if the registry file exists
if [ ! -f "$REGISTRY_FILE" ]; then
    echo -e "${RED}Error: Service registry file not found at $REGISTRY_FILE${NC}"
    exit 1
fi

# Get service count
SERVICE_COUNT=$(jq '.services | length' "$REGISTRY_FILE")
HEALTHY_COUNT=0
UNHEALTHY_COUNT=0

echo "Found $SERVICE_COUNT services in registry."
echo

# Function to check service health
check_service_health() {
    local id="$1"
    local name="$2"
    local base_url="$3"
    local health_check="$4"
    local url="${base_url}${health_check}"
    
    echo -n "Checking $name ($id)... "
    
    # Try to connect to the service health endpoint
    if curl -s -f "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}HEALTHY${NC}"
        return 0
    else
        echo -e "${RED}UNHEALTHY${NC}"
        return 1
    fi
}

# Iterate through services and check health
for (( i=0; i<$SERVICE_COUNT; i++ )); do
    id=$(jq -r ".services[$i].id" "$REGISTRY_FILE")
    name=$(jq -r ".services[$i].name" "$REGISTRY_FILE")
    base_url=$(jq -r ".services[$i].baseUrl" "$REGISTRY_FILE")
    health_check=$(jq -r ".services[$i].healthCheck" "$REGISTRY_FILE")
    
    if check_service_health "$id" "$name" "$base_url" "$health_check"; then
        HEALTHY_COUNT=$((HEALTHY_COUNT + 1))
    else
        UNHEALTHY_COUNT=$((UNHEALTHY_COUNT + 1))
    fi
done

echo
echo "Health Check Summary:"
echo "===================="
echo -e "${GREEN}Healthy:${NC} $HEALTHY_COUNT/$SERVICE_COUNT"
if [ $UNHEALTHY_COUNT -gt 0 ]; then
    echo -e "${RED}Unhealthy:${NC} $UNHEALTHY_COUNT/$SERVICE_COUNT"
    echo
    echo "To start all services:"
    echo "1. Start Knowledge Graph: cd /mnt/c/Users/angel/devloop/backups/system-core-backup/system-core/memory/manager && ./launch-kg-test-server.sh"
    echo "2. Start API Server: cd /mnt/c/Users/angel/devloop && ./launch-api-server.sh"
    echo "3. Start UI: cd /mnt/c/Users/angel/devloop && ./start-ui.sh"
    echo "4. Start Document Server: cd /mnt/c/Users/angel/devloop/ui/server && ./start-document-server.sh"
    exit 1
else
    echo -e "${GREEN}All services are healthy!${NC}"
    exit 0
fi