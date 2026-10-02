# Asking users for input

Skill instructions can tell the agent to call the built-in `ask_user` tool when it needs a user decision or missing information. The agent supplies the complete question, optional context, and optional choices:

```json
{
  "question": "Which shipping rate would you like?",
  "context": "Rates fetched successfully.",
  "options": [
    {"label": "FedEx Ground — $13.90", "value": "rate_1", "aliases": ["fedex ground"]},
    {"label": "USPS Ground Advantage — $20.01", "value": "rate_2", "aliases": ["usps"]}
  ]
}
```

The agent pauses until the user responds. Users can choose an option or ask a follow-up question. Omit `options` or pass `options: []` for free-text input. Numbers are assigned automatically, starting at 1. Labels, values, and aliases must not conflict across options. At most 20 options and 20 aliases per option are accepted. Question text is limited to 4096 UTF-8 bytes, context to 8192 bytes, and labels, values and aliases to 512 bytes each after trimming whitespace and converting to lowercase. JSON Schema length bounds count characters; runtime validation additionally enforces the UTF-8 byte limits.

Call `ask_user` on its own after prerequisite tools finish. Do not append hidden JSON or metadata tags to the visible response. The resumed tool result has status `answered`, `follow_up`, or `cancelled`. Only an `answered` result supplies a confirmed choice. A follow-up leaves the choice unresolved; do not perform an action that depends on it.

This is a model-facing tool. For a pause inside a skill script, use the existing `flo.task.waitForUserMessage` API instead.
