# Other APIs

This chapter collects the rest of the public author-facing runtime helpers.

## `flo.sleep(ms)`

Pause the script asynchronously:

```ts
await flo.sleep(500);
```

Use it sparingly for pacing, polling, or short waits between retries.

## `flo.time.formatUnixTimestamp(...)`

Format a Unix timestamp using the runtime helper:

```ts
const text = flo.time.formatUnixTimestamp(
  1_700_000_000,
  "YYYY-MM-DD HH:mm:ss",
  "UTC",
);
```

## `flo.task.getContext<T>()`

Read durable task context, including resume payloads:

```ts
const context = await flo.task.getContext<{
  resume_payload?: { batch_id?: string };
  custom?: { value: number };
}>();
```

## `flo.task.getProfile()`

Read the current runtime profile metadata for the tool caller:

```ts
const profile = await flo.task.getProfile();
const profileId = profile.profile_id;
const displayName = profile.display_name;
```

The returned object includes:

- `profile_id`
- `profile_kind`
- `permissions`
- optional `display_name`

In the local Node preload shim, `profile_id` defaults to `local-node-profile` and can be
overridden with `FLO_LOCAL_PROFILE_ID`. `display_name` can be set with
`FLO_LOCAL_PROFILE_DISPLAY_NAME`.

## `flo.task.waitForUserMessage(...)`

Suspend the current task until a later user message resumes it:

```ts
const response = await flo.task.waitForUserMessage({
  user_message: "Please finish the login, then reply done.",
  resume_payload: { step: "login" },
});
```

The public API name is `waitForUserMessage`. Legacy internal payloads may mention `wait_for_human`, but authored tools should use `flo.task.waitForUserMessage(...)`.

See [Wait For User Messages](wait-for-user-message.md) for resume behavior and checkpointing details.

## `flo.task.limits`

Inspect runtime task-orchestration limits:

```ts
const maxChildren = flo.task.limits.maxSpawnChildren;
```

Use this value to chunk child-task work before calling `spawnChildren(...)`.

## `flo.task.getState(...)` And `flo.task.putState(...)`

Read and write lightweight task-scoped state shared by all tools in the current task:

```ts
await flo.task.putState({
  key: "checkpoint",
  value: { phase: "fetching" },
});

const checkpoint = await flo.task.getState<{ phase?: string }>({
  key: "checkpoint",
});
```

## Built-In Tools Through `flo.callTool(...)`

`flo.d.ts` includes typed support for built-ins such as:

- `read_text_file`
- `write_text_file`
- `read_dir`
- `zip`
- `unzip`
- `csv_*`
- `excel_*`
- `media_fetch`
- `media_push_vfs`
- `media_push_base64`
- `get_media_download_url`
- `read_tool_result_artifact`
- `list_tool_result_artifacts`
- `send_notification`
- `send_media_attachment`
- `activate_skill`
- `read_skill_resource`
- `import_skill_asset`

When a built-in already matches the file or media operation you need, prefer it over reimplementing the same behavior in script code.

`read_tool_result_artifact` reads a bounded selection from a large tool result that the current task already references. Pass `artifact_id` and optionally `json_pointer`, `offset`, and `limit`; `limit` is a serialized-data byte budget capped at 16 KiB. The tool never returns the complete artifact in one call, and artifact ids from other tasks are not readable.

`list_tool_result_artifacts` discovers the current task's stored result metadata without downloading content. Use an exact `tool_name` or case-insensitive `query` to find a relevant result, then pass its `artifact_id` to `read_tool_result_artifact`. Entries contain the originating tool, a structural size summary, content type, byte size, and first-seen sequence when known. Content previews are omitted (`preview` is null). Recent metadata is retained for up to 128 artifacts within a 64 KiB budget; older IDs remain available through unfiltered pagination with unknown metadata and sequence zero. First-seen order is not proof that data is current.

`limit` defaults to 10 and accepts 1–20. Responses can be shorter because of the response size limit. Follow `next_offset` with the same filters while `has_more` is true. If new artifacts are created during pagination, restart at offset 0. Both artifact tools require a live task runtime; the local Node preload shim does not simulate stored artifacts.

```ts
const page = await flo.callTool({
  tool_id: "list_tool_result_artifacts",
  input: { tool_name: "orders.list", limit: 5 },
});
if (page.status === "success" && page.output?.entries.length) {
  const selection = await flo.callTool({
    tool_id: "read_tool_result_artifact",
    input: { artifact_id: page.output.entries[0].artifact_id, limit: 4096 },
  });
  // Inspect the selection and pagination fields before using the result.
}
```

## Skill Resources And Assets

Two built-ins are especially useful from authored skills:

- `activate_skill` proactively adds a visible skill to the current task by `skill_id`
  - activation is handled by suspending the current execution so `agentd` can restart the task turn with the expanded skill set
  - if the newly activated skills require labels the current agent does not satisfy, `agentd` may hand the task over before execution continues
- `read_skill_resource` reads a selected skill resource or imports it into VFS
- `import_skill_asset` copies a selected skill asset into VFS

Both are invoked through `flo.callTool(...)`.

## Final Notes

- Favor JSON-serializable inputs and outputs.
- Keep secrets in the vault, not in manifests or state.
- Use shared task state or task tool state for resume checkpoints, depending on whether later tools need the same checkpoint.
- Use the manifest as the contract for what your tool needs.

For exact TypeScript signatures, refer to [`flo.d.ts`](https://github.com/FlordaWeave/floagent/blob/main/flo.d.ts).
