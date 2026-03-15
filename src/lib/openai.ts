// Lazy-initialized OpenAI client (same pattern as gjarn-app/resend.ts)
// Prevents build-time crash when OPENAI_API_KEY is not set

let _client: import("openai").default | null = null;

export function getOpenAIClient() {
  if (!_client) {
    // Dynamic import at runtime
    const OpenAI = require("openai").default;
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}
