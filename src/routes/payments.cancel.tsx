import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/payments/cancel')({ component: PaymentCancel })

function PaymentCancel() {
  useEffect(() => {}, [])
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-card rounded-2xl border border-border p-8 max-w-lg text-center">
        <h2 className="text-xl font-bold mb-4">تم إلغاء الدفع</h2>
        <p className="text-sm text-muted-foreground mb-6">لم يتم إتمام الدفعة. يمكنك المحاولة مرة أخرى لاحقًا.</p>
        <div className="flex justify-center gap-3">
          <Link to="/private-lessons"><button className="btn">العودة إلى الباقات</button></Link>
        </div>
      </div>
    </div>
  )
}
