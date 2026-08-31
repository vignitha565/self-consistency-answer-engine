# Architecture Notes

## Request lifecycle

`Browser -> POST /api/answer -> 3 parallel provider calls -> Claude evaluator -> JSON response -> Browser`

## Why orchestration happens on the server

The provider API keys are secrets. Calling providers directly from the browser would expose those keys to users. The Next.js API route acts as a backend-for-frontend and keeps credentials server-side.

## Candidate generation

The route starts all three calls at approximately the same time. This reduces total latency compared with calling them sequentially and gives independent model outputs for comparison.

## Synthesis

The final evaluator receives structured candidate blocks with provider labels plus the original prompt. The evaluator rubric emphasizes correctness, relevance, completeness, clarity, contradiction resolution, and generation of a fresh final answer.

## Failure policy

A single provider may fail without stopping the full workflow. The system synthesizes as long as at least two candidates succeed. If fewer than two candidates succeed, the server returns the individual provider errors so the UI can explain what happened.
