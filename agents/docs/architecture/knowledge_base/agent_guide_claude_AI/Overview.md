# Claude Code

## Overview
Claude Code is an agentic coding tool developed by Anthropic that operates directly in your terminal. It understands your codebase and helps you code faster through natural language commands. Currently in beta as a research preview.

### Key Capabilities
- Editing files and fixing bugs across your codebase
- Answering questions about your code's architecture and logic
- Executing and fixing tests, linting, and other commands
- Searching through git history, resolving merge conflicts, and creating commits and PRs

## Installation and Setup

### System Requirements
- **Operating Systems**: macOS 10.15+, Ubuntu 20.04+/Debian 10+, or Windows via WSL
- **Hardware**: 4GB RAM minimum
- **Software**:
  - Node.js 18+
  - git 2.23+ (optional)
  - GitHub or GitLab CLI for PR workflows (optional)
  - ripgrep (rg) for enhanced file search (optional)
- **Network**: Internet connection required for authentication and AI processing
- **Location**: Available only in supported countries

### Installation Steps
1. **Install Claude Code**
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```
   ⚠️ Do NOT use sudo npm install -g as this can lead to permission issues and security risks.

2. **Navigate to your project**
   ```bash
   cd your-project-directory
   ```

3. **Start Claude Code**
   ```bash
   claude
   ```

4. **Complete authentication**
   - Follow the one-time OAuth process with your Console account
   - You'll need active billing at console.anthropic.com

### Troubleshooting WSL Installation
Currently, Claude Code does not run directly in Windows and requires WSL. If you encounter issues:

- **OS/platform detection issues**:
  ```bash
  npm config set os linux
  npm install -g @anthropic-ai/claude-code --force --no-os-check
  ```

- **Node not found errors**: If you see `exec: node: not found` when running claude, your WSL environment may be using a Windows installation of Node.js. Confirm with `which npm` and `which node`, which should point to Linux paths starting with `/usr/` rather than `/mnt/c/`. Fix by installing Node via your Linux distribution's package manager or via nvm.

## Core Features and Workflows

### Security and Privacy
- **Direct API connection**: Your queries go straight to Anthropic's API without intermediate servers
- **Works where you work**: Operates directly in your terminal
- **Understands context**: Maintains awareness of your entire project structure
- **Takes action**: Performs real operations like editing files and creating commits

### Example Commands
```bash
# Ask questions about your codebase
claude
> how does our authentication system work?

# Create a commit with one command
claude commit

# Fix issues across multiple files
claude "fix the type errors in the auth module"
```

### Project Initialization
For first-time users:
1. Start Claude Code with `claude`
2. Try a simple command like `summarize this project`
3. Generate a CLAUDE.md project guide with `/init`
4. Ask Claude to commit the generated CLAUDE.md file to your repository

### Common Tasks

#### Understanding Code
```
> what does the payment processing system do?
> find where user permissions are checked
> explain how the caching layer works
```

#### Git Operations
```
> commit my changes
> create a pr
> which commit added tests for markdown back in December?
> rebase on main and resolve any merge conflicts
```

#### Code Editing
```
> add input validation to the signup form
> refactor the logger to use the new API
> fix the race condition in the worker queue
```

#### Testing and Debugging
```
> run tests for the auth module and fix failures
> find and fix security vulnerabilities
> explain why this test is failing
```

### Extended Thinking
For complex problems, explicitly ask Claude to think more deeply:
```
> think about how we should architect the new payment service
> think hard about the edge cases in our authentication flow
```

Claude Code will show when Claude (3.7 Sonnet) is using extended thinking. Use words like "think" or "think deeply" for more planning-intensive tasks.

### Automation in CI/CD
Claude Code comes with a non-interactive mode for headless execution, useful for scripts, pipelines, and Github Actions.

```bash
export ANTHROPIC_API_KEY=sk_...
claude -p "update the README with the latest changes" --allowedTools "Bash(git diff:*)" "Bash(git log:*)" Edit
```

## Commands and Control

### CLI Commands
| Command | Description | Example |
| --- | --- | --- |
| `claude` | Start interactive REPL | `claude` |
| `claude "query"` | Start REPL with initial prompt | `claude "explain this project"` |
| `claude -p "query"` | Run one-off query, then exit | `claude -p "explain this function"` |
| `cat file \| claude -p "query"` | Process piped content | `cat logs.txt \| claude -p "explain"` |
| `claude config` | Configure settings | `claude config set --global theme dark` |
| `claude update` | Update to latest version | `claude update` |
| `claude mcp` | Configure Model Context Protocol servers | See MCP section in documentation |

#### CLI Flags
- `--print (-p)`: Print response without interactive mode
- `--json`: Return JSON output in `--print` mode, useful for scripting and automation
- `--verbose`: Enable verbose logging, shows full turn-by-turn output
- `--dangerously-skip-permissions`: Skip permission prompts

### Slash Commands
| Command | Purpose |
| --- | --- |
| `/bug` | Report bugs (sends conversation to Anthropic) |
| `/clear` | Clear conversation history |
| `/compact [instructions]` | Compact conversation with optional focus instructions |
| `/config` | View/modify configuration |
| `/cost` | Show token usage statistics |
| `/doctor` | Checks the health of your Claude Code installation |
| `/help` | Get usage help |
| `/init` | Initialize project with CLAUDE.md guide |
| `/login` | Switch Anthropic accounts |
| `/logout` | Sign out from your Anthropic account |
| `/memory` | Edit CLAUDE.md memory files |
| `/pr_comments` | View pull request comments |
| `/review` | Request code review |
| `/terminal-setup` | Install Shift+Enter key binding for newlines (iTerm2 and VSCode only) |
| `/vim` | Enter vim mode for alternating insert and command modes |

## Managing Memory

### Memory Types
| Memory Type | Location | Purpose | Example Use Cases |
| --- | --- | --- | --- |
| Project memory | `./CLAUDE.md` | Team-shared conventions and knowledge | Project architecture, coding standards, common workflows |
| Project memory (local) | `./CLAUDE.local.md` | Personal project-specific preferences | Your sandbox URLs, preferred test data |
| User memory | `~/.claude/CLAUDE.md` | Global personal preferences | Code styling preferences, personal tooling shortcuts |

### Memory Lookup Process
Claude Code reads memories recursively: starting in the current working directory, it recurses up to `/` and reads any `CLAUDE.md` or `CLAUDE.local.md` files it finds.

### Adding Memories
- **Quick Addition**: Start your input with the `#` character
  ```
  # Always use descriptive variable names
  ```
