import { guard, json, failure } from "../../../lib/server.ts";
export const runtime = "nodejs";
export async function GET(request: Request) { try { guard(request, "connection"); return json({ configured: Boolean(process.env.GROQ_API_KEY?.trim()) }); } catch (error) { return failure(error); } }
