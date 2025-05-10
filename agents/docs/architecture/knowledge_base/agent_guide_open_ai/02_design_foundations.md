# Agent Design Foundations

In its most fundamental form, an agent consists of three core components:

## 1. Model

The LLM powers the agent's reasoning and decision-making. Different models have different strengths and tradeoffs related to task complexity, latency, and cost.

**Guidelines for model selection:**
- Set up evaluations to establish a performance baseline
- Focus on meeting your accuracy target with the best models available
- Optimize for cost and latency by replacing larger models with smaller ones where possible

Not every task requires the most capable model—a simple retrieval or intent classification task may be handled by a smaller, faster model, while harder tasks like deciding whether to approve a refund may benefit from a more capable model.

## 2. Tools

Tools extend your agent's capabilities by using APIs from underlying applications or systems. Each tool should have a standardized definition, enabling flexible, many-to-many relationships between tools and agents.

**Types of Tools:**

1. **Data Tools**: Enable agents to retrieve context and information necessary for executing the workflow.
   - Examples: Query transaction databases, read PDF documents, search the web.

2. **Action Tools**: Enable agents to interact with systems to take actions.
   - Examples: Send emails, update a CRM record, hand-off a customer service ticket to a human.

3. **Orchestration Tools**: Agents themselves can serve as tools for other agents.
   - Examples: Refund agent, Research agent, Writing agent.

As the number of required tools increases, consider splitting tasks across multiple agents.

## 3. Instructions

High-quality instructions are essential for any LLM-powered app, but especially critical for agents. Clear instructions reduce ambiguity and improve agent decision-making, resulting in smoother workflow execution and fewer errors.

**Best practices for agent instructions:**

1. **Use existing documents**: When creating routines, use existing operating procedures, support scripts, or policy documents to create LLM-friendly routines.

2. **Prompt agents to break down tasks**: Providing smaller, clearer steps from dense resources helps minimize ambiguity and helps the model better follow instructions.

3. **Define clear actions**: Make sure every step in your routine corresponds to a specific action or output.

4. **Capture edge cases**: Real-world interactions often create decision points such as how to proceed when a user provides incomplete information or asks an unexpected question.

You can use advanced models to automatically generate instructions from existing documents.