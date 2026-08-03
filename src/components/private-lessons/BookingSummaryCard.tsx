import React from 'react'
import type { PrivateLessonPackage } from '@/lib/private-lessons'
import { Label } from '@/components/ui/label'

type Props = {
  pkg: PrivateLessonPackage
}

export default function BookingSummaryCard({ pkg }: Props) {
  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-4">
      {pkg.badge && (
        <div className="inline-flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded">{pkg.badge}</span>
        </div>
      )}

      <h2 className="text-2xl font-bold">{pkg.name}</h2>
      {pkg.short_description && (
        <p className="text-sm text-muted-foreground mt-2">{pkg.short_description}</p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="text-muted-foreground">عدد الحصص</div>
        <div className="font-medium">{pkg.sessions_count}</div>
        <div className="text-muted-foreground">مدة الحصة</div>
        <div className="font-medium">{pkg.duration_minutes} دقيقة</div>
        <div className="text-muted-foreground">الخصم</div>
        <div className="font-medium">{pkg.discount_percent ? `${pkg.discount_percent}%` : '—'}</div>
      </div>

      <div className="mt-4">
        <div className="text-sm text-muted-foreground">السعر الحالي</div>
        <div className="flex items-baseline gap-3">
          <div className="text-3xl font-extrabold">{pkg.price} <span className="text-sm">ر.س</span></div>
          {pkg.old_price && <div className="text-sm text-muted-foreground line-through">{pkg.old_price} ر.س</div>}
        </div>
      </div>

      {Array.isArray(pkg.feature_list) && pkg.feature_list.length > 0 && (
        <div className="mt-4">
          <Label className="text-sm font-semibold mb-2">مميزات الباقة</Label>
          <ul className="space-y-2 mt-2">
            {pkg.feature_list.map((f) => (
              <li key={f} className="rounded-xl border border-border p-3 text-sm">✔ {f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
