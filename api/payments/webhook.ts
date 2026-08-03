import { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { supabase } from '../../src/integrations/supabase/client'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2022-11-15' })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')

  const sig = req.headers['stripe-signature'] as string | undefined
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

  let event: Stripe.Event
  try {
    if (!sig || !webhookSecret) {
      // Fallback: try to parse raw body
      event = req.body as Stripe.Event
    } else {
      event = stripe.webhooks.constructEvent((req as any).rawBody || req.body, sig, webhookSecret)
    }
  } catch (err: any) {
    console.error('Webhook signature verification failed.', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const paymentStatus = session.payment_status
      const metadata = session.metadata || {}
      const paymentId = metadata['payment_id']
      const bookingId = metadata['booking_id']

      if (paymentStatus === 'paid') {
        // update payments row
        if (paymentId) await supabase.from('payments').update({ status: 'succeeded' }).eq('id', paymentId)

        // handle coupon usage increment if present
        const couponId = metadata['coupon_id']
        if (couponId) {
          try {
            const { data: coupon } = await supabase.from('coupons').select().eq('id', couponId).single()
            if (coupon) {
              const timesUsed = (coupon.times_used || 0) + 1
              const updates: any = { times_used: timesUsed }
              if (coupon.usage_limit && timesUsed >= coupon.usage_limit) updates.active = false
              await supabase.from('coupons').update(updates).eq('id', couponId)
            }
          } catch (e) {
            console.warn('Failed to increment coupon usage', e)
          }
        }

        // finalize booking: set status, create session row(s), deduct counts, notifications
        if (bookingId) {
          // mark booking as confirmed
          await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', bookingId)

          // create a single session for the booking (placeholder)
          const bookingRes = await supabase.from('bookings').select().eq('id', bookingId).single()
          const booking = bookingRes.data
          if (booking) {
            await supabase.from('sessions').insert([{ booking_id: bookingId, teacher_id: booking.teacher_id, student_id: booking.user_id, slot: booking.slot, duration_minutes: booking.duration_minutes || 60 }])
          }
        }
      }
    }

    return res.status(200).json({ received: true })
  } catch (err: any) {
    console.error('webhook handler error', err)
    return res.status(500).json({ error: err.message || String(err) })
  }
}
