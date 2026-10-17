interface GroqChatOptions {
  model?: string;
  temperature?: number;
  timeoutMs?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

const GROQ_API_KEY =
  process.env.GROQ_API || process.env.GRQO_API || process.env.GROQ_API_KEY || "";

const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export async function generateWithGroq(
  prompt: string,
  options: GroqChatOptions = {}
): Promise<string | null> {
  const apiKey = GROQ_API_KEY;
  if (!apiKey) {
    console.warn("GROQ_API key is not configured in .env.local");
    return null;
  }

  const model = options.model || DEFAULT_MODEL;
  const timeoutMs = options.timeoutMs || 4000;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: options.systemPrompt ||
              "You are an expert editorial intelligence curator for Echo newspaper. Pick the best matching headline.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 256,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) {
      console.warn(`Groq API responded with status ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.warn("Groq call skipped or timed out:", err instanceof Error ? err.message : err);
    return null;
  }
}
