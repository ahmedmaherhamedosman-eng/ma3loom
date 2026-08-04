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
  phone: string;
  country: string;
  education_level: string;
  status: string;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

async function sendTeacherAcceptanceEmail(email: string, fullName: string) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || Deno.env.get("EMAIL_FROM") || "onboarding@ma3loom.com";
  const siteUrl = Deno.env.get("SITE_URL") || "https://ma3loom-ma3loom.vercel.app";

  if (!resendApiKey) {
    console.warn("RESEND_API_KEY is not configured; skipping acceptance email.");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [email],
      subject: "تم قبول طلبك كمعلم على منصة معلوم",
      html: `
        <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; color: #111827; line-height: 1.8;">
          <h2 style="color: #0f766e;">تم قبول طلبك بنجاح</h2>
          <p>مرحباً ${fullName || "المدرس"}،</p>
          <p>تمت مراجعة طلبك كمعلم على منصة معلوم والموافقة عليه بنجاح.</p>
          <p>يمكنك الآن تسجيل الدخول إلى حسابك وإكمال إعداد ملفك التعليمي والبدء في نشر المحتوى.</p>
          <p>
            <a href="${siteUrl}" style="display: inline-block; background: #0f766e; color: white; padding: 10px 16px; border-radius: 8px; text-decoration: none;">
              زيارة المنصة
            </a>
          </p>
          <p>نتمنى لك تجربة مميزة مع منصة معلوم.</p>
        </div>
      `,
      text: `مرحباً ${fullName || "المدرس"}،\nتمت مراجعة طلبك كمعلم على منصة معلوم والموافقة عليه بنجاح. يمكنك الآن تسجيل الدخول إلى حسابك وإكمال إعداد ملفك التعليمي.\n${siteUrl}`,
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`Failed to send acceptance email: ${response.status} ${bodyText}`);
  }
}

async function findUserIdByEmail(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;

  const found = (data?.users || []).find((u) => (u.email || "").toLowerCase() === email.toLowerCase());
  return found?.id || null;
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

        if (inviteError) {
          return new Response(JSON.stringify({ error: inviteError.message }), { status: 400, ...responseHeaders });
        }

        userId = invited?.user?.id || null;
      }

      if (!userId) {
        return new Response(JSON.stringify({ error: "Failed to create or fetch instructor account" }), {
          status: 500,
          ...responseHeaders,
        });
      }

      await supabaseAdmin.from("profiles").upsert({
        user_id: userId,
        full_name: application.full_name,
        phone: application.phone,
        country: application.country,
        user_type: "instructor",
      }, { onConflict: "user_id" });

      const { data: roleExists } = await supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .eq("role", "instructor")
        .maybeSingle();

      if (!roleExists) {
        await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: "instructor" });
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
        await sendTeacherAcceptanceEmail(application.email, application.full_name);
      } catch (emailError) {
        console.error("Teacher acceptance email could not be sent:", emailError);
      }

      await supabaseAdmin.from("user_notifications").insert({
        user_id: userId,
        title: "تم قبول طلبك كمعلم",
        message: "تمت مراجعة طلبك بنجاح. يمكنك الآن تسجيل الدخول والبدء في إعداد ملفك التعليمي.",
        link: "/profile",
      });

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