- **Direct Editing**: Use the `/memory` slash command to open any memory file in your system editor

### Memory Best Practices
- **Be specific**: "Use 2-space indentation" is better than "Format code properly"
- **Use structure**: Format each memory as a bullet point and group related memories under descriptive markdown headings
- **Review periodically**: Update memories as your project evolves

## Permissions and Security

### Permission Levels
| Tool Type | Example | Approval Required | "Yes, don't ask again" Behavior |
| --- | --- | --- | --- |
| Read-only | File reads, LS, Grep | No | N/A |
| Bash Commands | Shell execution | Yes | Permanently per project directory and command |
| File Modification | Edit/write files | Yes | Until session end |

### Available Tools
| Tool | Description | Permission Required |
| --- | --- | --- |
| AgentTool | Runs a sub-agent to handle complex, multi-step tasks | No |
| BashTool | Executes shell commands in your environment | Yes |
| GlobTool | Finds files based on pattern matching | No |
| GrepTool | Searches for patterns in file contents | No |
| LSTool | Lists files and directories | No |
| FileReadTool | Reads the contents of files | No |
| FileEditTool | Makes targeted edits to specific files | Yes |
| FileWriteTool | Creates or overwrites files | Yes |
| NotebookReadTool | Reads and displays Jupyter notebook contents | No |
| NotebookEditTool | Modifies Jupyter notebook cells | Yes |

### Managing Permissions
You can manage Claude Code's allowed tools with `/allowed-tools`.

Personal project permission settings are saved in your global Claude config (in `~/.claude.json`).

Shared project permissions are loaded from `.claude/settings.json` when Claude Code is launched.

Example `.claude/settings.json`:
```json
{
  "permissions": {
    "allow": [
      "Bash(npm run lint)",
      "Bash(npm run test:*)"
    ]
  }
}
```

Permission rules use the format: `Tool(optional-specifier)`

### Prompt Injection Protection
Claude Code includes several safeguards against prompt injection attacks:
- Permission system: Sensitive operations require explicit approval
- Context-aware analysis: Detects potentially harmful instructions
- Input sanitization: Prevents command injection
- Command blocklist: Blocks risky commands that fetch arbitrary content

Best practices:
- Review suggested commands before approval
- Avoid piping untrusted content directly to Claude
- Verify proposed changes to critical files
- Report suspicious behavior with `/bug`

## Network and Configuration

### Network Access Requirements
Claude Code requires access to:
- api.anthropic.com
- statsig.anthropic.com
- sentry.io

### Environment Variables
| Variable | Purpose |
| --- | --- |
| `DISABLE_AUTOUPDATER` | Set to 1 to disable the automatic updater |
| `DISABLE_BUG_COMMAND` | Set to 1 to disable the `/bug` command |
| `DISABLE_COST_WARNINGS` | Set to 1 to disable cost warning messages |
| `HTTP_PROXY` | Specify HTTP proxy server for network connections |
| `HTTPS_PROXY` | Specify HTTPS proxy server for network connections |
| `MCP_TIMEOUT` | Timeout in milliseconds for MCP server startup |
| `MCP_TOOL_TIMEOUT` | Timeout in milliseconds for MCP tool execution |

