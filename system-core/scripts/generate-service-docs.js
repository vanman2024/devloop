#!/usr/bin/env node

/**
 * Service Documentation Generator
 * 
 * Reads the service registry and generates documentation for all services.
 * This helps maintain an overview of the system architecture and microservices.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const REGISTRY_PATH = path.join(__dirname, '..', 'service-registry.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'docs', 'SERVICES.md');

// Ensure the docs directory exists
const docsDir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

// Read the service registry
console.log('Reading service registry...');
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));

// Generate documentation
console.log('Generating service documentation...');
let markdown = `# DevLoop Service Registry
> Generated on: ${new Date().toISOString().split('T')[0]}
> Registry Version: ${registry.version}

This document provides an overview of all microservices in the DevLoop system.

## Service Dependencies
\`\`\`mermaid
graph TD;
`;

// Generate mermaid graph
const serviceIds = new Set(registry.services.map(s => s.id));
registry.services.forEach(service => {
  if (service.dependencies && service.dependencies.length > 0) {
    service.dependencies.forEach(dep => {
      if (serviceIds.has(dep)) {
        markdown += `  ${dep}-->${service.id};\n`;
      }
    });
  }
});

markdown += `\`\`\`

## Services

`;

// Generate service details
registry.services.forEach(service => {
  markdown += `### ${service.name} (${service.id})
${service.description}

- **URL:** ${service.baseUrl}
- **Port:** ${service.port}
- **Source:** \`${service.repository}\`
- **Start Command:** \`${service.startCommand}\`
- **Health Check:** \`${service.healthCheck}\`
`;

  if (service.dependencies && service.dependencies.length > 0) {
    markdown += `- **Dependencies:** ${service.dependencies.map(d => `\`${d}\``).join(', ')}\n`;
  } else {
    markdown += '- **Dependencies:** None\n';
  }

  if (service.documentation) {
    markdown += `- **Documentation:** [View Details](${service.documentation})\n`;
  } else {
    markdown += '- **Documentation:** Not available\n';
  }

  markdown += `- **Maintainers:** ${service.maintainers.join(', ')}\n\n`;
});

// Add system information
markdown += `
## System Information

### Starting All Services
To start all services, run:
\`\`\`bash
# Start the knowledge graph and memory services first
cd /mnt/c/Users/angel/devloop/backups/system-core-backup/system-core/memory/manager
./launch-kg-test-server.sh

# Start the main API server
cd /mnt/c/Users/angel/devloop
./launch-api-server.sh

# Start the UI and document servers
cd /mnt/c/Users/angel/devloop
./start-ui.sh
\`\`\`

### Verifying Service Health
To check the health of all services, run:
\`\`\`bash
# Simple health check script (to be implemented)
./system-core/scripts/check-service-health.sh
\`\`\`

### Service Ports
The following ports are used by the system:
- 3000: UI Server
- 3002: Document Generation Server
- 8000: Knowledge Graph API
- 8001: Memory API
- 8002: Activity Tracking Server
- 8080: Main API Server
`;

// Write the documentation
console.log('Writing service documentation...');
fs.writeFileSync(OUTPUT_PATH, markdown);
console.log(`Service documentation generated at ${OUTPUT_PATH}`);