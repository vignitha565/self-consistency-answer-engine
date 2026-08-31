# Self-Consistency Answer Engine

A UI-based GenAI application that sends the same user prompt to multiple AI providers, collects their independent answers, and then asks a final evaluator model to synthesize the strongest possible response.

## Live Demo

Add your deployed Vercel URL here after deployment:

`https://your-project.vercel.app`

## How It Works

1. The user enters a question in the web interface.
2. The server sends the same prompt to OpenAI, Anthropic Claude, and Google Gemini in parallel.
3. Each provider returns an independent candidate answer.
4. The application keeps successful responses and reports provider-specific failures without exposing API keys.
5. If at least two candidate answers succeed, Claude receives the original prompt plus the candidate answers.
6. Claude acts as the evaluator. It compares correctness, relevance, clarity, completeness, and consistency, resolves disagreements, and creates a new synthesized answer.
7. The UI displays the three candidate responses and the final synthesized answer.

This is an ensemble-style implementation of self-consistency. Instead of sampling one model multiple times, it increases answer diversity by using independent models from multiple providers before a final evaluation step.

## Project Type

UI-based web application built with:

- Next.js
- React
- TypeScript
- Server-side API route for orchestration

## Models and Providers

Default model names are configurable through environment variables.

| Role | Provider | Default model |
| --- | --- | --- |
| Candidate 1 | OpenAI | `gpt-5.6-luna` |
| Candidate 2 | Anthropic | `claude-sonnet-5` |
| Candidate 3 | Google Gemini | `gemini-3.7-flash` |
| Final evaluator | Anthropic | `claude-sonnet-5` |

If a provider changes or retires a model, update the corresponding environment variable without changing application code.

## Self-Consistency Flow

```text
                       ┌──────────────┐
                       │ User Prompt  │
                       └──────┬───────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
        ┌──────────┐     ┌──────────┐    ┌──────────┐
        │ OpenAI   │     │ Claude   │    │ Gemini   │
        └────┬─────┘     └────┬─────┘    └────┬─────┘
             │                │               │
             └───────────────┬┴───────────────┘
                             ▼
                    ┌──────────────────┐
                    │ Claude Evaluator │
                    │ Compare + Merge  │
                    └────────┬─────────┘
                             ▼
                    ┌──────────────────┐
                    │ Final Answer     │
                    └──────────────────┘
```

The candidate API calls are executed concurrently with `Promise.all`. The evaluator call does not start until candidate generation is complete.

## Error Handling

The project includes:

- Empty prompt validation
- Prompt length validation
- Missing environment variable errors
- Provider-specific API error handling
- Partial model failure handling
- Requirement for at least two successful candidates before synthesis
- Separate error handling for final evaluator failure
- Loading state and disabled form controls while generation is running

## Security

API keys are used only inside the Next.js server route. They are never included in browser-side JavaScript or exposed through `NEXT_PUBLIC_*` variables.

Do not commit `.env.local` to GitHub.

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/self-consistency-answer-engine.git
cd self-consistency-answer-engine
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create environment variables

Copy the example file:

```bash
cp .env.example .env.local
```

Then add your real API keys:

```env
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
GEMINI_API_KEY=...
```

Optional model overrides:

```env
OPENAI_MODEL=gpt-5.6-luna
ANTHROPIC_MODEL=claude-sonnet-5
GEMINI_MODEL=gemini-3.7-flash
EVALUATOR_MODEL=claude-sonnet-5
```

### 4. Start the development server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Deploy to Vercel

1. Push this project to a public GitHub repository.
2. Sign in to Vercel and import the GitHub repository.
3. Add these environment variables in Vercel Project Settings:
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `GEMINI_API_KEY`
4. Optionally add the model override variables.
5. Deploy.
6. Copy the generated Vercel URL into the **Live Demo** section of this README.

## Main Files

```text
app/
  api/answer/route.ts   # Orchestration endpoint
  globals.css           # UI styles
  layout.tsx            # App layout
  page.tsx              # Client UI
lib/
  providers.ts          # OpenAI, Claude, Gemini, evaluator calls
.env.example
README.md
```

## Why the Final Answer Is Not a Copy

The evaluator receives explicit instructions to compare all candidate responses, identify their strongest ideas, resolve contradictions, remove duplication, and write a new answer. It is specifically instructed not to select or repeat one candidate blindly.

## Possible Improvements

- Add streaming updates for each provider
- Add answer scoring and confidence metrics
- Save request history to a database
- Add authentication and rate limiting
- Add retry logic and timeouts
- Compare single-model self-consistency with multi-provider self-consistency
- Add cost and token usage reporting

## Submission Checklist

- [ ] Application runs locally
- [ ] OpenAI, Claude, and Gemini API keys configured
- [ ] All three candidate answers display correctly
- [ ] Final synthesized answer displays correctly
- [ ] Error states tested
- [ ] Public GitHub repository created
- [ ] Vercel deployment completed
- [ ] Live project URL added to README
- [ ] GitHub URL submitted
