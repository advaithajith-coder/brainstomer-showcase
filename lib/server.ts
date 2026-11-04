import { createHash } from "node:crypto";
import { z } from "zod";

export class AppError extends Error { status: number; constructor(message: string, status = 400) { super(message); this.status = status; } }
export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const MAX_BODY_BYTES = MAX_AUDIO_BYTES + 64 * 1024;
type Bucket = { count: number; until: number };
// Best-effort protection per warm server instance. Add a Vercel Firewall rule or
// a shared rate-limit store for stronger protection across regions and cold starts.
const buckets = new Map<string, Bucket>();
export function takeLimit(key: string, limit: number, now = Date.now()) {
  const bucket = buckets.get(key);
  if (bucket && bucket.until > now && bucket.count >= limit) throw new AppError("This demo is receiving too many requests. Wait a minute and try again.", 429);
  buckets.set(key, bucket && bucket.until > now ? { count: bucket.count + 1, until: bucket.until } : { count: 1, until: now + 60000 });
  if (buckets.size > 2000) { for (const [id, value] of buckets) if (value.until <= now) buckets.delete(id); if (buckets.size > 2000) throw new AppError("The demo is busy. Please try again shortly.", 429); }
}
export function guard(request: Request, kind: "ai" | "connection" = "ai") {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new AppError("Request origin is not allowed.", 403);
  if (request.headers.get("sec-fetch-site") === "cross-site") throw new AppError("Cross-site requests are not allowed.", 403);
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const ip = createHash("sha256").update(address).digest("hex");
  takeLimit(`${kind}:${ip}`, kind === "ai" ? 8 : 30); takeLimit(`${kind}:global`, kind === "ai" ? 20 : 120);
}
export function configuredKey() {
  const key = process.env.GROQ_API_KEY?.trim().replace(/^GROQ_API_KEY\s*=\s*/i, "").replace(/^["']|["']$/g, "").trim();
  if (!key) throw new AppError("Live AI is not configured for this showcase yet. The project owner must add GROQ_API_KEY in Vercel. Example ideas still work.", 503);
  return key;
}
export async function boundedBody(request: Request, limit = MAX_BODY_BYTES) {
  if (Number(request.headers.get("content-length")) > limit) throw new AppError("This request is too large. Audio must be under 4 MB.", 413);
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
  try { while (true) { const { value, done } = await reader.read(); if (done) break; length += value.byteLength; if (length > limit) { await reader.cancel(); throw new AppError("This request is too large. Audio must be under 4 MB.", 413); } chunks.push(value); } }
  finally { reader.releaseLock(); }
  const body = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; } return body;
}
export async function jsonBody(request: Request) { const bytes = await boundedBody(request, 80000); try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new AppError("Send a valid JSON request."); } }
export async function formBody(request: Request) { const bytes = await boundedBody(request); return new Response(bytes, { headers: { "Content-Type": request.headers.get("content-type") || "application/octet-stream" } }).formData(); }
export async function callGroq<T>(path: string, key: string, body: FormData | object): Promise<T> {
  let response: Response;
  try { response = await fetch(`https://api.groq.com/openai/v1/${path}`, { method: "POST", headers: { Authorization: `Bearer ${key}`, ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }) }, body: body instanceof FormData ? body : JSON.stringify(body), signal: AbortSignal.timeout(45000), cache: "no-store" }); }
  catch { throw new AppError("Groq could not be reached. Your browser-saved ideas are unaffected; retry shortly.", 502); }
  if (!response.ok) {
    if (response.status === 429) throw new AppError("The shared demo has reached its Groq allowance. Please try again later.", 429);
    if (response.status === 401 || response.status === 403) throw new AppError("The showcase’s Groq key was rejected. The project owner needs to check its configuration.", 503);
    if (response.status === 413) throw new AppError("Audio is too large. Choose a file under 4 MB.", 413);
    throw new AppError("Groq could not process this idea. Please try again with a shorter recording.", 502);
  }
  return await response.json() as T;
}
export function json(value: unknown, status = 200) { return Response.json(value, { status, headers: { "Cache-Control": "no-store" } }); }
export function failure(error: unknown) {
  const status = error instanceof AppError ? error.status : error instanceof z.ZodError ? 400 : 500;
  const message = error instanceof AppError ? error.message : error instanceof z.ZodError ? "Please check the idea or file you supplied." : "The request could not be completed. Please retry.";
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store", ...(status === 429 ? { "Retry-After": "60" } : {}) } });
}
