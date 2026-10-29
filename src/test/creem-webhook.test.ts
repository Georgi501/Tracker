import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  upsert: vi.fn(),
  select: vi.fn(),
  maybeSingle: vi.fn(),
  update: vi.fn(),
  rpc: vi.fn(),
  getCreemPlan: vi.fn((productId: string) =>
    productId === "prod_monthly" ? { productId, interval: "month" as const } : null,
  ),
}));

vi.mock("@/lib/creem.server", () => ({ getCreemPlan: mocks.getCreemPlan }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: mocks.from,
    rpc: mocks.rpc,
  },
}));

import { applyWebhook } from "@/routes/api/public/payments/webhook";

const userId = "9a7f8304-8cf5-4918-b9a6-53f0888212ec";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.upsert.mockResolvedValue({ error: null });
  mocks.maybeSingle.mockResolvedValue({
    data: { id: "subscription-row", user_id: userId },
    error: null,
  });
  mocks.rpc.mockResolvedValue({ error: null });
  mocks.select.mockReturnValue({
    eq: vi.fn().mockReturnThis(),
    maybeSingle: mocks.maybeSingle,
  });
  mocks.update.mockReturnValue({
    eq: vi.fn().mockReturnThis(),
  });
  mocks.from.mockReturnValue({
    upsert: mocks.upsert,
    select: mocks.select,
    update: mocks.update,
  });
});

it("creates a Pro subscription for a completed free-trial checkout without granting a referral reward", async () => {
  await applyWebhook(
    "checkout.completed",
    {
      status: "completed",
      order: { status: "pending" },
      product: { id: "prod_monthly" },
      customer: { id: "cust_123" },
      metadata: { user_id: userId },
      subscription: {
        id: "sub_123",
        status: "trialing",
        current_period_start_date: "2026-10-29T00:00:00.000Z",
        current_period_end_date: "2026-11-03T00:00:00.000Z",
      },
    },
    "prod",
  );

  expect(mocks.upsert).toHaveBeenCalledWith(
    expect.objectContaining({ user_id: userId, status: "trialing", interval: "month" }),
    { onConflict: "provider_subscription_id" },
  );
  expect(mocks.rpc).not.toHaveBeenCalled();
});

it("creates a Pro subscription from the subscription.trialing event", async () => {
  await applyWebhook(
    "subscription.trialing",
    {
      id: "sub_123",
      status: "trialing",
      product: "prod_monthly",
      customer: "cust_123",
      metadata: { user_id: userId },
      current_period_start_date: "2026-10-29T00:00:00.000Z",
      current_period_end_date: "2026-11-03T00:00:00.000Z",
    },
    "prod",
  );

  expect(mocks.upsert).toHaveBeenCalledWith(
    expect.objectContaining({ user_id: userId, status: "trialing" }),
    { onConflict: "provider_subscription_id" },
  );
  expect(mocks.rpc).not.toHaveBeenCalled();
});

it("grants referral rewards for a paid checkout", async () => {
  await applyWebhook(
    "checkout.completed",
    {
      status: "completed",
      order: { status: "paid" },
      product: { id: "prod_monthly" },
      customer: { id: "cust_123" },
      metadata: { user_id: userId },
      subscription: {
        id: "sub_123",
        status: "active",
        current_period_end_date: "2026-11-29T00:00:00.000Z",
      },
    },
    "prod",
  );

  expect(mocks.rpc).toHaveBeenCalledWith("grant_referral_reward", {
    _referred_user_id: userId,
  });
});

it("grants referral rewards only after a paid subscription event", async () => {
  await applyWebhook(
    "subscription.paid",
    {
      id: "sub_123",
      current_period_start_date: "2026-11-03T00:00:00.000Z",
      current_period_end_date: "2026-12-03T00:00:00.000Z",
    },
    "prod",
  );

  expect(mocks.rpc).toHaveBeenCalledWith("grant_referral_reward", {
    _referred_user_id: userId,
  });
});
