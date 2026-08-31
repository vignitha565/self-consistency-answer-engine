"use client";

import { FormEvent, useState } from "react";

type ProviderResponse = {
  provider: "OpenAI" | "Claude" | "Gemini";
  model: string;
  answer?: string;
  error?: string;
  latencyMs: number;
};

type ApiSuccess = {
  prompt: string;
  responses: ProviderResponse[];
  finalAnswer: string;
  evaluator: {
    provider: string;
    model: string;
    latencyMs: number;
  };
  generatedAt: string;
};

type ApiFailure = {
  error: string;
  responses?: ProviderResponse[];
};

const samplePrompts = [
  "Explain the difference between supervised and unsupervised learning with a practical example.",
  "What are the main security risks of storing API keys in frontend JavaScript?",
  "Give me a 5 step plan to learn prompt engineering as a beginner.",
];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<ApiSuccess | null>(null);
  const [partialResponses, setPartialResponses] = useState<ProviderResponse[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || loading) return;

    setLoading(true);
    setError("");
    setResult(null);
    setPartialResponses([]);

    try {
      const response = await fetch("/api/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: cleanPrompt }),
      });

      const data = (await response.json()) as ApiSuccess | ApiFailure;

      if (!response.ok || !("finalAnswer" in data)) {
        const failure = data as ApiFailure;
        setPartialResponses(failure.responses || []);
        throw new Error(failure.error || "Unable to generate an answer.");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="eyebrow">GENAI WITH JS 2026</div>
        <h1>Self-Consistency Answer Engine</h1>
        <p>
          Ask one question. Three AI models answer independently. A final evaluator compares their
          reasoning and synthesizes a stronger response.
        </p>
      </section>

      <section className="panel input-panel">
        <form onSubmit={handleSubmit}>
          <label htmlFor="prompt">Your question or prompt</label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Example: Explain zero trust security to a non-technical manager."
            rows={7}
            maxLength={12000}
            disabled={loading}
          />
          <div className="form-footer">
            <span>{prompt.length.toLocaleString()} / 12,000</span>
            <button type="submit" disabled={!prompt.trim() || loading}>
              {loading ? "Comparing models..." : "Generate consistent answer"}
            </button>
          </div>
        </form>

        <div className="samples" aria-label="Sample prompts">
          {samplePrompts.map((sample) => (
            <button key={sample} type="button" onClick={() => setPrompt(sample)} disabled={loading}>
              {sample}
            </button>
          ))}
        </div>
      </section>

      {loading && (
        <section className="status panel" aria-live="polite">
          <div className="spinner" />
          <div>
            <strong>Generating independent answers</strong>
            <p>OpenAI, Claude, and Gemini are running in parallel. Claude will synthesize next.</p>
          </div>
        </section>
      )}

      {error && (
        <section className="error-box" role="alert">
          <strong>Request failed</strong>
          <p>{error}</p>
        </section>
      )}

      {(result?.responses || partialResponses).length > 0 && (
        <section className="results-section">
          <div className="section-heading">
            <span>Step 1</span>
            <h2>Independent model responses</h2>
          </div>
          <div className="response-grid">
            {(result?.responses || partialResponses).map((response) => (
              <article className="model-card" key={response.provider}>
                <div className="model-card-header">
                  <div>
                    <h3>{response.provider}</h3>
                    <span>{response.model}</span>
                  </div>
                  <span className={response.error ? "badge failed" : "badge success"}>
                    {response.error ? "Failed" : `${(response.latencyMs / 1000).toFixed(1)}s`}
                  </span>
                </div>
                {response.answer ? (
                  <p className="answer-text">{response.answer}</p>
                ) : (
                  <p className="provider-error">{response.error}</p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {result && (
        <section className="final-section panel">
          <div className="section-heading final-heading">
            <span>Step 2</span>
            <h2>Final synthesized answer</h2>
          </div>
          <p className="final-answer">{result.finalAnswer}</p>
          <div className="evaluator-meta">
            Evaluated by {result.evaluator.provider} · {result.evaluator.model} · {(
              result.evaluator.latencyMs / 1000
            ).toFixed(1)}s
          </div>
        </section>
      )}

      <footer>
        Candidate generation runs concurrently. API keys remain server-side and are never sent to the
        browser.
      </footer>
    </main>
  );
}
