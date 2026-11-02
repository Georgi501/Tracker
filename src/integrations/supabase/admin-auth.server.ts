/** Verifies a bearer token belongs to a site administrator. Server-only; never import from client code. */
export async function authenticateAdmin(request: Request) {
  const fail = (error: string, status: number) => ({
    response: Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } }),
  });
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return fail("Authentication required", 401);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: auth, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !auth.user) return fail("Invalid session", 401);

  const { data: admin, error: adminError } = await supabaseAdmin
    .from("site_admins")
    .select("user_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (adminError) {
    console.error("Unable to verify site administrator", adminError);
    return fail("Unable to verify access", 500);
  }
  if (!admin) return fail("Administrator access required", 403);
  return { supabaseAdmin, user: auth.user };
}
