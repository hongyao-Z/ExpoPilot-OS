# Claw Runtime Integration

## Purpose

This document defines how ExpoPilot integrates a Claw-family runtime as an external explanation source.

Current scope is intentionally narrow:

- external runtime role: explanation source only
- supported explanation slots:
  - `why_event`
  - `why_action`
  - `why_assignee`
  - `why_state`
- local fallback remains mandatory

This is not an execution integration document.

## Supported Runtime Kinds

Current config already reserves these runtime kinds:

- `openclaw`
- `autoclaw`
- `openclaw_compatible`

They all map to the same current integration boundary:

- ExpoPilot prepares explanation input
- Claw runtime returns explanation content only
- ExpoPilot normalizes the response into the four fixed slots

## Current Placeholder Behavior

Current implementation supports explanation source selection through:

- `fallback_template`
- `mock_reasoner`
- `remote_claw_placeholder`

`remote_claw_placeholder` currently does three things:

1. builds a normalized Claw explanation request draft
2. preserves the future runtime contract shape
3. fails fast and falls back to `fallback_template`

This means the current baseline already has:

- source selection
- request contract shape
- fallback path

What it does not yet have is real external transport.

## Real Integration Boundary

When ExpoPilot upgrades from placeholder mode to a real Claw explanation source, the replacement point should stay inside the explanation layer.

The intended replacement order is:

1. `src/lib/agent-claw-config.ts`
   - upgrade runtime config from placeholder-only shape to real transport config
2. `src/lib/agent-claw-explanation.ts`
   - replace placeholder failure with real request, response normalization, and failure mapping
3. `src/lib/agent-explanation-providers.ts`
   - keep source selection and fallback centralized here

The following layers should not absorb Claw runtime logic:

- `LivePage.tsx`
- `AgentCockpitPanel.tsx`
- risk policy
- execution bridge
- audit store
- takeover policy
- rollback policy

## Input Contract

Claw runtime should consume:

- current `AgentContext`
- a minimal decision summary derived by ExpoPilot

The current request draft already includes:

- `contextId`
- `eventType`
- `state`
- `mode`
- `eventLabel`
- `actionLabel`
- `assigneeLabel`
- `sourceModeLabel`
- `triggerPoints`
- requested slots

The runtime should not require direct access to ExpoPilot internal control logic.

## Output Contract

Claw runtime must return a payload that ExpoPilot can normalize into:

```json
{
  "why_event": "string",
  "why_action": "string",
  "why_assignee": "string",
  "why_state": "string"
}
```

Accepted response shapes may vary, but ExpoPilot must normalize them before they reach the UI.

The runtime must not return one large narrative blob as the final UI payload.

## Fallback Rule

Fallback stays fixed:

- Claw runtime unavailable -> `fallback_template`

Current design deliberately does not route Claw failures into `mock_reasoner`.

This keeps failure handling simple and predictable.

## Failure Mapping

Future real integration should classify failures at least into:

- `unavailable`
- `timeout`
- `bad_response`
- `invalid_payload`

These failure reasons belong in the explanation adapter/provider boundary, not in page code.

## Why Explanation Source First

ExpoPilot already has a frozen local control surface:

- decision assembly
- risk and approval boundaries
- execution bridge
- audit persistence
- human takeover
- rollback semantics

Adding Claw at the explanation layer first is the lowest-risk path because:

- it does not change mainline event flow
- it does not touch execution
- it does not weaken local safety boundaries
- it validates external runtime compatibility with minimal blast radius

## Why Skills Stay Minimal

Claw runtime is not currently treated as a skill executor.

That restraint is intentional:

- explanation generation is a bounded, read-only integration surface
- tool or skill execution would require new security and audit decisions
- folding execution into the same adapter would blur responsibilities and break the current baseline

For now, Claw runtime should remain a narrow explanation provider.

## Agent Knowledge Boundary

ExpoPilot now separates three layers:

| Layer | Role | Boundary |
|---|---|---|
| Local operations knowledge | Provides event evidence, escalation rules, recommended actions, forbidden actions, roles, manager checklist, and staff instructions | Default source, works offline |
| EventReviewAgent | Reviews what happened, whether evidence is sufficient, risk level, uncertainty, and manager checklist | Does not recommend assignee, does not create task |
| DispatchAgent | Recommends action, primary assignee, backup assignee, candidate score, fallback action, and dispatch checklist | Does not create task, does not change task state |

Optional LLM/RAG switches are off by default:

```env
VITE_AGENT_KNOWLEDGE_SOURCE=local
VITE_AGENT_LLM_ENABLED=false
VITE_AGENT_RAG_ENABLED=false
```

If `rag_optional` or `llm_optional` is enabled later, generated text must still pass local guards. LLM output cannot create tasks, skip manager confirmation, overwrite risk/audit/takeover/rollback, or become an executor.
