import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import type { PrivateLessonPackage } from '@/lib/private-lessons'
import BookingSummaryCard from '@/components/private-lessons/BookingSummaryCard'
import BookingTimeline from '@/components/private-lessons/BookingTimeline'
import BookingNotes from '@/components/private-lessons/BookingNotes'
import BookingActions from '@/components/private-lessons/BookingActions'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/private-lessons/confirm')({
  head: () => ({ meta: [{ title: 'تأكيد الحجز — معلوم' }] }),
  component: ConfirmBooking,
})

function ConfirmBooking() {
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  const packageId = params.get('packageId') || ''

  const [pkg, setPkg] = useState<PrivateLessonPackage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!packageId) {
      setError('لم يتم تمرير باقة صحيحة.')
      setLoading(false)
      return
    }

    let mounted = true
    ;(async () => {
      try {
        const { data, error: e } = await supabase
          .from('private_lesson_packages')
          .select('id,name,short_description,full_description,badge,price,old_price,sessions_count,duration_minutes,feature_list,discount_percent,color_key')
          .eq('id', packageId)
          .maybeSingle()

        if (e) throw e
        if (!data) {
          setError('لم يتم العثور على بيانات الباقة المطلوبة.')
        } else if (mounted) {
          setPkg(data as PrivateLessonPackage)
        }
      } catch (err: any) {
        setError(err?.message || 'حدث خطأ أثناء جلب بيانات الباقة.')
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [packageId])

  return (
    <div className="py-12 lg:py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border bg-card p-6">
          <h1 className="text-2xl font-extrabold mb-2">تأكيد الحجز</h1>
          <p className="text-sm text-muted-foreground mb-6">راجع تفاصيل الباقة قبل متابعة عملية الحجز.</p>

          {loading && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-40 w-full rounded-xl" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-40 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-md" />
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="py-8 text-center">
              <h2 className="text-xl font-semibold mb-2">تعذّر تحميل الباقة</h2>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <div className="flex justify-center">
                <a href="/private-lessons" className="inline-block px-4 py-2 rounded-md border">العودة إلى الباقات</a>
              </div>
            </div>
          )}

          {!loading && pkg && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <BookingSummaryCard pkg={pkg} />
                <div>
                  <BookingNotes value={notes} onChange={setNotes} />
                </div>
              </div>

              <div className="space-y-4">
                <BookingTimeline />
                <div className="rounded-2xl border border-border bg-card p-4">
                  <BookingActions packageId={pkg.id} notes={notes} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
