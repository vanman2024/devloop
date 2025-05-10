# Guardrails Implementation Examples

Here's how you would set up guardrails when using the OpenAI Agents SDK:

```python
from agents import (
    Agent,
    GuardrailFunctionOutput,
    InputGuardrailTripwireTriggered,
    RunContextWrapper,
)

async def churn_detection_tripwire(
    ctx: RunContextWrapper[None], agent: Agent, input: str | list[TResponseInputItem]
) -> GuardrailFunctionOutput:
    result = await Runner.run(churn_detection_agent, input)
    
    # Logic to determine if input contains churn risk signals
    # ...
    
    if churn_risk_detected:
        # Create a high-priority ticket in the CRM
        create_churn_risk_ticket(input)
        
        return GuardrailFunctionOutput(
            action=GuardrailAction.ALLOW,
            message="Churn risk detected and ticket created."
        )
    
    return GuardrailFunctionOutput(action=GuardrailAction.ALLOW)

# Apply the guardrail to your agent
customer_service_agent = Agent(
    name="customer_service",
    instructions="You provide helpful responses to customer inquiries.",
    tools=[search_knowledge_base, create_ticket],
    input_guardrails=[churn_detection_tripwire]
)
```

## Implementing a Safety Classifier

```python
async def safety_classifier(
    ctx: RunContextWrapper[None], agent: Agent, input: str | list[TResponseInputItem]
) -> GuardrailFunctionOutput:
    # Check if input contains unsafe content
    is_safe = await check_safety(input)
    
    if not is_safe:
        return GuardrailFunctionOutput(
            action=GuardrailAction.BLOCK,
            message="I'm sorry, but I cannot process your request as it may contain unsafe content."
        )
    
    return GuardrailFunctionOutput(action=GuardrailAction.ALLOW)
```

## Implementing PII Filtering

```python
async def pii_filter(
    ctx: RunContextWrapper[None], agent: Agent, output: str
) -> GuardrailFunctionOutput:
    # Check if the output contains PII
    contains_pii, redacted_output = detect_and_redact_pii(output)
    
    if contains_pii:
        return GuardrailFunctionOutput(
            action=GuardrailAction.MODIFY,
            modified_content=redacted_output
        )
    
    return GuardrailFunctionOutput(action=GuardrailAction.ALLOW)
```

These examples show different types of guardrails that can be implemented in the OpenAI Agents SDK:

1. The churn_detection_tripwire monitors customer messages for signs of churn risk
2. The safety_classifier blocks unsafe content
3. The pii_filter modifies outputs to redact personally identifiable information

Guardrails can be added to agents via the input_guardrails and output_guardrails parameters, creating a layered defense system.