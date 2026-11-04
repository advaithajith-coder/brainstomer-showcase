import { z } from "zod";
import { briefSchema, SYSTEM_PROMPT } from "../../../lib/idea.ts";
import { AppError, callGroq, configuredKey, failure, guard, json, jsonBody } from "../../../lib/server.ts";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    guard(request); const key = configuredKey();
    const input = z.object({ transcript: z.string().trim().min(3).max(20000), previousBrief: briefSchema.nullable().optional() }).parse(await jsonBody(request));
    const item = { type: "string" }; const score = { type: "integer" };
    const schema = { type: "object", additionalProperties: false, properties: { title: item, summary: item, category: { type: "string", enum: ["Software", "Business", "Creative", "Life", "Other"] }, improvements: { type: "array", items: item }, research: { type: "array", items: { type: "object", additionalProperties: false, properties: { query: item, why: item }, required: ["query", "why"] } }, firstStep: item, watchOut: item, handoffPrompt: item, scores: { type: "object", additionalProperties: false, properties: { clarity: score, feasibility: score, scope: score, startability: score }, required: ["clarity", "feasibility", "scope", "startability"] }, rankReason: item }, required: ["title", "summary", "category", "improvements", "research", "firstStep", "watchOut", "handoffPrompt", "scores", "rankReason"] };
    const output = await callGroq<{ choices?: { message?: { content?: string } }[] }>("chat/completions", key, { model: "openai/gpt-oss-120b", messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: JSON.stringify(input) }], reasoning_effort: "low", temperature: .35, max_completion_tokens: 3200, response_format: { type: "json_schema", json_schema: { name: "idea_launchpad", strict: true, schema } } });
    let parsed; try { parsed = briefSchema.safeParse(JSON.parse(output.choices?.[0]?.message?.content || "{}")); } catch { throw new AppError("The AI returned an incomplete starting point. Your idea is saved in your browser; retry from its page.", 502); }
    if (!parsed.success) throw new AppError("The AI returned an incomplete starting point. Your idea is saved in your browser; retry from its page.", 502);
    return json(parsed.data);
  } catch (error) { return failure(error); }
}