### Configuration Management
Configure Claude Code by running `claude config` in your terminal, or the `/config` command in the interactive REPL.

Commands:
- List settings: `claude config list`
- See a setting: `claude config get <key>`
- Change a setting: `claude config set <key> <value>`
- Push to a setting (for lists): `claude config add <key> <value>`
- Remove from a setting (for lists): `claude config remove <key> <value>`

#### Global Configuration
To set global configuration: `claude config set -g <key> <value>`

| Key | Value | Description |
| --- | --- | --- |
| `autoUpdaterStatus` | `disabled` or `enabled` | Enable or disable the auto-updater (default: enabled) |
| `env` | JSON (eg. `'{"FOO": "bar"}'`) | Environment variables applied to every session |
| `preferredNotifChannel` | `iterm2`, `iterm2_with_bell`, `terminal_bell`, or `notifications_disabled` | Where to receive notifications (default: iterm2) |
| `theme` | `dark`, `light`, `light-daltonized`, or `dark-daltonized` | Color theme |
| `verbose` | `true` or `false` | Whether to show full bash and command outputs (default: false) |

#### Auto-updater Permission Setup
When Claude Code lacks sufficient permissions to write to your global npm prefix directory:

**Recommended approach**: Create a new user-writable npm prefix
```bash
# First, save a list of your existing global packages for later migration
npm list -g --depth=0 > ~/npm-global-packages.txt

# Create a directory for your global packages
mkdir -p ~/.npm-global

# Configure npm to use the new directory path
npm config set prefix ~/.npm-global

# Note: Replace ~/.bashrc with ~/.zshrc, ~/.profile, or other appropriate file for your shell
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc

# Apply the new PATH setting
source ~/.bashrc

# Now reinstall Claude Code in the new location
npm install -g @anthropic-ai/claude-code
```

Alternatively, disable the auto-updater:
```bash
claude config set -g autoUpdaterStatus disabled
```

#### Project Configuration
Manage project configuration with `claude config set <key> <value>` (without the -g flag):

| Key | Value | Description |
| --- | --- | --- |
| `allowedTools` | array of tools | Which tools can run without manual approval |
| `ignorePatterns` | array of glob strings | Which files/directories are ignored when using tools |

Examples:
```bash
# Let npm test to run without approval
claude config add allowedTools "Bash(npm test)"

# Let npm test and any of its sub-commands to run without approval
claude config add allowedTools "Bash(npm test:*)"

# Instruct Claude to ignore node_modules
claude config add ignorePatterns node_modules
claude config add ignorePatterns "node_modules/**"
```

## Terminal Optimization

### Supported Shells
- Bash
- Zsh
- Fish

### Themes and Appearance
Claude cannot control the theme of your terminal. You can match Claude Code's theme to your terminal during onboarding or via the `/config` command.

### Line Breaks
Options for entering linebreaks:
- **Quick escape**: Type `\` followed by Enter
- **Keyboard shortcut**: Press Option+Enter (Meta+Enter) with proper configuration

Terminal setup:
- **Mac Terminal.app**: Settings → Profiles → Keyboard → Check "Use Option as Meta Key"
- **iTerm2 and VSCode terminal**: Settings → Profiles → Keys → Set Left/Right Option key to "Esc+"
- For iTerm2 and VSCode users: Run `/terminal-setup` within Claude Code to configure Shift+Enter

### Notification Setup
Terminal bell notifications:
```bash
claude config set --global preferredNotifChannel terminal_bell
```

iTerm 2 system notifications:
1. Open iTerm 2 Preferences
2. Navigate to Profiles → Terminal
3. Enable "Silence bell" and "Send notification when idle"
4. Set your preferred notification delay

### Handling Large Inputs
- Avoid direct pasting of very long content
- Use file-based workflows
- Be aware of VS Code limitations with long pastes

### Vim Mode
Enable with `/vim` or configure via `/config`. Supported subset includes:
- Mode switching: Esc (to NORMAL), i/I, a/A, o/O (to INSERT)
- Navigation: h/j/k/l, w/e/b, 0/$/^, gg/G
- Editing: x, dw/de/db/dd/D, cw/ce/cb/cc/C, . (repeat)

## Cost Management

### Tracking Costs
- Use `/cost` to see current session usage
- Check historical usage in the Anthropic Console
- Set workspace spend limits for the Claude Code workspace

### Reducing Token Usage
- Use conversation compaction:
  - Claude uses auto-compact by default when context exceeds 95% capacity
  - Toggle auto-compact: `/config` → "Auto-compact enabled"
  - Use `/compact` manually for large contexts
  - Add custom instructions: `/compact Focus on code samples and API usage`
- Write specific queries to avoid unnecessary scanning
- Break down complex tasks
- Clear history between tasks with `/clear`

Cost factors:
- Size of codebase being analyzed
- Complexity of queries
- Number of files being searched or modified
- Length of conversation history
- Frequency of compacting conversations

## Model Configuration

By default, Claude Code uses `claude-3-7-sonnet-20250219`. Override with environment variables:

```bash
# Anthropic API
ANTHROPIC_MODEL='claude-3-7-sonnet-20250219'
ANTHROPIC_SMALL_FAST_MODEL='claude-3-5-haiku-20241022'

