"use client"

import React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  packageId: string
  packageTitle?: string
  packagePrice?: number | string
}

export default function BookingWizard({ open, onOpenChange, packageId, packageTitle, packagePrice }: Props) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const [step, setStep] = React.useState(1)
  const [subject, setSubject] = React.useState("")
  const [grade, setGrade] = React.useState("")
  const [teacher, setTeacher] = React.useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [couponCode, setCouponCode] = React.useState("")
  const [couponInfo, setCouponInfo] = React.useState<null | { id: string; type: string; value: number }>(null)
  const [applyingCoupon, setApplyingCoupon] = React.useState(false)

  React.useEffect(() => {
    if (!open) setStep(1)
  }, [open])

  const ensureAuthThenNext = () => {
    if (!isAuthenticated) {
      // redirect to login with the parameter expected by the login route
      const redirect = encodeURIComponent(window.location.pathname + window.location.search)
      window.location.assign(`/login?redirect=${redirect}`)
      return
    }
    setStep(2)
  }

  const handleCreateBooking = async () => {
    setLoading(true)
    try {
      // create booking row in supabase with pending status
      const { data: bookingRow, error: bErr } = await supabase.from('bookings').insert([{ package_id: packageId, user_id: user?.id, teacher_id: teacher, slot: selectedSlot, subject, grade, status: 'pending' }]).select().single()
      if (bErr) throw bErr

      // call server endpoint to create stripe checkout session
      const resp = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: bookingRow.id, packageId, amount: packagePrice || 0, currency: 'SAR', couponId: couponInfo?.id || null, successUrl: window.location.origin + '/payments/success', cancelUrl: window.location.origin + '/payments/cancel' }),
      })

      const json = await resp.json()
      if (json.url) {
        // redirect to Stripe Checkout
        window.location.href = json.url
      } else {
        throw new Error(json.error || 'no session url')
      }
    } catch (err: any) {
      console.error(err)
      alert('فشل البدء بعملية الدفع. حاول مرة أخرى.')
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تأكيد الحجز</DialogTitle>
          <DialogDescription>أكمل خطوات الحجز التالية</DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {step === 1 && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">الباقة: <strong>{packageTitle}</strong></div>
              <div className="text-sm text-muted-foreground">السعر: <strong>{packagePrice}</strong></div>
              <Button onClick={ensureAuthThenNext} variant="hero">المتابعة</Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <label className="text-sm font-medium">المادة</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="مثال: رياضيات" />
              <label className="text-sm font-medium">الصف</label>
              <Input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="مثال: الصف الأول" />
              <label className="text-sm font-medium">المعلم (اختياري)</label>
              <Input value={teacher ?? ""} onChange={(e) => setTeacher(e.target.value || null)} placeholder="معرّف المعلم أو اتركه لاختيار أفضل" />
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}>رجوع</Button>
                <Button onClick={() => setStep(3)}>اختيار موعد</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">اختر الموعد المتاح</div>
              {/* Placeholder list of slots; in next steps fetch from Supabase RPC */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  "2026-08-03T10:00:00Z",
                  "2026-08-03T12:00:00Z",
                  "2026-08-04T09:00:00Z",
                  "2026-08-04T15:00:00Z",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSlot(s)}
                    className={`rounded-md border px-3 py-2 text-sm ${selectedSlot === s ? "bg-primary text-white" : "bg-card"}`}
                  >
                    {new Date(s).toLocaleString()}
                  </button>
                ))}
              </div>
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(2)}>رجوع</Button>
                <Button onClick={() => setStep(4)} disabled={!selectedSlot}>متابعة للدفع</Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">طريقة الدفع (تجريبي الآن)</div>

              <div className="space-y-2">
                <label className="text-sm font-medium">كوبون خصم (إن وُجد)</label>
                <div className="flex gap-2">
                  <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="أدخل رمز الكوبون" />
                  <Button onClick={async () => {
                    if (!couponCode) return
                    setApplyingCoupon(true)
                    try {
                      const res = await fetch('/api/payments/redeem-coupon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: couponCode }) })
                      const j = await res.json()
                      if (res.ok && j.valid) {
                        setCouponInfo(j.coupon)
                      } else {
                        setCouponInfo(null)
                        alert(j.error || 'كود الكوبون غير صالح')
                      }
                    } catch (err) {
                      console.error(err)
                      alert('خطأ عند التحقق من الكوبون')
                    }
                    setApplyingCoupon(false)
                  }} disabled={applyingCoupon}>
                    تطبيق
                  </Button>
                </div>
                {couponInfo && (
                  <div className="text-sm text-muted-foreground">تم تطبيق الكوبون: {couponCode} — {couponInfo.type === 'percent' ? `${couponInfo.value}%` : `${couponInfo.value} ر.س`}</div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {/* compute discounted amount */}
                {(() => {
                  const base = Number(packagePrice || 0)
                  let final = base
                  if (couponInfo) {
                    if (couponInfo.type === 'percent') final = Math.max(0, Math.round((base * (1 - couponInfo.value / 100)) * 100) / 100)
                    else final = Math.max(0, Math.round((base - couponInfo.value) * 100) / 100)
                  }
                  return (
                    <div className="rounded-md border p-3">
                      <div className="text-sm text-muted-foreground">المبلغ النهائي</div>
                      <div className="text-2xl font-bold">{final} <span className="text-sm">ر.س</span></div>
                    </div>
                  )
                })()}

                <Button onClick={handleCreateBooking} disabled={loading}>{loading ? 'جارٍ التحويل...' : 'دفع بالبطاقة (تجريبي)'}</Button>
                <Button variant="outline" onClick={handleCreateBooking} disabled={loading}>Apple Pay / STC Pay (تجريبي)</Button>
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(3)}>رجوع</Button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4 text-center">
              <h3 className="text-lg font-bold">تم الحجز بنجاح</h3>
              <p className="text-sm text-muted-foreground">تم إنشاء طلب الحجز. سيتم إرسال التفاصيل إلى بريدك الإلكتروني.</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => { onOpenChange(false); window.location.href = "/profile" }}>الانتقال إلى لوحة الطالب</Button>
                <Button variant="ghost" onClick={() => { onOpenChange(false); window.location.href = "/my-courses" }}>عرض الحصص المحجوزة</Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter />
      </DialogContent>
    </Dialog>
  )
}
