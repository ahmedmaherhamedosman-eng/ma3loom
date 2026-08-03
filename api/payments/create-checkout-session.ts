import { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { supabase } from '../../src/integrations/supabase/client'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2022-11-15' })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')

  try {
    const { bookingId, packageId, amount, currency = 'SAR', couponId, successUrl, cancelUrl } = req.body

    if (amount == null || !successUrl || !cancelUrl) return res.status(400).json({ error: 'missing required params' })

    const baseAmount = Number(amount)
    let finalAmount = baseAmount

    // If coupon provided, validate and compute discounted amount server-side
    if (couponId) {
      const { data: coupon, error: cErr } = await supabase.from('coupons').select().eq('id', couponId).single()
      if (cErr || !coupon) return res.status(400).json({ error: 'invalid coupon' })

      if (!coupon.active) return res.status(400).json({ error: 'coupon inactive' })
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return res.status(400).json({ error: 'coupon expired' })
      if ((coupon.times_used || 0) >= (coupon.usage_limit || 1)) return res.status(400).json({ error: 'coupon usage limit reached' })

      if (coupon.type === 'percent') {
        finalAmount = Math.max(0, Math.round((baseAmount * (1 - Number(coupon.value) / 100)) * 100) / 100)
      } else {
        finalAmount = Math.max(0, Math.round((baseAmount - Number(coupon.value)) * 100) / 100)
      }
    }

    // Create a payments row (pending) with final amount
    const { data: paymentRow, error: pErr } = await supabase.from('payments').insert([
      { booking_id: bookingId || null, amount: finalAmount, original_amount: baseAmount, currency, coupon_id: couponId || null },
    ]).select().single()
    if (pErr) console.warn('payments insert warning', pErr)

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: (currency || 'SAR').toLowerCase(),
            product_data: {
              name: `حجز باقة ${packageId || ''}`,
            },
            unit_amount: Math.round(Number(finalAmount) * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl,
      metadata: {
        booking_id: bookingId || '',
        payment_id: paymentRow?.id || '',
        package_id: packageId || '',
        coupon_id: couponId || '',
      },
    })

    // update payments row with stripe session id
    if (paymentRow?.id) {
      await supabase.from('payments').update({ stripe_session_id: session.id }).eq('id', paymentRow.id)
    }

    return res.status(200).json({ url: session.url, id: session.id })
  } catch (err: any) {
    console.error('create-checkout-session error', err)
    return res.status(500).json({ error: err.message || String(err) })
  }
}
