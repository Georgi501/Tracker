import { createOpenAI } from "@ai-sdk/openai";

export function getOpenAIModel() {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) return null;

  const model = process.env["OPENAI_MODEL"] || "gpt-5.4";
  const baseURL = process.env["OPENAI_BASE_URL"];
  // OpenAI-compatible providers (Gemini, Groq, OpenRouter) only support chat completions.
  if (baseURL) return createOpenAI({ apiKey, baseURL }).chat(model);
  return createOpenAI({ apiKey }).responses(model);
}

// Reasoning/store options are OpenAI-only; compatible providers reject them with HTTP 400.
export function getOpenAIProviderOptions() {
  if (process.env["OPENAI_BASE_URL"]) return {};
  return {
    openai: { reasoningEffort: "medium", reasoningSummary: "auto", store: false },
  };
}
