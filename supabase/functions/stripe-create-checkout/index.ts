// Creates a Stripe Checkout Session for one or more courses
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!stripeKey) {
      return jsonResponse({ error: "STRIPE_SECRET_KEY غير معرّف. أضفه من إعدادات Backend." }, 500);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userRes?.user) return jsonResponse({ error: "Invalid token" }, 401);

    const body = await req.json();
    const { courseIds, successUrl, cancelUrl, customerEmail } = body;

    if (!Array.isArray(courseIds) || courseIds.length === 0) {
      return jsonResponse({ error: "courseIds مطلوب" }, 400);
    }

    // Load courses with prices
    const { data: courses, error: cErr } = await supabaseAdmin
      .from("courses")
      .select("id, title, description, image_url, price, currency, is_free, stripe_price_id")
      .in("id", courseIds);

    if (cErr || !courses?.length) return jsonResponse({ error: "كورسات غير موجودة" }, 404);

    const paidCourses = courses.filter((c) => !c.is_free && Number(c.price) > 0);
    if (paidCourses.length === 0) {
      return jsonResponse({ error: "لا يوجد كورسات مدفوعة في الطلب" }, 400);
    }

    // Stripe requires a single currency per checkout session
    const currencies = Array.from(new Set(paidCourses.map((c) => (c.currency || "SAR").toLowerCase())));
    if (currencies.length > 1) {
      return jsonResponse({ error: "لا يمكن الدفع لكورسات بعملات مختلفة في نفس الطلب" }, 400);
    }
    const currency = currencies[0];

    const lineItems = paidCourses.map((c) => ({
      price_data: {
        currency,
        product_data: {
          name: c.title,
          description: c.description?.slice(0, 500) || undefined,
          images: c.image_url ? [c.image_url] : undefined,
          metadata: { course_id: c.id },
        },
        unit_amount: Math.round(Number(c.price) * 100),
      },
      quantity: 1,
    }));

    const origin = req.headers.get("origin") || Deno.env.get("PUBLIC_SITE_URL") || "http://localhost:5173";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: customerEmail,
      success_url: successUrl || `${origin}/profile?checkout=success`,
      cancel_url: cancelUrl || `${origin}/cart`,
      metadata: {
        user_id: userRes.user.id,
        course_ids: paidCourses.map((c) => c.id).join(","),
      },
      payment_intent_data: {
        metadata: {
          user_id: userRes.user.id,
          course_ids: paidCourses.map((c) => c.id).join(","),
        },
      },
      locale: "ar",
    });

    return jsonResponse({ url: session.url, sessionId: session.id });
  } catch (error: unknown) {
    console.error("stripe-create-checkout error:", getErrorMessage(error), error);
    return jsonResponse({ error: getErrorMessage(error) || "Internal error" }, 500);
  }
});
