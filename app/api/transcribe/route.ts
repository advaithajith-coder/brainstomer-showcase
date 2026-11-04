import { AppError, callGroq, configuredKey, failure, formBody, guard, json, MAX_AUDIO_BYTES } from "../../../lib/server.ts";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    guard(request); const key = configuredKey(); const form = await formBody(request); const file = form.get("file");
    if (!(file instanceof File) || file.size < 100 || file.size > MAX_AUDIO_BYTES) throw new AppError("Choose a clear audio recording under 4 MB.");
    if (!/\.(webm|mp3|mp4|m4a|mpeg|mpga|ogg|wav|flac)$/i.test(file.name)) throw new AppError("Use WebM, MP3, MP4, M4A, OGG, WAV, or FLAC audio.");
    const audio = new FormData(); audio.append("file", file); audio.append("model", "whisper-large-v3-turbo"); audio.append("response_format", "verbose_json"); audio.append("temperature", "0");
    const output = await callGroq<{ text?: string; segments?: { no_speech_prob?: number }[] }>("audio/transcriptions", key, audio);
    if (!output.text?.trim() || (output.segments?.length && output.segments.every(segment => (segment.no_speech_prob || 0) > .85))) throw new AppError("No clear speech was detected. Try a short recording closer to the microphone.");
    return json({ text: output.text.trim() });
  } catch (error) { return failure(error); }
}
