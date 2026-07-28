import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const responseHeaders = {
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Content-Type": "application/json",
  },
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, responseHeaders);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, ...responseHeaders });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, ...responseHeaders });
    }

    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userRes.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, ...responseHeaders });
    }

    const { targetUserId } = await req.json();
    if (!targetUserId) {
      return new Response(JSON.stringify({ error: "targetUserId required" }), { status: 400, ...responseHeaders });
    }

    if (targetUserId === userRes.user.id) {
      return new Response(JSON.stringify({ error: "Cannot delete yourself" }), { status: 400, ...responseHeaders });
    }

    // Cascade deletes: enrollments → cart → roles → profile → auth.user
    await supabaseAdmin.from("enrollments").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("cart_items").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", targetUserId);
    await supabaseAdmin.from("profiles").delete().eq("user_id", targetUserId);

    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), { status: 500, ...responseHeaders });
    }

    return new Response(JSON.stringify({ success: true }), responseHeaders);
  } catch (error: unknown) {
    console.error("admin-delete-user error:", error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) || "Internal error" }), { status: 500, ...responseHeaders });
  }
});
