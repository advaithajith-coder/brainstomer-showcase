import { briefSchema, scoreBrief, type Brief, type Idea } from "./idea.ts";
import { readData, writeData, removeIdea, type Version } from "./local-store.ts";

async function remote<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try { response = await fetch(path, { ...init, headers: { ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...init.headers }, signal: init.signal || AbortSignal.timeout(60000), cache: "no-store" }); }
  catch { throw new Error("The connection was interrupted. Keep this page open and retry."); }
  const value = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(value.error || "This request could not be completed. Please retry.");
  return value as T;
}
async function generate(storage: Storage, id: string) {
  const data = readData(storage); const idea = data.ideas.find(item => item.id === id);
  if (!idea) throw new Error("Idea not found in this browser.");
  const previousBrief = idea.brief || data.history[id]?.[0]?.brief || null;
  const raw = await remote<Brief>("/api/analyze", { method: "POST", body: JSON.stringify({ transcript: idea.transcript, previousBrief }) });
  const brief = briefSchema.parse(raw); const current = readData(storage); const index = current.ideas.findIndex(item => item.id === id);
  if (index < 0 || current.ideas[index].revision !== idea.revision) throw new Error("This idea changed in another tab. Refresh it and try again.");
  const now = new Date().toISOString(); const result: Idea = { ...idea, title: brief.title, brief, score: scoreBrief(brief), revision: idea.revision + 1, updatedAt: now, demo: false };
  current.ideas[index] = result;
  const version: Version = { id: crypto.randomUUID(), transcript: idea.transcript, brief, createdAt: now };
  current.history[id] = [version, ...(current.history[id] || [])].slice(0, 5);
  writeData(storage, current); return result;
}
export async function localApi<T>(path: string, init: RequestInit = {}, storage = window.localStorage): Promise<T> {
  const method = init.method || "GET";
  if (path === "/api/connection") return remote<T>(path, init);
  if (path === "/api/ideas" && method === "GET") return readData(storage).ideas as T;
  if (path === "/api/captures" && method === "POST") {
    if (!(init.body instanceof FormData)) throw new Error("A capture is required.");
    const form = init.body; const id = String(form.get("id")); const targetId = String(form.get("targetId") || "");
    const existing = readData(storage).applied.find(item => item.id === id);
    let ideaId = existing?.ideaId;
    if (ideaId && readData(storage).ideas.find(item => item.id === ideaId)?.brief) return { id: ideaId, generated: true } as T;
    if (!ideaId) {
      let text = String(form.get("text") || "").trim(); const audio = form.get("file");
      if (audio instanceof File) { const audioForm = new FormData(); audioForm.append("file", audio); const result = await remote<{ text: string }>("/api/transcribe", { method: "POST", body: audioForm }); text = result.text; }
      if (text.length < 3 || text.length > 20000) throw new Error("Add an idea between 3 and 20,000 characters.");
      const data = readData(storage); const replay = data.applied.find(item => item.id === id);
      if (replay) ideaId = replay.ideaId;
      else {
        const now = new Date().toISOString(); const target = targetId ? data.ideas.find(item => item.id === targetId) : undefined;
        if (targetId && !target) throw new Error("The selected idea was removed. Start a new capture.");
        if (!target && data.ideas.length >= 100) throw new Error("Export or remove an idea before adding more. This demo holds 100 ideas per browser.");
        const transcript = target ? `${target.transcript}\n\nAdditional thought:\n${text}` : text;
        if (transcript.length > 20000) throw new Error("This idea is full. Save the new thought separately.");
        const next: Idea = target ? { ...target, transcript, brief: null, score: 0, revision: target.revision + 1, updatedAt: now, demo: false } : { id, title: audio instanceof File ? "Voice idea" : text.slice(0, 70), transcript, brief: null, status: "inbox", score: 0, revision: 1, createdAt: now, updatedAt: now, demo: false };
        data.ideas = [...data.ideas.filter(item => item.id !== next.id), next]; data.applied = [...data.applied, { id, ideaId: next.id }].slice(-200); writeData(storage, data); ideaId = next.id;
      }
    }
    try { const connection = await remote<{ configured: boolean }>("/api/connection"); if (!connection.configured) return { id: ideaId, generated: false } as T; await generate(storage, ideaId); return { id: ideaId, generated: true } as T; }
    catch (error) { return { id: ideaId, generated: false, warning: `Your idea is saved in this browser. ${(error as Error).message} Open it later and select Create starting point to retry.` } as T; }
  }
  const match = path.match(/^\/api\/ideas\/([^/]+)(?:\/(analyze|versions))?$/);
  if (match) {
    const [, id, action] = match;
    if (action === "analyze" && method === "POST") return await generate(storage, id) as T;
    const data = readData(storage); const idea = data.ideas.find(item => item.id === id);
    if (!idea) throw new Error("Idea not found in this browser.");
    if (action === "versions") return (data.history[id] || []) as T;
    if (method === "DELETE") { removeIdea(storage, id); return { ok: true } as T; }
    if (method === "PATCH") {
      const update = JSON.parse(String(init.body));
      if (update.revision !== idea.revision) throw new Error("This idea changed in another tab. Refresh and try again.");
      if (!["inbox", "exploring", "in-progress", "paused", "archived"].includes(update.status)) throw new Error("Choose a valid status.");
      const changed = { ...idea, status: update.status, revision: idea.revision + 1, updatedAt: new Date().toISOString() }; data.ideas = data.ideas.map(item => item.id === id ? changed : item); writeData(storage, data); return changed as T;
    }
  }
  throw new Error("This action is not available in the showcase.");
}
