import assert from "node:assert/strict";
import { setTimeout } from "node:timers/promises";

const base = process.env.WORKER_BASE_URL;
assert.ok(base, "WORKER_BASE_URL is required");
for (let attempt = 0; ; attempt += 1) {
  try {
    const response = await fetch(`${base}/healthz`, { signal: AbortSignal.timeout(2000) });
    assert.ok(response.ok);
    break;
  } catch (error) {
    if (attempt >= 59) throw error;
    await setTimeout(1000);
  }
}

const identity = { task_id: "image-smoke", session_id: "image-smoke" };
async function post(path, extra = {}) {
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...identity, ...extra }),
    signal: AbortSignal.timeout(60000),
  });
  const body = await response.json();
  assert.ok(response.ok, JSON.stringify(body));
  return body;
}

await post("/v1/session/start");
try {
  const result = await post("/v1/commands", {
    command: { type: "evaluate", expression: "1 + 2" },
  });
  assert.equal(result.status, "ok");
  assert.equal(result.result.value, 3);
  const screenshot = await post("/v1/commands", { command: { type: "screenshot" } });
  assert.ok(screenshot.result.screenshot_base64.length > 100);
  const exported = await post("/v1/storage-state/export");
  assert.ok(Array.isArray(exported.state.cookies));
  await post("/v1/storage-state/import", { state: exported.state });
  console.log("Worker image smoke test passed: Chromium, screenshot, and storage-state roundtrip.");
} finally {
  await post("/v1/session/stop");
}
