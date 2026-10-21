import { createOpenAI } from "@ai-sdk/openai";

export function getOpenAIModel() {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) return null;

  const model = process.env["OPENAI_MODEL"] || "gpt-5.4";
  return createOpenAI({ apiKey }).responses(model);
}
