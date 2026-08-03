import { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../../src/integrations/supabase/client'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')

  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ error: 'missing code' })

    const { data: coupon, error } = await supabase.from('coupons').select().eq('code', code).eq('active', true).limit(1).single()
    if (error || !coupon) return res.status(404).json({ valid: false, error: 'Coupon not found' })

    // check expiry
    const now = new Date()
    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
      return res.status(400).json({ valid: false, error: 'Coupon expired' })
    }

    if (coupon.times_used >= (coupon.usage_limit || 1)) {
      return res.status(400).json({ valid: false, error: 'Coupon usage limit reached' })
    }

    return res.status(200).json({ valid: true, coupon: { id: coupon.id, type: coupon.type, value: Number(coupon.value) } })
  } catch (err: any) {
    console.error('redeem-coupon error', err)
    return res.status(500).json({ error: err.message || String(err) })
  }
}
