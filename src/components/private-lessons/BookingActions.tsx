import React from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useNavigate } from '@tanstack/react-router'

type Props = {
  packageId: string
  notes: string
}

export default function BookingActions({ packageId, notes }: Props) {
  const [confirmed, setConfirmed] = React.useState(false)
  const navigate = useNavigate()

  const handleBack = () => navigate({ to: '/private-lessons' })
  const handleContinue = () => {
    if (!confirmed) return
    const url = `/private-lessons/checkout?packageId=${encodeURIComponent(packageId)}`
    navigate({ to: '/private-lessons/checkout', search: { packageId } })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(Boolean(v))} />
        <div className="text-sm">أؤكد أنني اطلعت على تفاصيل الباقة وأرغب في المتابعة.</div>
      </div>

      <div className="flex gap-3">
        <Button variant="ghost" onClick={handleBack} className="flex-1">رجوع</Button>
        <Button disabled={!confirmed} onClick={handleContinue} className="flex-1">متابعة</Button>
      </div>
    </div>
  )
}
