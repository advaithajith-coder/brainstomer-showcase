import test from "node:test";
import assert from "node:assert/strict";
import { localApi } from "../lib/client-api.ts";
import { readData, writeData } from "../lib/local-store.ts";
import { demoIdeas } from "../lib/demo.ts";

class MemoryStorage implements Storage {
  values = new Map<string, string>();
  get length() { return this.values.size; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
}
test("audio capture saves locally, creates a starting point, and replays without duplicate AI calls", async () => {
  const storage = new MemoryStorage(); const data = readData(storage); data.ideas = []; writeData(storage, data);
  const originalFetch = globalThis.fetch; const calls: string[] = [];
  try {
    globalThis.fetch = async input => { const path = String(input); calls.push(path); if (path === "/api/transcribe") return Response.json({ text: "A small dinner helper using what is in my fridge." }); if (path === "/api/connection") return Response.json({ configured: true }); return Response.json(demoIdeas()[0].brief); };
    const id = crypto.randomUUID(); const form = new FormData(); form.append("id", id); form.append("file", new File([new Uint8Array(200)], "idea.wav", { type: "audio/wav" }));
    const result = await localApi<{ id: string; generated: boolean }>("/api/captures", { method: "POST", body: form }, storage);
    assert.equal(result.id, id); assert.equal(result.generated, true); assert.deepEqual(calls, ["/api/transcribe", "/api/connection", "/api/analyze"]);
    const saved = readData(storage); assert.equal(saved.ideas.length, 1); assert.ok(saved.ideas[0].brief?.handoffPrompt); assert.equal(saved.ideas[0].demo, false); assert.equal(saved.history[id].length, 1);
    await localApi("/api/captures", { method: "POST", body: form }, storage); assert.equal(calls.length, 3); assert.equal(readData(storage).history[id].length, 1);
  } finally { globalThis.fetch = originalFetch; }
});
test("an AI outage preserves a typed idea and reports the saved state truthfully", async () => {
  const storage = new MemoryStorage(); const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new Error("offline"); };
    const id = crypto.randomUUID(); const form = new FormData(); form.append("id", id); form.append("text", "A small project I want to keep even if the network fails.");
    const result = await localApi<{ id: string; generated: boolean; warning: string }>("/api/captures", { method: "POST", body: form }, storage);
    assert.equal(result.generated, false); assert.match(result.warning, /saved in this browser/); assert.ok(readData(storage).ideas.some(item => item.id === id));
  } finally { globalThis.fetch = originalFetch; }
});
