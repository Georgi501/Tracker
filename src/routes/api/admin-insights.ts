import { createFileRoute } from "@tanstack/react-router";

const DAY = 86_400_000;
const EVENTS = [
  "pricing_view",
  "signup_completed",
  "signup_confirmed",
  "first_holding_added",
  "csv_demo_view",
  "csv_demo_import_click",
  "csv_import_started",
  "csv_import_completed",
  "checkout_started",
  "checkout_completed",
  "referral_link_copied",
] as const;

type CountResult = PromiseLike<{ count: number | null; error: unknown }>;
type LooseClient = {
  from: (table: string) => {
    select: (
      columns: string,
      options: { count: "exact"; head: true },
    ) => {
      gte: (column: string, value: string) => CountResult;
    };
  };
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export const Route = createFileRoute("/api/admin-insights")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { authenticateAdmin } = await import("@/integrations/supabase/admin-auth.server");
        const auth = await authenticateAdmin(request);
        if ("response" in auth) return auth.response;
        const db = auth.supabaseAdmin;

        const now = Date.now();
        const since = (days: number) => new Date(now - days * DAY).toISOString();
        const ahead = (days: number) => new Date(now + days * DAY).toISOString();

        // Aggregate counts only; a failed query yields null so one gap never hides the rest.
        const safe = async (run: () => PromiseLike<{ count: number | null; error: unknown }>) => {
          try {
            const { count, error } = await run();
            if (error) return null;
            return count ?? 0;
          } catch {
            return null;
          }
        };
        const loose = db as unknown as LooseClient;
        const countSince = (table: string, column: string, days: number) =>
          safe(() =>
            loose.from(table).select("*", { count: "exact", head: true }).gte(column, since(days)),
          );

        type VisitorStats = {
          unique_visitors: number;
          sessions: number;
          returning_visitors: number;
          avg_session_seconds: number | null;
          visitors_pricing: number;
          visitors_signup: number;
        };
        const visitorStats = async (days: number): Promise<VisitorStats | null> => {
          try {
            const { data, error } = await (
              db as unknown as {
                rpc: (
                  fn: string,
                  args: { _days: number },
                ) => PromiseLike<{ data: VisitorStats[] | null; error: unknown }>;
              }
            ).rpc("admin_visitor_stats", { _days: days });
            if (error || !data?.[0]) return null;
            const row = data[0];
            return {
              unique_visitors: Number(row.unique_visitors),
              sessions: Number(row.sessions),
              returning_visitors: Number(row.returning_visitors),
              avg_session_seconds:
                row.avg_session_seconds === null ? null : Number(row.avg_session_seconds),
              visitors_pricing: Number(row.visitors_pricing),
              visitors_signup: Number(row.visitors_signup),
            };
          } catch {
            return null;
          }
        };
        const [visits1, visits7, visits30] = await Promise.all([
          visitorStats(1),
          visitorStats(7),
          visitorStats(30),
        ]);

        const eventCounts = await Promise.all(
          EVENTS.map(async (name) => {
            const count = await safe(() =>
              db
                .from("analytics_events")
                .select("*", { count: "exact", head: true })
                .eq("event_name", name)
                .gte("created_at", since(30)),
            );
            return [name, count] as const;
          }),
        );

        const [
          signups7,
          signups30,
          advisor7,
          advisor30,
          companies7,
          companies30,
          journal,
          goals,
          activeSubs,
          trialing,
          canceling,
          expiring,
          canceled30,
          newSubs30,
          referralsPending,
          referralsRewarded,
        ] = await Promise.all([
          countSince("profiles", "created_at", 7),
          countSince("profiles", "created_at", 30),
          safe(() =>
            db
              .from("ai_messages")
              .select("*", { count: "exact", head: true })
              .eq("role", "user")
              .gte("created_at", since(7)),
          ),
          safe(() =>
            db
              .from("ai_messages")
              .select("*", { count: "exact", head: true })
              .eq("role", "user")
              .gte("created_at", since(30)),
          ),
          countSince("company_profile_weekly_views", "viewed_at", 7),
          countSince("company_profile_weekly_views", "viewed_at", 30),
          safe(() =>
            db
              .from("journal_notes")
              .select("*", { count: "exact", head: true })
              .gte("created_at", since(3650)),
          ),
          safe(() =>
            db
              .from("goals")
              .select("*", { count: "exact", head: true })
              .gte("created_at", since(3650)),
          ),
          safe(() =>
            db
              .from("subscriptions")
              .select("*", { count: "exact", head: true })
              .eq("status", "active"),
          ),
          safe(() =>
            db
              .from("subscriptions")
              .select("*", { count: "exact", head: true })
              .eq("status", "trialing"),
          ),
          safe(() =>
            db
              .from("subscriptions")
              .select("*", { count: "exact", head: true })
              .in("status", ["active", "trialing"])
              .eq("cancel_at_period_end", true),
          ),
          safe(() =>
            db
              .from("subscriptions")
              .select("*", { count: "exact", head: true })
              .in("status", ["active", "trialing"])
              .gte("current_period_end", new Date(now).toISOString())
              .lte("current_period_end", ahead(14)),
          ),
          safe(() =>
            db
              .from("subscriptions")
              .select("*", { count: "exact", head: true })
              .eq("status", "canceled")
              .gte("updated_at", since(30)),
          ),
          countSince("subscriptions", "created_at", 30),
          safe(() =>
            db
              .from("referrals")
              .select("*", { count: "exact", head: true })
              .eq("status", "pending"),
          ),
          safe(() =>
            db
              .from("referrals")
              .select("*", { count: "exact", head: true })
              .eq("status", "rewarded"),
          ),
        ]);

        // Distinct users with at least one transaction, scanned in capped pages.
        const PAGE = 1000;
        const MAX_PAGES = 20;
        const withTransactions = new Set<string>();
        let capped = false;
        let activationOk = true;
        for (let page = 0; page < MAX_PAGES; page += 1) {
          const { data, error } = await db
            .from("transactions")
            .select("user_id")
            .order("created_at", { ascending: true })
            .range(page * PAGE, page * PAGE + PAGE - 1);
          if (error) {
            activationOk = false;
            break;
          }
          for (const row of data ?? []) withTransactions.add(row.user_id);
          if ((data?.length ?? 0) < PAGE) break;
          if (page === MAX_PAGES - 1) capped = true;
        }

        const { data: feedback } = await db
          .from("feedback")
          .select("category, message, created_at")
          .order("created_at", { ascending: false })
          .limit(10);

        return json({
          generatedAt: new Date(now).toISOString(),
          growth: {
            signups7,
            signups30,
            usersWithTransactions: activationOk ? withTransactions.size : null,
            usersWithTransactionsCapped: capped,
          },
          visits: { visits1, visits7, visits30 },
          events30: Object.fromEntries(eventCounts),
          features: { advisor7, advisor30, companies7, companies30, journal, goals },
          revenue: { activeSubs, trialing, canceling, expiring, canceled30, newSubs30 },
          referrals: { pending: referralsPending, rewarded: referralsRewarded },
          feedback: feedback ?? [],
        });
      },
    },
  },
});
