import { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { supabase } from '../../src/integrations/supabase/client'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2022-11-15' })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')

  try {
    const { bookingId, packageId, amount, currency = 'SAR', couponId, successUrl, cancelUrl, userId } = req.body

    if (amount == null || !successUrl || !cancelUrl) return res.status(400).json({ error: 'missing required params' })

    const baseAmount = Number(amount)
    let finalAmount = baseAmount

    let couponPayload: { id: string; discount_type: string; discount_value: number } | null = null

    if (couponId) {
      const { data: coupon, error: cErr } = await supabase.from('coupons').select('id, discount_type, discount_value, current_uses, max_uses, expires_at, is_active').eq('id', couponId).single()
      if (cErr || !coupon) return res.status(400).json({ error: 'invalid coupon' })

      if (!coupon.is_active) return res.status(400).json({ error: 'coupon inactive' })
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return res.status(400).json({ error: 'coupon expired' })
      if ((coupon.current_uses || 0) >= (coupon.max_uses || 1)) return res.status(400).json({ error: 'coupon usage limit reached' })

      couponPayload = { id: coupon.id, discount_type: coupon.discount_type, discount_value: Number(coupon.discount_value) }

      if (coupon.discount_type === 'percent') {
        finalAmount = Math.max(0, Math.round((baseAmount * (1 - Number(coupon.discount_value) / 100)) * 100) / 100)
      } else {
        finalAmount = Math.max(0, Math.round((baseAmount - Number(coupon.discount_value)) * 100) / 100)
      }
    }

    const { data: paymentRow, error: pErr } = await supabase.from('payments').insert([
      {
        user_id: userId || '',
        amount: finalAmount,
        currency,
        coupon_id: couponId || null,
        course_id: packageId || null,
        status: 'pending',
      },
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

    if (paymentRow?.id) {
      await supabase.from('payments').update({ stripe_session_id: session.id }).eq('id', paymentRow.id)
    }

    return res.status(200).json({ url: session.url, id: session.id })
  } catch (err: any) {
    console.error('create-checkout-session error', err)
    return res.status(500).json({ error: err.message || String(err) })
  }
}
