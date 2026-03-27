<!-- AgentCrow Start -->
# AgentCrow — Auto Agent Dispatch

## Rules
1. For complex requests (2+ tasks), find matching agents from .claude/agents/ and dispatch them using the Agent tool.
2. Dispatch at most **5 agents** at a time. If more are needed, pick the top 5 by priority.
3. Dispatch independent tasks in parallel, dependent ones sequentially.
4. Do not ask questions. Make decisions and proceed.
5. Before dispatching, show the plan:
   ```
   🐦 AgentCrow — dispatching N agents:
   1. @agent_role → "task description"
   2. @agent_role → "task description"
   ```
6. Simple requests (bug fixes, single file edits) — handle directly, no agents needed.

## Agents: 144 available in .claude/agents/
<!-- AgentCrow End -->