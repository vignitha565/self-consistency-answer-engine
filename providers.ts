export type ProviderName = "OpenAI" | "Claude" | "Gemini";

export type ProviderResult = {
  provider: ProviderName;
  model: string;
  answer?: string;
  error?: string;
  latencyMs: number;
};

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.7-flash";
const EVALUATOR_MODEL = process.env.EVALUATOR_MODEL || ANTHROPIC_MODEL;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function fetchJson(url: string, init: RequestInit, provider: string) {
  const response = await fetch(url, init);
  const text = await response.text();

  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "error" in data
        ? JSON.stringify((data as { error: unknown }).error)
        : text || `HTTP ${response.status}`;
    throw new Error(`${provider} API error: ${message}`);
  }

  return data;
}

export async function askOpenAI(prompt: string): Promise<string> {
  const apiKey = requireEnv("OPENAI_API_KEY");
  const data = (await fetchJson(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: prompt,
        max_output_tokens: 900,
      }),
    },
    "OpenAI"
  )) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };

  if (data.output_text?.trim()) return data.output_text.trim();

  const fallback = data.output
    ?.flatMap((item) => item.content || [])
    .filter((item) => item.type === "output_text" && item.text)
    .map((item) => item.text)
    .join("\n")
    .trim();

  if (!fallback) throw new Error("OpenAI returned no text output.");
  return fallback;
}

export async function askClaude(prompt: string, model = ANTHROPIC_MODEL): Promise<string> {
  const apiKey = requireEnv("ANTHROPIC_API_KEY");
  const data = (await fetchJson(
    "https://api.anthropic.com/v1/messages",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
    },
    "Anthropic"
  )) as {
    content?: Array<{ type?: string; text?: string }>;
  };

  const text = data.content
    ?.filter((block) => block.type === "text" && block.text)
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) throw new Error("Claude returned no text output.");
  return text;
}

export async function askGemini(prompt: string): Promise<string> {
  const apiKey = requireEnv("GEMINI_API_KEY");
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    GEMINI_MODEL
  )}:generateContent`;

  const data = (await fetchJson(
    endpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 900,
        },
      }),
    },
    "Gemini"
  )) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("\n")
    .trim();

  if (!text) throw new Error("Gemini returned no text output.");
  return text;
}

export async function synthesizeWithClaude(
  originalPrompt: string,
  candidates: Array<{ provider: ProviderName; answer: string }>
): Promise<string> {
  const formattedCandidates = candidates
    .map(
      (candidate, index) =>
        `<candidate index="${index + 1}" provider="${candidate.provider}">\n${candidate.answer}\n</candidate>`
    )
    .join("\n\n");

  const evaluatorPrompt = `
You are the final evaluator in a self-consistency answer engine.

<original_user_prompt>
${originalPrompt}
</original_user_prompt>

<candidate_answers>
${formattedCandidates}
</candidate_answers>

<instructions>
1. Compare the candidate answers for correctness, relevance, clarity, completeness, and internal consistency.
2. Resolve disagreements using your own reasoning. Do not automatically trust the majority.
3. Keep the strongest ideas from the candidates and discard weak, duplicated, unsupported, or contradictory material.
4. Produce a new synthesized answer to the original user prompt. Do not mention the candidate models or the evaluation process unless the user explicitly asks.
5. Be concise but complete. Preserve useful nuance when the question requires it.
</instructions>

Return only the final synthesized answer.`.trim();

  return askClaude(evaluatorPrompt, EVALUATOR_MODEL);
}

export const models = {
  openai: OPENAI_MODEL,
  anthropic: ANTHROPIC_MODEL,
  gemini: GEMINI_MODEL,
  evaluator: EVALUATOR_MODEL,
};
