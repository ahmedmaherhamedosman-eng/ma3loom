import React from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Props = {
  value: string
  onChange: (v: string) => void
}

export default function BookingNotes({ value, onChange }: Props) {
  return (
    <div>
      <Label className="text-sm font-semibold mb-2">ملاحظات للمعلم (اختياري)</Label>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder="أدخل أي تفاصيل أو طلبات تريد إخبار المعلم بها" />
    </div>
  )
}
