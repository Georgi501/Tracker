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
