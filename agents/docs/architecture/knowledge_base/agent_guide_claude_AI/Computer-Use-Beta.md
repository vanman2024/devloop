# Claude Computer Use (Beta)

Claude 3.7 Sonnet and Claude 3.5 Sonnet (new) are capable of interacting with tools that can manipulate a computer desktop environment. Claude 3.7 Sonnet introduces additional tools and allows you to enable thinking, giving you more insight into the model's reasoning process.

## Important Safety Considerations

Computer use is a beta feature that poses unique risks distinct from standard API features or chat interfaces. These risks are heightened when using computer use to interact with the internet. To minimize risks, consider taking precautions such as:

- Use a dedicated virtual machine or container with minimal privileges to prevent direct system attacks or accidents
- Avoid giving the model access to sensitive data, such as account login information, to prevent information theft
- Limit internet access to an allowlist of domains to reduce exposure to malicious content
- Ask a human to confirm decisions that may result in meaningful real-world consequences as well as any tasks requiring affirmative consent, such as accepting cookies, executing financial transactions, or agreeing to terms of service

In some circumstances, Claude will follow commands found in content even if it conflicts with the user's instructions. For example, Claude instructions on webpages or contained in images may override instructions or cause Claude to make mistakes. We suggest taking precautions to isolate Claude from sensitive data and actions to avoid risks related to prompt injection.

Anthropic has trained the model to resist these prompt injections and has added an extra layer of defense. When using computer use tools, classifiers will automatically run on prompts to flag potential instances of prompt injections. When potential prompt injections are identified in screenshots, the model will automatically ask for user confirmation before proceeding with the next action. To opt out of this additional protection, contact Anthropic.

## Getting Started

The computer use reference implementation includes:
- A web interface
- Docker container
- Example tool implementations
- An agent loop

**Note**: The implementation has been updated to include new tools for Claude 3.7 Sonnet. Be sure to pull the latest version of the repo to access these new features.

## API Example

```shell
curl https://api.anthropic.com/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: computer-use-2025-01-24" \
  -d '{
    "model": "claude-3-7-sonnet-20250219",
    "max_tokens": 1024,
    "tools": [
      {
        "type": "computer_20250124",
        "name": "computer",
        "display_width_px": 1024,
        "display_height_px": 768,
        "display_number": 1
      },
      {
        "type": "text_editor_20250124",
        "name": "str_replace_editor"
      },
      {
        "type": "bash_20250124",
        "name": "bash"
      }
    ],
    "messages": [
      {
        "role": "user",
        "content": "Save a picture of a cat to my desktop."
      }
    ],
    "thinking": {
      "type": "enabled",
      "budget_tokens": 1024
    }
  }'
```

## How Computer Use Works

1. **Provide Claude with computer use tools and a user prompt**
   - Add Anthropic-defined computer use tools to your API request
   - Include a user prompt that might require these tools, e.g., "Save a picture of a cat to my desktop"

2. **Claude decides to use a tool**
   - Claude loads the stored computer use tool definitions and assesses if any tools can help with the user's query
   - If yes, Claude constructs a properly formatted tool use request
   - The API response has a stop_reason of tool_use, signaling Claude's intent

3. **Extract tool input, evaluate the tool on a computer, and return results**
   - On your end, extract the tool name and input from Claude's request
   - Use the tool on a container or Virtual Machine
   - Continue the conversation with a new user message containing a tool_result content block

4. **Claude continues calling computer use tools until it's completed the task**
   - Claude analyzes the tool results to determine if more tool use is needed or the task has been completed
   - If Claude decides it needs another tool, it responds with another tool_use stop_reason and you should return to step 3
   - Otherwise, it crafts a text response to the user

We refer to the repetition of steps 3 and 4 without user input as the "agent loop" - i.e., Claude responding with a tool use request and your application responding to Claude with the results of evaluating that request.

## The Computing Environment

Computer use requires a sandboxed computing environment where Claude can safely interact with applications and the web. This environment includes:

