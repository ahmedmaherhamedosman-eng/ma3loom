Payment integration setup (Stripe)

1. Install server dependencies:

```bash
npm install stripe
```

2. Add Vercel environment variables (Project Settings > Environment Variables):

- `STRIPE_SECRET_KEY` = your Stripe secret key (test mode: `sk_test_...`)
- `STRIPE_PUBLISHABLE_KEY` = your Stripe publishable key (test mode: `pk_test_...`)
- `STRIPE_WEBHOOK_SECRET` = your Stripe webhook signing secret (from webhook settings)

3. Endpoints added:

- `/api/payments/create-checkout-session` (POST): creates a Stripe Checkout Session. Body: `{ bookingId, packageId, amount, currency, couponId, successUrl, cancelUrl }`.
- `/api/payments/webhook` (POST): webhook receiver for Stripe events. Configure the webhook URL in Stripe to `https://<your-domain>/api/payments/webhook` and copy the signing secret to `STRIPE_WEBHOOK_SECRET`.

4. Flow:
- Client creates a booking row (pending) then calls `create-checkout-session` to get a Stripe Checkout URL and redirects the user there.
- Stripe performs payment; on success Stripe sends `checkout.session.completed` to the webhook which finalizes the booking and creates session rows in Supabase.

6. Coupons:
- A `coupons` table migration was added at `supabase/migrations/003_create_coupons_table.sql`.
- Server endpoint `/api/payments/redeem-coupon` validates coupon codes before checkout.
- Coupon usage is incremented only after successful payment in the webhook handler.

5. Apple Pay / Payment Request API / STC Pay:
- Stripe Checkout supports Apple Pay / Google Pay automatically where available. For Apple Pay on the web you must verify your domain in Stripe dashboard (add file to `/.well-known/apple-developer-merchantid-domain-association`).
- STC Pay typically requires a separate provider integration; we can add it later if you provide gateway details.
