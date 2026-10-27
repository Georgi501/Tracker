// Creates the Pro product and its two prices in Paddle (5-day trial, card required).
// Usage: node --env-file=.dev.vars scripts/paddle-setup.mjs sandbox|live
import { Environment, Paddle } from "@paddle/paddle-node-sdk";

const env = process.argv[2];
if (env !== "sandbox" && env !== "live") {
  console.error("Usage: node --env-file=.dev.vars scripts/paddle-setup.mjs sandbox|live");
  process.exit(1);
}
const key = process.env[env === "sandbox" ? "PADDLE_SANDBOX_API_KEY" : "PADDLE_LIVE_API_KEY"];
if (!key) {
  console.error("API key is not set in .dev.vars");
  process.exit(1);
}

const paddle = new Paddle(key, {
  environment: env === "sandbox" ? Environment.sandbox : Environment.production,
});

const existing = new Map();
for await (const price of paddle.prices.list({ perPage: 100 })) {
  const id = price.customData?.externalId;
  if (price.status === "active" && id) existing.set(id, price.id);
}

const plans = [
  { externalId: "pro_monthly", description: "Pro monthly", amount: "499", interval: "month" },
  { externalId: "pro_yearly", description: "Pro yearly", amount: "4999", interval: "year" },
];

let productId;
for (const plan of plans) {
  if (existing.has(plan.externalId)) {
    console.log(`${plan.externalId} already exists: ${existing.get(plan.externalId)}`);
    continue;
  }
  productId ??= (
    await paddle.products.create({
      name: "Capispot Pro",
      description: "Pro plan for Capispot portfolio tracker",
      taxCategory: "standard",
    })
  ).id;
  const price = await paddle.prices.create({
    productId,
    name: plan.description,
    description: plan.description,
    unitPrice: { amount: plan.amount, currencyCode: "EUR" },
    billingCycle: { interval: plan.interval, frequency: 1 },
    trialPeriod: { interval: "day", frequency: 5, requiresPaymentMethod: true },
    customData: { externalId: plan.externalId },
  });
  console.log(`${plan.externalId} created: ${price.id}`);
}
