import { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../../src/integrations/supabase/client'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed')

  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ error: 'missing code' })

    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('id, code, is_active, expires_at, current_uses, max_uses, discount_type, discount_value')
      .eq('code', code)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (error || !coupon) return res.status(404).json({ valid: false, error: 'Coupon not found' })

    const now = new Date()
    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
      return res.status(400).json({ valid: false, error: 'Coupon expired' })
    }

    if ((coupon.current_uses || 0) >= (coupon.max_uses || 1)) {
      return res.status(400).json({ valid: false, error: 'Coupon usage limit reached' })
    }

    return res.status(200).json({
      valid: true,
      coupon: {
        id: coupon.id,
        type: coupon.discount_type,
        value: Number(coupon.discount_value),
      },
    })
  } catch (err: any) {
    console.error('redeem-coupon error', err)
    return res.status(500).json({ error: err.message || String(err) })
  }
}
