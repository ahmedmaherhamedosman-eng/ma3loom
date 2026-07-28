// Stripe webhook handler — verifies signature and provisions enrollments
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

type PaymentFailedObject = {
  metadata?: Record<string, string> | null;
  currency?: string | null;
  id?: string;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  if (!stripeKey || !webhookSecret) {
    console.error("Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    return new Response("Server not configured", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error("Webhook signature verification failed:", message);
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  try {
    console.log("Received Stripe event:", event.type, event.id);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const kind = session.metadata?.kind;
        if (kind === "live_session") {
          await handleLiveSessionCheckoutCompleted(session);
        } else if (kind === "book") {
          await handleBookCheckoutCompleted(session);
        } else {
          await handleCheckoutCompleted(session);
        }
        break;
      }
      case "checkout.session.async_payment_failed":
      case "payment_intent.payment_failed": {
        const obj = event.data.object as PaymentFailedObject;
        await handlePaymentFailed(obj);
        break;
      }
      default:
        console.log("Unhandled event:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook handler error:", getErrorMessage(error), error);
    return new Response("Webhook handler error", { status: 500 });
  }
});

async function handleLiveSessionCheckoutCompleted(session: Stripe.Checkout.Session) {
  const sessionId = session.id;
  const meta = session.metadata || {};
  const userId = meta.user_id;
  const liveSessionId = meta.live_session_id;

  if (!userId || !liveSessionId) {
    console.error("Missing user_id or live_session_id in session metadata", meta);
    return;
  }

  const { data: existing } = await supabaseAdmin
    .from("payments")
    .select("id")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  if (existing) {
    console.log("Live session payment already processed:", sessionId);
    return;
  }

  const totalCents = session.amount_total || 0;
  const amount = totalCents / 100;
  const currency = (session.currency || "usd").toUpperCase();
  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id || null;

  const { data: payRow, error: payErr } = await supabaseAdmin.from("payments").insert({
    user_id: userId,
    live_session_id: liveSessionId,
    course_id: null,
    amount,
    currency,
    status: "completed",
    payment_provider: "stripe",
    stripe_session_id: sessionId,
    stripe_payment_intent_id: paymentIntentId,
    provider_payment_id: paymentIntentId,
  }).select("id").single();
  if (payErr) {
    console.error("Live session payment insert error:", payErr);
    return;
  }

  const { error: bookingErr } = await supabaseAdmin
    .from("live_session_bookings")
    .insert({
      user_id: userId,
      session_id: liveSessionId,
      status: "confirmed",
      amount_paid: amount,
      payment_id: payRow?.id || null,
    });

  if (bookingErr) {
    console.error("Booking insert error after payment:", bookingErr.message);
    await supabaseAdmin.from("payments")
      .update({ status: "refund_pending" })
      .eq("id", payRow?.id);
    return;
  }
  console.log(`✅ Booked user ${userId} into live session ${liveSessionId}`);
}

async function handleBookCheckoutCompleted(session: Stripe.Checkout.Session) {
  const sessionId = session.id;
  const meta = session.metadata || {};
  const userId = meta.user_id;
  const bookId = meta.book_id;
  if (!userId || !bookId) {
    console.error("Missing user_id or book_id in book session metadata", meta);
    return;
  }

  const { data: existing } = await supabaseAdmin
    .from("payments")
    .select("id")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  if (existing) {
    console.log("Book payment already processed:", sessionId);
    return;
  }

  const totalCents = session.amount_total || 0;
  const amount = totalCents / 100;
  const currency = (session.currency || "sar").toUpperCase();
  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id || null;

  const { error: payErr } = await supabaseAdmin.from("payments").insert({
    user_id: userId,
    book_id: bookId,
    amount,
    currency,
    status: "completed",
    payment_provider: "stripe",
    stripe_session_id: sessionId,
    stripe_payment_intent_id: paymentIntentId,
    provider_payment_id: paymentIntentId,
  });
  if (payErr) console.error("Book payment insert error:", payErr);

  const { error: purchaseErr } = await supabaseAdmin.from("book_purchases").insert({
    user_id: userId,
    book_id: bookId,
    amount,
    currency,
    stripe_session_id: sessionId,
    stripe_payment_intent_id: paymentIntentId,
  });
  if (purchaseErr && !purchaseErr.message?.includes("duplicate")) {
    console.error("Book purchase insert error:", purchaseErr);
  }
  console.log(`✅ Granted book ${bookId} to user ${userId}`);
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const sessionId = session.id;
  const meta = session.metadata || {};
  const userId = meta.user_id;
  const courseIdsRaw = meta.course_ids || "";
  const courseIds = courseIdsRaw.split(",").map((s: string) => s.trim()).filter(Boolean);

  if (!userId || courseIds.length === 0) {
    console.error("Missing user_id or course_ids in session metadata", { userId, courseIds });
    return;
  }

  // Idempotency check
  const { data: existing } = await supabaseAdmin
    .from("payments")
    .select("id")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (existing) {
    console.log("Session already processed:", sessionId);
    return;
  }

  const totalCents = session.amount_total || 0;
  const currency = (session.currency || "usd").toUpperCase();
  const perCourseAmount = courseIds.length > 0 ? totalCents / 100 / courseIds.length : 0;
  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id || null;

  for (const courseId of courseIds) {
    // Insert enrollment
    const { error: enrollErr } = await supabaseAdmin
      .from("enrollments")
      .insert({ user_id: userId, course_id: courseId });
    if (enrollErr && !enrollErr.message?.includes("duplicate")) {
      console.error("Enrollment insert error:", enrollErr);
    }

    // Insert payment row
    const { error: payErr } = await supabaseAdmin.from("payments").insert({
      user_id: userId,
      course_id: courseId,
      amount: perCourseAmount,
      currency,
      status: "completed",
      payment_provider: "stripe",
      stripe_session_id: courseIds.length === 1 ? sessionId : `${sessionId}_${courseId}`,
      stripe_payment_intent_id: paymentIntentId,
      provider_payment_id: paymentIntentId,
    });
    if (payErr) console.error("Payment insert error:", payErr);

    // Bump students_count
    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("students_count")
      .eq("id", courseId)
      .maybeSingle();
    if (course) {
      await supabaseAdmin
        .from("courses")
        .update({ students_count: (course.students_count || 0) + 1 })
        .eq("id", courseId);
    }
  }

  // Clear cart for these courses
  await supabaseAdmin
    .from("cart_items")
    .delete()
    .eq("user_id", userId)
    .in("course_id", courseIds);

  console.log(`✅ Enrolled user ${userId} in ${courseIds.length} courses`);
}

async function handlePaymentFailed(obj: PaymentFailedObject) {
  const meta = obj.metadata || {};
  const userId = meta.user_id;
  const courseIdsRaw = meta.course_ids || "";
  const courseIds = courseIdsRaw.split(",").map((s: string) => s.trim()).filter(Boolean);
  if (!userId || courseIds.length === 0) return;

  for (const courseId of courseIds) {
    await supabaseAdmin.from("payments").insert({
      user_id: userId,
      course_id: courseId,
      amount: 0,
      currency: (obj.currency || "usd").toUpperCase(),
      status: "failed",
      payment_provider: "stripe",
      provider_payment_id: obj.id,
    });
  }
  console.log(`❌ Payment failed for user ${userId}`);
}