- **Virtual display**: A virtual X11 display server (using Xvfb) that renders the desktop interface Claude will see through screenshots and control with mouse/keyboard actions
- **Desktop environment**: A lightweight UI with window manager (Mutter) and panel (Tint2) running on Linux, which provides a consistent graphical interface for Claude to interact with
- **Applications**: Pre-installed Linux applications like Firefox, LibreOffice, text editors, and file managers that Claude can use to complete tasks
- **Tool implementations**: Integration code that translates Claude's abstract tool requests (like "move mouse" or "take screenshot") into actual operations in the virtual environment
- **Agent loop**: A program that handles communication between Claude and the environment, sending Claude's actions to the environment and returning the results (screenshots, command outputs) back to Claude

When you use computer use, Claude doesn't directly connect to this environment. Instead, your application:
- Receives Claude's tool use requests
- Translates them into actions in your computing environment
- Captures the results (screenshots, command outputs, etc.)
- Returns these results to Claude

For security and isolation, the reference implementation runs all of this inside a Docker container with appropriate port mappings for viewing and interacting with the environment.

## Implementing Computer Use

### Start with Reference Implementation

Anthropic has built a reference implementation that includes everything you need to get started quickly with computer use:
- A containerized environment suitable for computer use with Claude
- Implementations of the computer use tools
- An agent loop that interacts with the Anthropic API and executes the computer use tools
- A web interface to interact with the container, agent loop, and tools

### Understanding the Multi-Agent Loop

The core of computer use is the "agent loop" - a cycle where Claude requests tool actions, your application executes them, and returns results to Claude. Here's a simplified example:

```python
async def sampling_loop(
    *,
    model: str,
    messages: list[dict],
    api_key: str,
    max_tokens: int = 4096,
    tool_version: str,
    thinking_budget: int | None = None,
    max_iterations: int = 10,  # Add iteration limit to prevent infinite loops
):
    """
    A simple agent loop for Claude computer use interactions.

    This function handles the back-and-forth between:
    1. Sending user messages to Claude
    2. Claude requesting to use tools
    3. Your app executing those tools
    4. Sending tool results back to Claude
    """
    # Set up tools and API parameters
    client = Anthropic(api_key=api_key)
    beta_flag = "computer-use-2025-01-24" if "20250124" in tool_version else "computer-use-2024-10-22"

    # Configure tools - you should already have these initialized elsewhere
    tools = [
        {"type": f"computer_{tool_version}", "name": "computer", "display_width_px": 1024, "display_height_px": 768},
        {"type": f"text_editor_{tool_version}", "name": "str_replace_editor"},
        {"type": f"bash_{tool_version}", "name": "bash"}
    ]

    # Main agent loop (with iteration limit to prevent runaway API costs)
    iterations = 0
    while True and iterations < max_iterations:
        iterations += 1
        # Set up optional thinking parameter (for Claude 3.7 Sonnet)
        thinking = None
        if thinking_budget:
            thinking = {"type": "enabled", "budget_tokens": thinking_budget}

        # Call the Claude API
        response = client.beta.messages.create(
            model=model,
            max_tokens=max_tokens,
            messages=messages,
            tools=tools,
            betas=[beta_flag],
            thinking=thinking
        )

        # Add Claude's response to the conversation history
        response_content = response.content
        messages.append({"role": "assistant", "content": response_content})

        # Check if Claude used any tools
        tool_results = []
        for block in response_content:
            if block.type == "tool_use":
                # In a real app, you would execute the tool here
                # For example: result = run_tool(block.name, block.input)
                result = {"result": "Tool executed successfully"}

                # Format the result for Claude
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result
                })

        # If no tools were used, Claude is done - return the final messages
        if not tool_results:
            return messages

        # Add tool results to messages for the next iteration with Claude
        messages.append({"role": "user", "content": tool_results})
```

The loop continues until either Claude responds without requesting any tools (task completion) or the maximum iteration limit is reached. This safeguard prevents potential infinite loops that could result in unexpected API costs.

For each version of the tools, you must use the corresponding beta flag in your API request:
- Claude 3.7 Sonnet: `computer-use-2025-01-24`
- Claude 3.5 Sonnet (new): `computer-use-2024-10-22`

## Optimizing Model Performance with Prompting

Here are some tips on how to get the best quality outputs:

