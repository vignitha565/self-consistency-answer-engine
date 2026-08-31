import { NextResponse } from "next/server";
import {
  askClaude,
  askGemini,
  askOpenAI,
  models,
  ProviderName,
  ProviderResult,
  synthesizeWithClaude,
} from "@/lib/providers";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PROMPT_LENGTH = 12000;

async function runProvider(
  provider: ProviderName,
  model: string,
  fn: () => Promise<string>
): Promise<ProviderResult> {
  const started = Date.now();
  try {
    const answer = await fn();
    return { provider, model, answer, latencyMs: Date.now() - started };
  } catch (error) {
    return {
      provider,
      model,
      error: error instanceof Error ? error.message : "Unknown provider error",
      latencyMs: Date.now() - started,
    };
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { prompt?: unknown };
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

    if (!prompt) {
      return NextResponse.json({ error: "Please enter a question or prompt." }, { status: 400 });
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: `Prompt is too long. Maximum length is ${MAX_PROMPT_LENGTH.toLocaleString()} characters.` },
        { status: 400 }
      );
    }

    const candidateResults = await Promise.all([
      runProvider("OpenAI", models.openai, () => askOpenAI(prompt)),
      runProvider("Claude", models.anthropic, () => askClaude(prompt)),
      runProvider("Gemini", models.gemini, () => askGemini(prompt)),
    ]);

    const successful = candidateResults.filter(
      (result): result is ProviderResult & { answer: string } => Boolean(result.answer)
    );

    if (successful.length < 2) {
      return NextResponse.json(
        {
          error: "At least two model responses are required before synthesis can run.",
          responses: candidateResults,
        },
        { status: 502 }
      );
    }

    const synthesisStarted = Date.now();
    let finalAnswer: string;

    try {
      finalAnswer = await synthesizeWithClaude(
        prompt,
        successful.map(({ provider, answer }) => ({ provider, answer }))
      );
    } catch (error) {
      return NextResponse.json(
        {
          error: `Candidate answers were generated, but final synthesis failed: ${
            error instanceof Error ? error.message : "Unknown evaluator error"
          }`,
          responses: candidateResults,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      prompt,
      responses: candidateResults,
      finalAnswer,
      evaluator: {
        provider: "Claude",
        model: models.evaluator,
        latencyMs: Date.now() - synthesisStarted,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 }
    );
  }
}
