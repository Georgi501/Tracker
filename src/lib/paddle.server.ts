import { Environment, EventName, Paddle } from "@paddle/paddle-node-sdk";

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

export { EventName };
export type PaddleEnv = "sandbox" | "live";

export function getConnectionApiKey(env: PaddleEnv): string {
  return env === "sandbox" ? getEnv("PADDLE_SANDBOX_API_KEY") : getEnv("PADDLE_LIVE_API_KEY");
}

export function getPaddleClient(env: PaddleEnv): Paddle {
  const connectionApiKey = getConnectionApiKey(env);
  return new Paddle(connectionApiKey, {
    environment: env === "sandbox" ? Environment.sandbox : Environment.production,
  });
}

export async function verifyWebhook(req: Request, env: PaddleEnv) {
  const signature = req.headers.get("paddle-signature");
  const body = await req.text();
  const secret =
    env === "sandbox"
      ? getEnv("PAYMENTS_SANDBOX_WEBHOOK_SECRET")
      : getEnv("PAYMENTS_LIVE_WEBHOOK_SECRET");
  if (!signature || !body) throw new Error("Missing signature or body");
  return await getPaddleClient(env).webhooks.unmarshal(body, secret, signature);
}
