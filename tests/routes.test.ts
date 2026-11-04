import test from "node:test";
import assert from "node:assert/strict";
import { POST as analyze } from "../app/api/analyze/route.ts";
import { POST as transcribe } from "../app/api/transcribe/route.ts";
import { GET as connection } from "../app/api/connection/route.ts";
import { demoIdeas } from "../lib/demo.ts";

test("public routes use a server-only key, validate output, and expose no key", async () => {
  const previousKey = process.env.GROQ_API_KEY; const originalFetch = globalThis.fetch;
  const fakeKey = "gsk_test_fixture_not_a_real_credential"; process.env.GROQ_API_KEY = fakeKey;
  let calls = 0;
  try {
    globalThis.fetch = async (input, init) => {
      calls++; assert.match(String(input), /^https:\/\/api\.groq\.com\/openai\/v1\//);
      const headers = new Headers(init?.headers); assert.equal(headers.get("Authorization"), `Bearer ${fakeKey}`); assert.equal(headers.get("cookie"), null);
      if (String(input).endsWith("audio/transcriptions")) return Response.json({ text: "A small dinner helper", segments: [{ no_speech_prob: .01 }] });
      return Response.json({ choices: [{ message: { content: JSON.stringify(demoIdeas()[0].brief) } }] });
    };
    const status = await connection(new Request("http://localhost/api/connection")); assert.deepEqual(await status.json(), { configured: true });
    const request = new Request("http://localhost/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript: "A small dinner helper using existing ingredients." }) });
    const result = await analyze(request); assert.equal(result.status, 200); assert.equal(result.headers.get("cache-control"), "no-store"); const text = await result.text(); assert.ok(!text.includes(fakeKey)); assert.ok(JSON.parse(text).handoffPrompt);
    const audio = new FormData(); audio.append("file", new File([new Uint8Array(200)], "idea.wav", { type: "audio/wav" }));
    const recorded = await transcribe(new Request("http://localhost/api/transcribe", { method: "POST", body: audio })); assert.equal(recorded.status, 200); assert.deepEqual(await recorded.json(), { text: "A small dinner helper" }); assert.equal(calls, 2);
    const invalid = await analyze(new Request("http://localhost/api/analyze", { method: "POST", body: JSON.stringify({ transcript: "" }) })); assert.equal(invalid.status, 400); assert.equal(calls, 2);
    delete process.env.GROQ_API_KEY;
    const missing = await analyze(new Request("http://localhost/api/analyze", { method: "POST", body: JSON.stringify({ transcript: "An idea" }) })); assert.equal(missing.status, 503); assert.equal(calls, 2);
  } finally { globalThis.fetch = originalFetch; if (previousKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = previousKey; }
});