# Amazon Bedrock
ANTHROPIC_MODEL='us.anthropic.claude-3-7-sonnet-20250219-v1:0'
ANTHROPIC_SMALL_FAST_MODEL='us.anthropic.claude-3-5-haiku-20241022-v1:0'

# Google Vertex AI
ANTHROPIC_MODEL='claude-3-7-sonnet@20250219'
ANTHROPIC_SMALL_FAST_MODEL='claude-3-5-haiku@20241022'
```

Or via global configuration:
```bash
# Configure for Anthropic API
claude config set --global env '{"ANTHROPIC_MODEL": "claude-3-7-sonnet-20250219"}'

# Configure for Bedrock
claude config set --global env '{"CLAUDE_CODE_USE_BEDROCK": "true", "ANTHROPIC_MODEL": "us.anthropic.claude-3-7-sonnet-20250219-v1:0"}'

# Configure for Vertex AI
claude config set --global env '{"CLAUDE_CODE_USE_VERTEX": "true", "ANTHROPIC_MODEL": "claude-3-7-sonnet@20250219"}'
```

## Third-Party API Integration

Claude Code requires access to both Claude 3.7 Sonnet and Claude 3.5 Haiku models, regardless of API provider.

### Amazon Bedrock Connection
```bash
CLAUDE_CODE_USE_BEDROCK=1
```

For proxy access:
```bash
ANTHROPIC_BEDROCK_BASE_URL='https://your-proxy-url'
```

If prompt caching is disabled:
```bash
DISABLE_PROMPT_CACHING=1
```

Requires standard AWS SDK credentials. To configure:
```bash
aws configure
```

### Google Vertex AI Connection
```bash
CLAUDE_CODE_USE_VERTEX=1
CLOUD_ML_REGION=us-east5
ANTHROPIC_VERTEX_PROJECT_ID=your-project-id
```

For proxy access:
```bash
ANTHROPIC_VERTEX_BASE_URL='https://your-proxy-url'
```

If prompt caching is disabled:
```bash
DISABLE_PROMPT_CACHING=1
```

Currently only supports the us-east5 region. Requires standard GCP credentials:
```bash
gcloud auth application-default login
```

### Proxy Connection
Environment variables:
- `ANTHROPIC_AUTH_TOKEN`: Custom value for Authorization and Proxy-Authorization headers
- `ANTHROPIC_CUSTOM_HEADERS`: Custom headers for the request
- `HTTP_PROXY`: HTTP proxy URL
- `HTTPS_PROXY`: HTTPS proxy URL

Global configuration option:
- `apiKeyHelper`: Custom shell script to get an API key

## Development Container

Claude Code provides a development container configuration for teams requiring consistent, secure environments. This works with VS Code's Remote - Containers extension and similar tools.

### Key Features
- Production-ready Node.js 20 with essential dependencies
- Custom firewall restricting network access
- Developer-friendly tools (git, ZSH, fzf, etc.)
- Seamless VS Code integration
- Session persistence between container restarts
- Cross-platform compatibility

### Setup Process
1. Install VS Code and the Remote - Containers extension
2. Clone the Claude Code reference implementation repository
3. Open the repository in VS Code
4. When prompted, click "Reopen in Container"

### Components
- `devcontainer.json`: Container settings, extensions, and volume mounts
- `Dockerfile`: Container image and installed tools
- `init-firewall.sh`: Network security rules

### Security Features
- Precise access control to whitelisted domains only
- Default-deny policy for external network access
- Startup verification of firewall rules
- Isolation from main system

## License and Data Usage

Claude Code is provided as a Beta research preview under Anthropic's Commercial Terms of Service.

### Data Usage Policy
- Feedback may be used to improve products and services, but not to train generative models
- Feedback transcripts stored for only 30 days due to potential sensitivity

### Privacy Safeguards
- Limited retention periods for sensitive information
- Restricted access to user session data
- Clear policies against using feedback for model training

For full details, review Anthropic's Commercial Terms of Service and Privacy Policy.

### License
© Anthropic PBC. All rights reserved. Use is subject to Anthropic's Commercial Terms of Service.