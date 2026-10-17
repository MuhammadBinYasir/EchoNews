interface GeminiOptions {
  model?: string;
  timeoutMs?: number;
  maxTokens?: number;
  systemPrompt?: string;
  jsonMode?: boolean;
  thinkingLevel?: "low" | "medium" | "high";
}

const DEFAULT_MODEL = "gemini-3.8-flash";

export async function generateWithGemini(
  prompt: string,
  options: GeminiOptions = {}
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.warn("Gemini API key is not configured (set GEMINI_API_KEY)");
    return null;
  }

  const model = options.model || DEFAULT_MODEL;
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          ...(options.systemPrompt
            ? { system_instruction: { parts: [{ text: options.systemPrompt }] } }
            : {}),
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: options.maxTokens ?? 256,
            ...(options.jsonMode ? { responseMimeType: "application/json" } : {}),
            ...(options.thinkingLevel
              ? { thinkingConfig: { thinkingLevel: options.thinkingLevel } }
              : {}),
          },
        }),
        signal: AbortSignal.timeout(options.timeoutMs ?? 8_000),
      }
    );

    if (!response.ok) {
      console.warn(`Gemini API responded with status ${response.status}`);
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text || "")
      .join("")
      .trim();
    return text || null;
  } catch (error) {
    console.warn("Gemini call failed or timed out:", error instanceof Error ? error.message : error);
    return null;
  }
}
