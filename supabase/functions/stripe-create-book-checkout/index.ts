// Creates a Stripe Checkout Session for a single book purchase
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!stripeKey) return jsonResponse({ error: "STRIPE_SECRET_KEY غير معرّف" }, 500);
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userRes?.user) return jsonResponse({ error: "Invalid token" }, 401);

    const { bookId, successUrl, cancelUrl, customerEmail } = await req.json();
    if (!bookId) return jsonResponse({ error: "bookId مطلوب" }, 400);

    const { data: book, error: bErr } = await supabaseAdmin
      .from("books")
      .select("id, title, description, cover_url, price, currency, is_free")
      .eq("id", bookId)
      .maybeSingle();

    if (bErr || !book) return jsonResponse({ error: "الكتاب غير موجود" }, 404);
    if (book.is_free || Number(book.price) <= 0)
      return jsonResponse({ error: "هذا الكتاب مجاني" }, 400);

    // Already purchased?
    const { data: existing } = await supabaseAdmin
      .from("book_purchases")
      .select("id")
      .eq("user_id", userRes.user.id)
      .eq("book_id", bookId)
      .maybeSingle();
    if (existing) return jsonResponse({ error: "لقد اشتريت هذا الكتاب مسبقاً" }, 400);

    const currency = (book.currency || "SAR").toLowerCase();
    const origin = req.headers.get("origin") || "https://ma3loom.lovable.app";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency,
          product_data: {
            name: `📖 ${book.title}`,
            description: book.description?.slice(0, 500) || undefined,
            images: book.cover_url ? [book.cover_url] : undefined,
            metadata: { book_id: book.id },
          },
          unit_amount: Math.round(Number(book.price) * 100),
        },
        quantity: 1,
      }],
      customer_email: customerEmail,
      success_url: successUrl || `${origin}/books/${bookId}?purchase=success`,
      cancel_url: cancelUrl || `${origin}/books/${bookId}`,
      metadata: {
        kind: "book",
        user_id: userRes.user.id,
        book_id: bookId,
      },
      payment_intent_data: {
        metadata: {
          kind: "book",
          user_id: userRes.user.id,
          book_id: bookId,
        },
      },
      locale: "ar",
    });

    return jsonResponse({ url: session.url, sessionId: session.id });
  } catch (e: any) {
    console.error("stripe-create-book-checkout error:", e?.message, e);
    return jsonResponse({ error: e?.message || "Internal error" }, 500);
  }
});
