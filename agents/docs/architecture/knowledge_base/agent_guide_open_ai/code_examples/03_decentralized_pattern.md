# Decentralized Pattern Code Examples

In the decentralized pattern, agents can 'handoff' workflow execution to one another. Here's how you'd implement this pattern using the OpenAI Agents SDK for a customer service workflow:

```python
from agents import Agent, Runner

technical_support_agent = Agent(
    name="Technical Support Agent",
    instructions=(
        "You provide expert assistance with resolving technical issues, "
        "system outages, or product troubleshooting."
    ),
    tools=[search_knowledge_base]
)

sales_assistant_agent = Agent(
    name="Sales Assistant Agent",
    instructions=(
        "You help enterprise clients browse the product catalog, recommend "
        "suitable solutions, and facilitate purchase transactions."
    ),
    tools=[initiate_purchase_order]
)

order_management_agent = Agent(
    name="Order Management Agent",
    instructions=(
        "You assist clients with inquiries regarding order tracking, "
        "delivery schedules, and processing returns or refunds."
    ),
    tools=[track_order_status, initiate_refund_process]
)

triage_agent = Agent(
    name="Triage Agent",
    instructions="You act as the first point of contact, assessing customer " 
    "queries and directing them promptly to the correct specialized agent.",
    handoffs=[technical_support_agent, sales_assistant_agent, order_management_agent],
)

await Runner.run(
    triage_agent,
    input("Could you please provide an update on the delivery timeline for " 
    "our recent purchase?")
)
```

In this example:
1. Four specialized agents are defined for different customer service functions
2. The triage_agent has access to the other agents through the handoffs parameter
3. When the triage_agent determines that a query is better handled by a specialized agent, it can hand off control
4. The specialized agent takes over and directly interacts with the user
5. For this query about delivery timeline, the triage_agent would hand off to the order_management_agent

This pattern is especially effective for:
- Conversation triage
- Cases where specialized agents should fully take over tasks
- Situations where you don't need a central agent to maintain control