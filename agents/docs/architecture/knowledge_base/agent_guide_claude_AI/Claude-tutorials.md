# Claude Code: Comprehensive Guide

Claude Code is a command-line tool that enables developers to leverage Claude's capabilities directly within their development workflow. This guide provides detailed instructions for effectively using Claude Code across various development scenarios.

## Table of Contents

- [Getting Started](#getting-started)
- [Core Workflows](#core-workflows)
  - [Understanding New Codebases](#understanding-new-codebases)
  - [Fixing Bugs](#fixing-bugs)
  - [Refactoring Code](#refactoring-code)
  - [Working with Tests](#working-with-tests)
  - [Creating Pull Requests](#creating-pull-requests)
  - [Handling Documentation](#handling-documentation)
  - [Working with Images](#working-with-images)
- [Advanced Features](#advanced-features)
  - [Extended Thinking](#extended-thinking)
  - [Project Memory](#project-memory)
  - [Using MCP (Model Context Protocol)](#using-mcp-model-context-protocol)
  - [Unix-Style Integration](#unix-style-integration)
  - [Custom Slash Commands](#custom-slash-commands)
  - [Parallel Sessions with Git Worktrees](#parallel-sessions-with-git-worktrees)

## Getting Started

To start using Claude Code:

1. Navigate to your project directory:
   ```bash
   cd /path/to/project
   ```

2. Launch Claude Code:
   ```bash
   claude
   ```

3. Begin interacting with Claude within the CLI interface.

## Core Workflows

### Understanding New Codebases

#### Quick Codebase Overview

When joining a new project and needing to understand its structure:

1. Navigate to the project root:
   ```bash
   cd /path/to/project
   ```

2. Launch Claude Code:
   ```bash
   claude
   ```

3. Ask for an overview:
   ```
   > give me an overview of this codebase
   ```

4. Dive deeper with follow-up questions:
   ```
   > explain the main architecture patterns used here
   > what are the key data models?
   > how is authentication handled?
   ```

**Tips:**
- Start with broad questions, then narrow down
- Ask about coding conventions and patterns
- Request a glossary of project-specific terms

#### Finding Relevant Code

When looking for code related to specific functionality:

1. Ask Claude to locate files:
   ```
   > find the files that handle user authentication
   ```

2. Get context on component interactions:
   ```
   > how do these authentication files work together?
   ```

3. Understand execution flow:
   ```
   > trace the login process from front-end to database
   ```

**Tips:**
- Be specific about what you're looking for
- Use domain language from the project

### Fixing Bugs

#### Diagnosing Error Messages

When encountering errors:

1. Share the error with Claude:
   ```
   > I'm seeing an error when I run npm test
   ```

2. Ask for fix recommendations:
   ```
   > suggest a few ways to fix the @ts-ignore in user.ts
   ```

3. Apply the fix:
   ```
   > update user.ts to add the null check you suggested
   ```

**Tips:**
- Share commands to reproduce the issue
- Mention steps to reproduce the error
- Indicate if the error is intermittent or consistent

### Refactoring Code

#### Modernizing Legacy Code

When updating old code to modern standards:

1. Identify legacy code:
   ```
   > find deprecated API usage in our codebase
   ```

2. Get refactoring recommendations:
   ```
   > suggest how to refactor utils.js to use modern JavaScript features
   ```

3. Apply changes safely:
   ```
   > refactor utils.js to use ES2024 features while maintaining the same behavior
   ```

4. Verify the refactoring:
   ```
   > run tests for the refactored code
   ```

**Tips:**
- Ask Claude to explain benefits of modern approaches
- Request backward compatibility when needed
- Refactor in small, testable increments

### Working with Tests

#### Adding Test Coverage

When adding tests for uncovered code:

1. Identify untested code:
   ```
   > find functions in NotificationsService.swift that are not covered by tests
   ```

2. Generate test scaffolding:
   ```
   > add tests for the notification service
   ```

3. Add meaningful test cases:
   ```
   > add test cases for edge conditions in the notification service
   ```

4. Run and verify tests:
   ```
   > run the new tests and fix any failures
   ```

**Tips:**
- Request tests for edge cases and error conditions
- Ask for both unit and integration tests when appropriate
- Have Claude explain the testing strategy

### Creating Pull Requests

#### Generating Comprehensive PRs

When creating well-documented pull requests:

1. Summarize changes:
   ```
   > summarize the changes I've made to the authentication module
   ```

2. Generate a PR:
   ```
   > create a pr
   ```

3. Review and refine:
   ```
   > enhance the PR description with more context about the security improvements
   ```

4. Add testing details:
   ```
   > add information about how these changes were tested
   ```

**Tips:**
- Ask Claude directly to make a PR
- Review generated PR before submitting
- Ask Claude to highlight potential risks

### Handling Documentation

#### Generating Code Documentation

When adding or updating documentation:

1. Identify undocumented code:
   ```
   > find functions without proper JSDoc comments in the auth module
   ```

2. Generate documentation:
   ```
   > add JSDoc comments to the undocumented functions in auth.js
   ```

3. Review and enhance:
   ```
   > improve the generated documentation with more context and examples
   ```

4. Verify documentation:
   ```
   > check if the documentation follows our project standards
   ```

**Tips:**
- Specify documentation style (JSDoc, docstrings, etc.)
- Ask for examples in documentation
- Request documentation for public APIs and complex logic

### Working with Images

#### Analyzing Images and Screenshots

When working with images:

1. Add an image to the conversation using one of these methods:
   - Drag and drop an image into the Claude Code window
   - Copy an image and paste it with ctrl+v
   - Provide an image path:
     ```bash
     claude "Analyze this image: /path/to/your/image.png"
     ```

2. Ask Claude to analyze the image:
   ```
   > What does this image show?
   > Describe the UI elements in this screenshot
   > Are there any problematic elements in this diagram?
   ```

3. Use images for context:
   ```
   > Here's a screenshot of the error. What's causing it?
   > This is our current database schema. How should we modify it for the new feature?
   ```

4. Get code suggestions from visual content:
   ```
   > Generate CSS to match this design mockup
   > What HTML structure would recreate this component?
   ```

**Tips:**
- Use images when text descriptions would be unclear
- Include screenshots of errors, UI designs, or diagrams
- Image analysis works with diagrams, screenshots, mockups, etc.

## Advanced Features

### Extended Thinking

#### Leveraging Claude's Extended Thinking for Complex Tasks

When working on complex architectural decisions or challenging problems:

1. Provide context and ask Claude to think:
   ```
   > I need to implement a new authentication system using OAuth2 for our API. Think deeply about the best approach for implementing this in our codebase.
   ```

2. Refine thinking with follow-up prompts:
   ```
   > think about potential security vulnerabilities in this approach
   > think harder about edge cases we should handle
   ```

**Best uses for extended thinking:**
- Planning complex architectural changes
- Debugging intricate issues
- Creating implementation plans for new features
- Understanding complex codebases
- Evaluating tradeoffs between different approaches

**Prompting for different thinking depths:**
- "think" triggers basic extended thinking
- "think more", "think a lot", "think harder", or "think longer" triggers deeper thinking

Claude displays its thinking process as italic gray text above the response.

### Project Memory

#### Creating an Effective CLAUDE.md File

When setting up project context for Claude:

1. Bootstrap a CLAUDE.md file:
   ```
   > /init
   ```

**Tips for effective CLAUDE.md files:**
- Include frequently used commands (build, test, lint)
- Document code style preferences and naming conventions
- Add important architectural patterns

**CLAUDE.md file locations:**
- Current folder: Automatically added to conversations started in that folder
- Child directories: Claude pulls these in on demand
- ~/.claude/CLAUDE.md: User-specific preferences not checked into source control

### Using MCP (Model Context Protocol)

Model Context Protocol (MCP) enables Claude to access external tools and data sources.

> **Important:** Use third-party MCP servers at your own risk. Ensure you trust MCP servers, especially those that connect to the internet, as they may expose you to prompt injection risks.

#### Configuring MCP Servers

When enhancing Claude's capabilities with specialized tools:

1. Add an MCP Stdio Server:
   ```bash
   # Basic syntax
   claude mcp add <name> <command> [args...]

   # Example: Adding a local server
   claude mcp add my-server -e API_KEY=123 -- /path/to/server arg1 arg2
   ```

2. Add an MCP SSE Server:
   ```bash
   # Basic syntax
   claude mcp add --transport sse <name> <url>

   # Example: Adding an SSE server
   claude mcp add --transport sse sse-server https://example.com/sse-endpoint
   ```

3. Manage MCP servers:
   ```bash
   # List all configured servers
   claude mcp list

   # Get details for a specific server
   claude mcp get my-server

   # Remove a server
   claude mcp remove my-server
   ```

**Tips:**
- Use the `-s` or `--scope` flag to specify storage location:
  - `local` (default): Available only to you in the current project
  - `project`: Shared with everyone via .mcp.json file
  - `user`: Available to you across all projects
- Set environment variables with `-e` or `--env` flags
- Configure startup timeout with the MCP_TIMEOUT environment variable
- Check MCP server status using the `/mcp` command

#### Understanding MCP Server Scopes

1. Local-scoped MCP servers:
   ```bash
   # Add a local-scoped server (default)
   claude mcp add my-private-server /path/to/server

   # Explicitly specify local scope
   claude mcp add my-private-server -s local /path/to/server
   ```

2. Project-scoped MCP servers (.mcp.json):
   ```bash
   # Add a project-scoped server
   claude mcp add shared-server -s project /path/to/server
   ```

   This creates/updates a .mcp.json file with this structure:
   ```json
   {
     "mcpServers": {
       "shared-server": {
         "command": "/path/to/server",
         "args": [],
         "env": {}
       }
     }
   }
   ```

3. User-scoped MCP servers:
   ```bash
   # Add a user server
   claude mcp add my-user-server -s user /path/to/server
   ```

**Scope precedence order:**
- Local-scoped > Project-scoped > User-scoped (when names conflict)
- Claude Code prompts for approval before using project-scoped servers
- Reset project-scoped server choices with `claude mcp reset-project-choices`

#### Connecting to a Postgres MCP Server

1. Add the Postgres MCP server:
   ```bash
   claude mcp add postgres-server /path/to/postgres-mcp-server --connection-string "postgresql://user:pass@localhost:5432/mydb"
   ```

2. Query your database with Claude:
   ```
   > describe the schema of our users table
   > what are the most recent orders in the system?
   > show me the relationship between customers and invoices
   ```

**Notes:**
- Postgres MCP server provides read-only access for safety
- Use appropriate credentials with minimum required permissions

#### Adding MCP Servers from JSON Configuration

1. Add an MCP server from JSON:
   ```bash
   # Basic syntax
   claude mcp add-json <name> '<json>'

   # Example: Adding a stdio server with JSON configuration
   claude mcp add-json weather-api '{"type":"stdio","command":"/path/to/weather-cli","args":["--api-key","abc123"],"env":{"CACHE_DIR":"/tmp"}}'
   ```

2. Verify the server was added:
   ```bash
   claude mcp get weather-api
   ```

#### Importing MCP Servers from Claude Desktop

1. Import servers from Claude Desktop:
   ```bash
   # Basic syntax
   claude mcp add-from-claude-desktop
   ```

2. Select which servers to import from the interactive dialog

3. Verify the servers were imported:
   ```bash
   claude mcp list
   ```

**Notes:**
- Only works on macOS and Windows Subsystem for Linux (WSL)
- Use `-s global` flag to add servers to global configuration
- Imported servers keep same names (with numerical suffix if duplicates)

#### Using Claude Code as an MCP Server

1. Start Claude as an MCP server:
   ```bash
   # Basic syntax
   claude mcp serve
   ```

2. Connect from Claude Desktop with this configuration:
   ```json
   {
     "command": "claude",
     "args": ["mcp", "serve"],
     "env": {}
   }
   ```

**Notes:**
- Server provides access to Claude's tools (View, Edit, LS, etc.)
- The MCP client handles user confirmation for individual tool calls

### Unix-Style Integration

#### Adding Claude to Your Verification Process

1. Add Claude to your build script:
   ```json
   // package.json
   {
       "scripts": {
           "lint:claude": "claude -p 'you are a linter. please look at the changes vs. main and report any issues related to typos. report the filename and line number on one line, and a description of the issue on the second line. do not return any other text.'"
       }
   }
   ```

#### Pipe In, Pipe Out

Use Claude to process data:

```bash
cat build-error.txt | claude -p 'concisely explain the root cause of this build error' > output.txt
```

### Custom Slash Commands

Claude Code supports custom slash commands for quickly executing specific prompts or tasks.

#### Creating Project-Specific Commands

1. Create a commands directory in your project:
   ```bash
   mkdir -p .claude/commands
   ```

2. Create a Markdown file for each command:
   ```bash
   echo "Analyze the performance of this code and suggest three specific optimizations:" > .claude/commands/optimize.md
   ```

3. Use your custom command:
   ```
   claude
   > /project:optimize
   ```

**Notes:**
- Command names derive from filenames (optimize.md → /project:optimize)
- Commands in subdirectories use colon separators (.claude/commands/frontend/component.md → /project:frontend:component)
- Project commands are available to everyone who clones the repository

#### Adding Command Arguments with $ARGUMENTS

1. Create a command file with the $ARGUMENTS placeholder:
   ```bash
   echo "Find and fix issue #$ARGUMENTS. Follow these steps:
   1. Understand the issue described in the ticket
   2. Locate the relevant code in our codebase
   3. Implement a solution that addresses the root cause
   4. Add appropriate tests
   5. Prepare a concise PR description" > .claude/commands/fix-issue.md
   ```

2. Use the command with arguments:
   ```
   claude
   > /project:fix-issue 123
   ```

**Notes:**
- $ARGUMENTS is replaced with text following the command
- Can be positioned anywhere in the command template
- Useful for test generation, documentation, code reviews, etc.

#### Creating Personal Slash Commands

1. Create a commands directory in your home folder:
   ```bash
   mkdir -p ~/.claude/commands
   ```

2. Create a Markdown file for each command:
   ```bash
   echo "Review this code for security vulnerabilities, focusing on:" > ~/.claude/commands/security-review.md
   ```

3. Use your personal command:
   ```
   claude
   > /user:security-review
   ```

**Notes:**
- Personal commands use /user: prefix
- Available only to you across all projects
- Useful for consistent workflows across different codebases

### Parallel Sessions with Git Worktrees

#### Using Worktrees for Isolated Coding Environments

1. Create a new worktree:
   ```bash
   # Create a new worktree with a new branch
   git worktree add ../project-feature-a feature-a

   # Or create a worktree with an existing branch
   git worktree add ../project-bugfix bugfix-123
   ```

2. Run Claude Code in each worktree:
   ```bash
   # Navigate to your worktree
   cd ../project-feature-a

   # Run Claude Code in this isolated environment
   claude
   ```

   In another terminal:
   ```bash
   cd ../project-bugfix
   claude
   ```

3. Manage your worktrees:
   ```bash
   # List all worktrees
   git worktree list

   # Remove a worktree when done
   git worktree remove ../project-feature-a
   ```

**Notes:**
- Each worktree has independent file state
- All worktrees share Git history and remote connections
- Use descriptive directory names
- Remember to initialize development environment in each worktree

## Best Practices

### General Tips

1. **Be Specific**: Provide clear, specific instructions when asking Claude to assist with code.
   
2. **Iterate Gradually**: Build complex changes incrementally rather than all at once.
   
3. **Verify Changes**: Always review Claude's suggestions before implementing them.
   
4. **Provide Context**: Include relevant background information for better responses.
   
5. **Break Down Problems**: Split complex tasks into smaller, more manageable pieces.

### Maximizing Productivity

1. **Create Custom Commands**: Build a library of slash commands for frequent tasks.
   
2. **Set Up CLAUDE.md**: Maintain project-specific context to minimize repetition.
   
3. **Use Extended Thinking**: For complex problems, leverage Claude's deeper reasoning.
   
4. **Combine with CLI Tools**: Pipe data in and out of Claude for integration with other tools.
   
5. **Parallel Sessions**: Use Git worktrees for simultaneous work on different tasks.

By following this guide, you'll be able to effectively integrate Claude Code into your development workflow, maximizing productivity while leveraging Claude's capabilities to enhance your coding experience.