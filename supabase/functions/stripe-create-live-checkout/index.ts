// Creates a Stripe Checkout Session for a paid live session booking
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userRes?.user) return jsonResponse({ error: "Invalid token" }, 401);

    const { sessionId, successUrl, cancelUrl, customerEmail } = await req.json();
    if (!sessionId) return jsonResponse({ error: "sessionId مطلوب" }, 400);

    // Load the live session
    const { data: liveSession, error: lsErr } = await supabaseAdmin
      .from("live_sessions")
      .select("id, title, description, image_url, price, currency, is_free, max_seats, bookings_count, scheduled_at, status")
      .eq("id", sessionId)
      .maybeSingle();

    if (lsErr || !liveSession) return jsonResponse({ error: "الحصة غير موجودة" }, 404);
    if (liveSession.is_free || Number(liveSession.price) <= 0) {
      return jsonResponse({ error: "هذه الحصة مجانية" }, 400);
    }
    if (liveSession.status === "completed" || liveSession.status === "cancelled") {
      return jsonResponse({ error: "الحصة غير متاحة للحجز" }, 400);
    }
    if (new Date(liveSession.scheduled_at).getTime() < Date.now()) {
      return jsonResponse({ error: "انتهى موعد الحصة" }, 400);
    }
    // Capacity check
    if (liveSession.max_seats !== null && Number(liveSession.bookings_count || 0) >= Number(liveSession.max_seats)) {
      return jsonResponse({ error: "المقاعد مكتملة" }, 400);
    }
    // Already booked?
    const { data: existingBooking } = await supabaseAdmin
      .from("live_session_bookings")
      .select("id")
      .eq("user_id", userRes.user.id)
      .eq("session_id", sessionId)
      .eq("status", "confirmed")
      .maybeSingle();
    if (existingBooking) {
      return jsonResponse({ error: "أنت محجوز بالفعل في هذه الحصة" }, 400);
    }

    const origin = req.headers.get("origin") || Deno.env.get("PUBLIC_SITE_URL") || "http://localhost:5173";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: (liveSession.currency || "SAR").toLowerCase(),
          product_data: {
            name: `🎥 ${liveSession.title}`,
            description: liveSession.description?.slice(0, 500) || "حصة مباشرة على معلوم",
            images: liveSession.image_url ? [liveSession.image_url] : undefined,
            metadata: { live_session_id: liveSession.id },
          },
          unit_amount: Math.round(Number(liveSession.price) * 100),
        },
        quantity: 1,
      }],
      customer_email: customerEmail,
      success_url: successUrl || `${origin}/live-classes?checkout=success`,
      cancel_url: cancelUrl || `${origin}/live-classes`,
      metadata: {
        user_id: userRes.user.id,
        live_session_id: liveSession.id,
        kind: "live_session",
      },
      payment_intent_data: {
        metadata: {
          user_id: userRes.user.id,
          live_session_id: liveSession.id,
          kind: "live_session",
        },
      },
      locale: "ar",
    });

    return jsonResponse({ url: session.url, sessionId: session.id });
  } catch (error: unknown) {
    console.error("stripe-create-live-checkout error:", getErrorMessage(error), error);
    return jsonResponse({ error: getErrorMessage(error) || "Internal error" }, 500);
  }
});
