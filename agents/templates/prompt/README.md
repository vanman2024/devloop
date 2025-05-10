# Prompt Templates

This directory contains prompt templates for different LLMs and use cases in our SDK-first architecture.

## Format-Specific Directories

- **json/** - JSON-based templates (universal compatibility)
- **markdown/** - Markdown-based templates (good general compatibility)
- **xml/** - XML-based templates (for Claude and other XML-capable LLMs only)

## LLM Compatibility

When selecting a template format, consider the LLM's capabilities:

| Format    | GPT-4/o | Claude | Llama 3 | Mistral | Others |
|-----------|---------|--------|---------|---------|--------|
| JSON      | ✅      | ✅     | ✅      | ✅      | ✅     |
| Markdown  | ✅      | ✅     | ✅      | ✅      | ✅     |
| XML       | ⚠️      | ✅     | ⚠️      | ⚠️      | ❌     |

✅ Full support
⚠️ Partial support (use with caution)
❌ Limited or no support

## Entity Extraction

- **entity_extraction.md** - Template for entity extraction from commands
- **json/entity_extraction.json** - JSON version for universal compatibility

## Command Processing

Templates for processing different command types:

- **xml/agent_command.xml** - Claude-optimized agent command template
- **json/agent_command.json** - Universal agent command template
- **markdown/agent_command.md** - Markdown agent command template

## Best Practices

1. **Default to JSON** for maximum compatibility
2. **Use XML only** with Claude or other XML-capable LLMs
3. **Test templates** with target LLMs before deployment
4. **Maintain equivalent templates** across formats
5. **Document LLM-specific behavior** in each template

## Implementation

To use these templates in your code:

```python
def load_template(command_type, format_preference, llm_type):
    """
    Load the appropriate template based on command type and LLM capability
    
    Args:
        command_type: Type of command (agent, tool, etc.)
        format_preference: Preferred format (json, markdown, xml)
        llm_type: Type of LLM being used
        
    Returns:
        Template string
    """
    # Check if preferred format is compatible with LLM
    if format_preference == 'xml' and llm_type not in ['claude']:
        # Fall back to JSON if XML not supported
        format_preference = 'json'
        
    # Load template from appropriate directory
    template_path = f"prompt/{format_preference}/{command_type}_command.{format_preference}"
    
    with open(template_path, 'r') as file:
        return file.read()
```