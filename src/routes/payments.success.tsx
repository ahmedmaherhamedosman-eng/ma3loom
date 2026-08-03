import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export const Route = createFileRoute('/payments/success')({ component: PaymentSuccess })

function PaymentSuccess() {
  const [message, setMessage] = useState('جاري تأكيد الدفع...')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')
    if (sessionId) {
      // optionally verify session server-side later; show success
      setMessage('تم الدفع بنجاح. جاري تأكيد الحجز...')
    } else {
      setMessage('تم الدفع. شكراً لك.')
    }
  }, [])

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-card rounded-2xl border border-border p-8 max-w-lg text-center">
        <h2 className="text-xl font-bold mb-4">تم الدفع بنجاح</h2>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        <div className="flex justify-center gap-3">
          <Link to="/profile"><button className="btn">لوحة الطالب</button></Link>
          <Link to="/my-courses"><button className="btn btn-ghost">عرض الحصص</button></Link>
        </div>
      </div>
    </div>
  )
}
