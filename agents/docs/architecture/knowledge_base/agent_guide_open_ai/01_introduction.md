# Agent Guide: Introduction

## What is an Agent?

Agents are systems that independently accomplish tasks on your behalf. Unlike conventional software that streamlines and automates workflows, agents can perform these workflows with a high degree of independence.

An agent possesses core characteristics that allow it to act reliably and consistently:

1. **LLM-Powered Decision Making**: It leverages an LLM to manage workflow execution and make decisions. It recognizes when a workflow is complete and can proactively correct its actions if needed. In case of failure, it can halt execution and transfer control back to the user.

2. **Tool Access**: It has access to various tools to interact with external systems—both to gather context and to take actions—and dynamically selects the appropriate tools depending on the workflow's current state, always operating within clearly defined guardrails.

## When to Build an Agent

Agents are uniquely suited for workflows where traditional deterministic and rule-based approaches fall short:

1. **Complex Decision-Making**: Workflows involving nuanced judgment, exceptions, or context-sensitive decisions, for example refund approval in customer service workflows.

2. **Difficult-to-Maintain Rules**: Systems that have become unwieldy due to extensive and intricate rulesets, making updates costly or error-prone, for example performing vendor security reviews.

3. **Heavy Reliance on Unstructured Data**: Scenarios that involve interpreting natural language, extracting meaning from documents, or interacting with users conversationally, for example processing a home insurance claim.

Before committing to building an agent, validate that your use case can meet these criteria clearly. Otherwise, a deterministic solution may suffice.