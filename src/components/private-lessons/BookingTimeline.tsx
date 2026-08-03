import React from 'react'
import { Check } from 'lucide-react'

export default function BookingTimeline() {
  const steps = [
    'اختيار المادة الدراسية',
    'اختيار الصف الدراسي',
    'اختيار المعلم',
    'اختيار الموعد المناسب',
    'مراجعة البيانات',
    'إتمام الدفع',
    'تأكيد الحجز',
  ]

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h3 className="text-lg font-semibold mb-3">ما الذي سيحدث بعد المتابعة؟</h3>
      <ul className="space-y-2">
        {steps.map((s) => (
          <li key={s} className="flex items-start gap-3">
            <span className="mt-1 text-primary"><Check size={18} /></span>
            <span className="text-sm text-muted-foreground">{s}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
