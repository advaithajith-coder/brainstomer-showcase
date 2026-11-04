import test from "node:test";
import assert from "node:assert/strict";
import { STORAGE_KEY, readData, writeData, removeIdea } from "../lib/local-store.ts";
import { briefSchema } from "../lib/idea.ts";

class MemoryStorage { value: string | null = null; getItem() { return this.value; } setItem(_key: string, value: string) { this.value = value; } }
test("a new visitor gets only clearly marked examples", () => { const storage = new MemoryStorage(); const data = readData(storage); assert.equal(data.ideas.length, 3); for (const idea of data.ideas) { assert.equal(idea.demo, true); assert.ok(briefSchema.safeParse(idea.brief).success); } });
test("an intentionally empty collection stays empty after reload", () => { const storage = new MemoryStorage(); const data = readData(storage); data.ideas = []; writeData(storage, data); assert.equal(readData(storage).ideas.length, 0); });
test("deleting an idea also removes its local history and capture markers", () => { const storage = new MemoryStorage(); const data = readData(storage); const idea = data.ideas[0]; data.history[idea.id] = [{ id: "version", transcript: idea.transcript, brief: idea.brief!, createdAt: idea.createdAt }]; data.applied = [{ id: "capture", ideaId: idea.id }]; writeData(storage, data); removeIdea(storage, idea.id); const after = readData(storage); assert.ok(!after.ideas.some(item => item.id === idea.id)); assert.equal(after.history[idea.id], undefined); assert.equal(after.applied.length, 0); });
test("corrupt data is not silently replaced", () => { const storage = new MemoryStorage(); storage.value = "broken data"; assert.throws(() => readData(storage), /could not be read/); assert.equal(storage.getItem(), "broken data"); });
test("storage failures are reported without claiming a successful save", () => { const storage = new MemoryStorage(); const data = readData(storage); assert.throws(() => writeData({ getItem: () => null, setItem: () => { throw new Error("Quota exceeded"); } }, data), /storage is full or unavailable/); assert.equal(STORAGE_KEY.includes("showcase"), true); });
