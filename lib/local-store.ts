import { z } from "zod";
import { briefSchema, type Idea, type Brief } from "./idea.ts";
import { demoIdeas } from "./demo.ts";

export const STORAGE_KEY = "brainstomer-showcase-v1";
export type Version = { id: string; transcript: string; brief: Brief; createdAt: string };
type StorageLike = Pick<Storage, "getItem" | "setItem">;
const ideaSchema = z.object({ id: z.string(), title: z.string(), transcript: z.string().max(20000), brief: briefSchema.nullable(), status: z.enum(["inbox", "exploring", "in-progress", "paused", "archived"]), score: z.number(), revision: z.number().int(), createdAt: z.string(), updatedAt: z.string(), demo: z.boolean().optional() });
const versionSchema = z.object({ id: z.string(), transcript: z.string().max(20000), brief: briefSchema, createdAt: z.string() });
const dataSchema = z.object({ version: z.literal(1), ideas: z.array(ideaSchema).max(100), history: z.record(z.string(), z.array(versionSchema).max(5)), applied: z.array(z.object({ id: z.string(), ideaId: z.string() })).max(200) });
export type LocalData = z.infer<typeof dataSchema>;
export function writeData(storage: StorageLike, data: LocalData) {
  const safe = dataSchema.parse(data);
  try { storage.setItem(STORAGE_KEY, JSON.stringify(safe)); }
  catch { throw new Error("Browser storage is full or unavailable. Export an idea, remove older ideas, and try again."); }
}
export function resetExamples(storage: StorageLike) {
  const data: LocalData = { version: 1, ideas: demoIdeas(), history: {}, applied: [] };
  writeData(storage, data); return data;
}
export function readData(storage: StorageLike): LocalData {
  let raw: string | null;
  try { raw = storage.getItem(STORAGE_KEY); } catch { throw new Error("Browser storage is unavailable. Enable it or try a normal browser window."); }
  if (!raw) return resetExamples(storage);
  try { return dataSchema.parse(JSON.parse(raw)); } catch { throw new Error("Saved browser data could not be read. Use Restore examples to reset this browser’s showcase data."); }
}
export function saveIdea(storage: StorageLike, idea: Idea) {
  const data = readData(storage); const index = data.ideas.findIndex(item => item.id === idea.id);
  if (index < 0 && data.ideas.length >= 100) throw new Error("This demo stores up to 100 ideas in a browser. Export or remove an idea first.");
  if (index < 0) data.ideas.push(idea); else data.ideas[index] = idea;
  writeData(storage, data);
}
export function removeIdea(storage: StorageLike, id: string) {
  const data = readData(storage); data.ideas = data.ideas.filter(item => item.id !== id); delete data.history[id]; data.applied = data.applied.filter(item => item.ideaId !== id); writeData(storage, data);
}