- Specify simple, well-defined tasks and provide explicit instructions for each step
- Claude sometimes assumes outcomes of its actions without explicitly checking their results. To prevent this, prompt Claude with: "After each step, take a screenshot and carefully evaluate if you have achieved the right outcome. Explicitly show your thinking: 'I have evaluated step X...' If not correct, try again. Only when you confirm a step was executed correctly should you move on to the next one."
- Some UI elements (like dropdowns and scrollbars) might be tricky for Claude to manipulate using mouse movements. If you experience this, try prompting the model to use keyboard shortcuts
- For repeatable tasks or UI interactions, include example screenshots and tool calls of successful outcomes in your prompt
- If you need the model to log in, provide it with the username and password in your prompt inside xml tags like `<robot_credentials>`. Using computer use within applications that require login increases the risk of bad outcomes as a result of prompt injection
- If you repeatedly encounter a clear set of issues or know in advance the tasks Claude will need to complete, use the system prompt to provide Claude with explicit tips or instructions on how to do the tasks successfully

## System Prompts

When one of the Anthropic-defined tools is requested via the Anthropic API, a computer use-specific system prompt is generated. It's similar to the tool use system prompt but starts with:

```
You have access to a set of functions you can use to answer the user's question. This includes access to a sandboxed computing environment. You do NOT currently have the ability to inspect files or interact with external resources, except by invoking the below functions.
```

As with regular tool use, the user-provided `system_prompt` field is still respected and used in the construction of the combined system prompt.

## Anthropic-defined Tools

As a beta, these tool definitions are subject to change. Anthropic provides a set of tools that enable Claude to effectively use computers. When specifying an Anthropic-defined tool, `description` and `tool_schema` fields are not necessary or allowed.

Anthropic-defined tools are defined by Anthropic but you must explicitly evaluate the results of the tool and return the `tool_results` to Claude. As with any tool, the model does not automatically execute the tool.

Anthropic provides a set of Anthropic-defined tools, with each tool having versions optimized for both Claude 3.5 Sonnet (new) and Claude 3.7 Sonnet.

The `type` field identifies the tool and its parameters for validation purposes, the `name` field is the tool name exposed to the model.

If you want to prompt the model to use one of these tools, you can explicitly refer to the tool by the `name` field. The `name` field must be unique within the tool list; you cannot define a tool with the same name as an Anthropic-defined tool in the same API call.

Anthropic does not recommend defining tools with the names of Anthropic-defined tools. While you can still redefine tools with these names (as long as the tool name is unique in your tools block), doing so may result in degraded model performance.

### Computer Tool

Anthropic does not recommend sending screenshots in resolutions above XGA/WXGA to avoid issues related to image resizing. Relying on the image resizing behavior in the API will result in lower model accuracy and slower performance than directly implementing scaling yourself.

The reference repository demonstrates how to scale from higher resolutions to a suggested resolution.

#### Types
- `computer_20250124` - Enhanced computer tool with additional actions available in Claude 3.7 Sonnet
- `computer_20241022` - Original computer tool used with Claude 3.5 Sonnet (new)

#### Parameters
- `display_width_px`: Required - The width of the display being controlled by the model in pixels
- `display_height_px`: Required - The height of the display being controlled by the model in pixels
- `display_number`: Optional - The display number to control (only relevant for X11 environments). If specified, the tool will be provided a display number in the tool definition

#### Tool Input Schema

For the enhanced `computer_20250124` tool available with Claude 3.7 Sonnet, actions include:

- `key`: Press a key or key-combination on the keyboard
- `hold_key`: Hold down a key or multiple keys for a specified duration (in seconds)
- `type`: Type a string of text on the keyboard
- `cursor_position`: Get the current (x, y) pixel coordinate of the cursor on the screen
- `mouse_move`: Move the cursor to a specified (x, y) pixel coordinate on the screen
- `left_mouse_down`: Press the left mouse button
- `left_mouse_up`: Release the left mouse button
- `left_click`: Click the left mouse button at the specified (x, y) pixel coordinate
- `left_click_drag`: Click and drag the cursor from `start_coordinate` to a specified coordinate
- `right_click`: Click the right mouse button at the specified (x, y) pixel coordinate
- `middle_click`: Click the middle mouse button at the specified (x, y) pixel coordinate
- `double_click`: Double-click the left mouse button at the specified (x, y) pixel coordinate
- `triple_click`: Triple-click the left mouse button at the specified (x, y) pixel coordinate
- `scroll`: Scroll the screen in a specified direction by a specified amount of clicks
- `wait`: Wait for a specified duration (in seconds)
- `screenshot`: Take a screenshot of the screen

