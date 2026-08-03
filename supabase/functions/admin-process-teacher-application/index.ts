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
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type TeacherApplication = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  country: string | null;
  education_level: string | null;
  status: string;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

async function findUserIdByEmail(email: string) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) return null;

    const found = (data?.users || []).find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
    return found?.id || null;
  } catch {
    return null;
  }
}

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

    const { applicationId, action, decisionReason, reviewNotes } = await req.json();
    if (!applicationId || !action) {
      return new Response(JSON.stringify({ error: "applicationId and action are required" }), { status: 400, ...responseHeaders });
    }

    const { data: appData, error: appError } = await supabaseAdmin
      .from("teacher_applications")
      .select("id, email, full_name, phone, country, education_level, status")
      .eq("id", applicationId)
      .maybeSingle();

    if (appError) {
      return new Response(JSON.stringify({ error: appError.message }), { status: 400, ...responseHeaders });
    }
    if (!appData) {
      return new Response(JSON.stringify({ error: "Application not found" }), { status: 404, ...responseHeaders });
    }

    const application = appData as TeacherApplication;

    if (action === "approve") {
      let userId = await findUserIdByEmail(application.email);

      if (!userId) {
        const { data: invited, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
          application.email,
          {
            data: {
              full_name: application.full_name,
              source: "teacher_application",
            },
          },
        );

        if (!inviteError) {
          userId = invited?.user?.id || null;
        }
      }

      if (!userId) {
        userId = userRes.user.id;
      }

      try {
        await supabaseAdmin.from("profiles").upsert({
          user_id: userId,
          full_name: application.full_name,
          phone: application.phone || null,
          country: application.country || null,
          user_type: "instructor",
        }, { onConflict: "user_id" });
      } catch {
        // ignore profile upsert errors and continue with approval flow
      }

      try {
        const { data: roleExists } = await supabaseAdmin
          .from("user_roles")
          .select("id")
          .eq("user_id", userId)
          .eq("role", "instructor")
          .maybeSingle();

        if (!roleExists) {
          await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "instructor" });
        }
      } catch {
        // ignore role assignment errors and continue
      }

      const { error: updateErr } = await supabaseAdmin
        .from("teacher_applications")
        .update({
          status: "accepted",
          instructor_user_id: userId,
          approved_by: userRes.user.id,
          approved_at: new Date().toISOString(),
          decision_reason: decisionReason || null,
          review_notes: reviewNotes || null,
        })
        .eq("id", applicationId);

      if (updateErr) {
        return new Response(JSON.stringify({ error: updateErr.message }), { status: 400, ...responseHeaders });
      }

      try {
        await supabaseAdmin.from("user_notifications").insert({
          user_id: userId,
          title: "تم قبول طلبك كمعلم",
          message: "تمت مراجعة طلبك بنجاح. يمكنك الآن تسجيل الدخول والبدء في إعداد ملفك التعليمي.",
          link: "/profile",
        });
      } catch {
        // ignore notification errors
      }

      return new Response(JSON.stringify({ success: true, status: "accepted", userId }), responseHeaders);
    }

    if (action === "reject") {
      const { error: rejectErr } = await supabaseAdmin
        .from("teacher_applications")
        .update({
          status: "rejected",
          decision_reason: decisionReason || null,
          review_notes: reviewNotes || null,
          approved_by: userRes.user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", applicationId);

      if (rejectErr) {
        return new Response(JSON.stringify({ error: rejectErr.message }), { status: 400, ...responseHeaders });
      }

      return new Response(JSON.stringify({ success: true, status: "rejected" }), responseHeaders);
    }

    if (action === "request_changes") {
      const { error: changesErr } = await supabaseAdmin
        .from("teacher_applications")
        .update({
          status: "needs_changes",
          review_notes: reviewNotes || "يرجى مراجعة الملاحظات وإعادة إرسال الطلب.",
          decision_reason: decisionReason || null,
          approved_by: userRes.user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", applicationId);

      if (changesErr) {
        return new Response(JSON.stringify({ error: changesErr.message }), { status: 400, ...responseHeaders });
      }

      return new Response(JSON.stringify({ success: true, status: "needs_changes" }), responseHeaders);
    }

    return new Response(JSON.stringify({ error: "Unsupported action" }), { status: 400, ...responseHeaders });
  } catch (error: unknown) {
    console.error("admin-process-teacher-application error:", error);
    return new Response(JSON.stringify({ error: getErrorMessage(error) || "Internal error" }), {
      status: 500,
      ...responseHeaders,
    });
  }
});
