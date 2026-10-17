interface OllamaGenerateOptions {
  model?: string;
  temperature?: number;
  timeoutMs?: number;
}

const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "qwen3.5:4b";

export async function checkOllamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function generateWithOllama(
  prompt: string,
  options: OllamaGenerateOptions = {}
): Promise<string | null> {
  const model = options.model || DEFAULT_MODEL;
  const timeoutMs = options.timeoutMs || 4500;

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.3,
        },
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      console.warn(`Ollama responded with status ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data.response?.trim() || null;
  } catch (err) {
    console.warn("Ollama call skipped or timed out:", err instanceof Error ? err.message : err);
    return null;
  }
}