For the original `computer_20241022` tool used with Claude 3.5 Sonnet (new), actions include:

- `key`: Press a key or key-combination on the keyboard
- `type`: Type a string of text on the keyboard
- `cursor_position`: Get the current (x, y) pixel coordinate of the cursor on the screen
- `mouse_move`: Move the cursor to a specified (x, y) pixel coordinate on the screen
- `left_click`: Click the left mouse button
- `left_click_drag`: Click and drag the cursor to a specified (x, y) pixel coordinate
- `right_click`: Click the right mouse button
- `middle_click`: Click the middle mouse button
- `double_click`: Double-click the left mouse button
- `screenshot`: Take a screenshot of the screen

### Text Editor Tool

#### Types
- `text_editor_20250124` - Same capabilities as the 20241022 version, for use with Claude 3.7 Sonnet
- `text_editor_20241022` - Original text editor tool used with Claude 3.5 Sonnet (new)

#### Commands
- `view`: Displays the result of applying `cat -n` for files, or lists non-hidden files and directories up to 2 levels deep for directories
- `create`: Creates a new file with the specified content (cannot be used if the path already exists)
- `str_replace`: Replaces a specific string in a file with a new string
- `insert`: Inserts a new string after a specified line in a file
- `undo_edit`: Reverts the last edit made to the file at the specified path

### Bash Tool

#### Types
- `bash_20250124` - Same capabilities as the 20241022 version, for use with Claude 3.7 Sonnet
- `bash_20241022` - Original bash tool used with Claude 3.5 Sonnet (new)

#### Features
- Runs commands in a bash shell
- State is persistent across command calls and discussions with the user
- Access to a mirror of common linux and python packages via apt and pip

## Enabling Thinking Capability in Claude 3.7 Sonnet

Claude 3.7 Sonnet introduces a new "thinking" capability that allows you to see the model's reasoning process as it works through complex tasks. This feature helps you understand how Claude is approaching a problem and can be particularly valuable for debugging or educational purposes.

To enable thinking, add a thinking parameter to your API request:

```json
"thinking": {
  "type": "enabled",
  "budget_tokens": 1024
}
```

The `budget_tokens` parameter specifies how many tokens Claude can use for thinking. This is subtracted from your overall `max_tokens` budget.

When thinking is enabled, Claude will return its reasoning process as part of the response, which can help you:
- Understand the model's decision-making process
- Identify potential issues or misconceptions
- Learn from Claude's approach to problem-solving
- Get more visibility into complex multi-step operations

## Combining Computer Use with Other Tools

You can combine regular tool use with the Anthropic-defined tools for computer use.

```shell
curl https://api.anthropic.com/v1/messages \
  -H "content-type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "anthropic-beta: computer-use-2025-01-24" \
  -d '{
    "model": "claude-3-7-sonnet-20250219",
    "max_tokens": 1024,
    "tools": [
      {
        "type": "computer_20250124",
        "name": "computer",
        "display_width_px": 1024,
        "display_height_px": 768,
        "display_number": 1
      },
      {
        "type": "text_editor_20250124",
        "name": "str_replace_editor"
      },
      {
        "type": "bash_20250124",
        "name": "bash"
      },
      {
        "name": "get_weather",
        "description": "Get the current weather in a given location",
        "input_schema": {
          "type": "object",
          "properties": {
            "location": {
              "type": "string",
              "description": "The city and state, e.g. San Francisco, CA"
            },
            "unit": {
              "type": "string",
              "enum": ["celsius", "fahrenheit"],
              "description": "The unit of temperature, either 'celsius' or 'fahrenheit'"
            }
          },
          "required": ["location"]
        }
      }
    ],
    "messages": [
      {
        "role": "user",
        "content": "Find flights from San Francisco to a place with warmer weather."
      }
    ],
    "thinking": {
      "type": "enabled",
      "budget_tokens": 1024
    }
  }'
```

## Building a Custom Computer Use Environment

The reference implementation is meant to help you get started with computer use. It includes all of the components needed to have Claude use a computer. However, you can build your own environment for computer use to suit your needs. You'll need:

- A virtualized or containerized environment suitable for computer use with Claude
- An implementation of at least one of the Anthropic-defined computer use tools
- An agent loop that interacts with the Anthropic API and executes the `tool_use` results using your tool implementations
- An API or UI that allows user input to start the agent loop

## Computer Use Limitations

The computer use functionality is in beta. While Claude's capabilities are cutting edge, developers should be aware of its limitations:

- **Latency**: The current computer use latency for human-AI interactions may be too slow compared to regular human-directed computer actions. Focus on use cases where speed isn't critical in trusted environments.

- **Computer vision accuracy and reliability**: Claude may make mistakes or hallucinate when outputting specific coordinates while generating actions. Claude 3.7 Sonnet's thinking capability can help understand the model's reasoning and identify potential issues.

- **Tool selection accuracy and reliability**: Claude may make mistakes or hallucinate when selecting tools or take unexpected actions to solve problems. Reliability may be lower when interacting with niche applications or multiple applications at once. Prompt the model carefully when requesting complex tasks.

- **Scrolling reliability**: While Claude 3.5 Sonnet (new) had limitations with scrolling, Claude 3.7 Sonnet introduces dedicated scroll actions with direction control that improves reliability. The model can now explicitly scroll in any direction (up/down/left/right) by a specified amount.

- **Spreadsheet interaction**: Mouse clicks for spreadsheet interaction have improved in Claude 3.7 Sonnet with the addition of more precise mouse control actions and new modifier key support. Cell selection can be more reliable by using fine-grained controls and combining modifier keys with clicks.

- **Account creation and content generation**: While Claude will visit websites, Anthropic is limiting its ability to create accounts or generate and share content or otherwise engage in human impersonation across social media websites and platforms.

- **Vulnerabilities**: Vulnerabilities like jailbreaking or prompt injection may persist across frontier AI systems, including the beta computer use API. In some circumstances, Claude will follow commands found in content, sometimes even in conflict with the user's instructions. Recommendations:
  - Limit computer use to trusted environments such as virtual machines or containers with minimal privileges
  - Avoid giving computer use access to sensitive accounts or data without strict oversight
  - Inform end users of relevant risks and obtain their consent before enabling computer use features

- **Inappropriate or illegal actions**: Per Anthropic's terms of service, you must not employ computer use to violate any laws or the Acceptable Use Policy.

Always carefully review and verify Claude's computer use actions and logs. Do not use Claude for tasks requiring perfect precision or sensitive user information without human oversight.

## Pricing

Computer use requests are priced the same as any other Claude API request. Anthropic automatically includes a special system prompt for the model, which enables computer use:

| Model | Tool choice | System prompt token count |
|-------|-------------|---------------------------|
| Claude 3.5 Sonnet (new) | auto | 466 tokens |
| Claude 3.5 Sonnet (new) | any, tool | 499 tokens |
| Claude 3.7 Sonnet | auto | 466 tokens |
| Claude 3.7 Sonnet | any, tool | 499 tokens |

In addition to the base tokens, the following additional input tokens are needed for the Anthropic-defined tools:

| Tool | Additional input tokens |
|------|-------------------------|
| computer_20241022 (Claude 3.5 Sonnet) | 683 tokens |
| computer_20250124 (Claude 3.7 Sonnet) | 735 tokens |
| text_editor_20241022 (Claude 3.5 Sonnet) | 700 tokens |
| text_editor_20250124 (Claude 3.7 Sonnet) | 700 tokens |
| bash_20241022 (Claude 3.5 Sonnet) | 245 tokens |
| bash_20250124 (Claude 3.7 Sonnet) | 245 tokens |

If you enable thinking with Claude 3.7 Sonnet, the tokens used for thinking will be counted against your `max_tokens` budget based on the `budget_tokens` you specify in the thinking parameter.