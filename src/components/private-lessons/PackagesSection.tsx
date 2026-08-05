import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import PackagesGrid from './PackagesGrid'
import type { Package as PackageType } from './PackageCard'
import { Skeleton } from '@/components/ui/skeleton'

export default function PackagesSection(){
  const [packages, setPackages] = useState<PackageType[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPackages = useCallback(async ()=>{
    setLoading(true)
    setError(null)
    try{
      const { data, error } = await supabase
        .from('private_lesson_packages')
        .select('id,name,badge,short_description,price,old_price,discount_percent,sessions_count,duration_minutes,feature_list,color_key,image_url,is_active,sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error
      setPackages(Array.isArray(data) ? data.map((d:any)=>({
        id: d.id,
        name: d.name,
        badge: d.badge ?? null,
        short_description: d.short_description ?? null,
        price: d.price ?? 0,
        old_price: d.old_price ?? null,
        discount_percent: d.discount_percent ?? null,
        sessions_count: d.sessions_count ?? null,
        duration_minutes: d.duration_minutes ?? null,
        features: d.feature_list ?? d.features ?? null,
        color: d.color_key ?? d.color ?? null,
        image_url: d.image_url ?? null,
      })) : [])
    }catch(e:any){
      console.error('Failed to load packages', e)
      setError(e.message || 'حدث خطأ أثناء جلب الباقات')
      setPackages([])
    }finally{
      setLoading(false)
    }
  },[])

  useEffect(()=>{
    fetchPackages()

    // subscribe to real-time changes so admin edits reflect live
    let sub: any = null
    try{
      // supabase v2 channel-style
      // @ts-ignore
      if (supabase.channel) {
        // create a simple channel to listen to changes on packages
        // @ts-ignore
        sub = supabase.channel('public:packages')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'packages' }, () => {
            fetchPackages()
          })
          .subscribe()
      } else if (supabase.from) {
        // fallback to legacy realtime
        // @ts-ignore
        sub = supabase.from('packages').on('*', ()=> fetchPackages()).subscribe()
      }
    }catch(e){
      // ignore subscription errors - real-time is best-effort
      console.warn('Realtime subscription failed', e)
    }

    return ()=>{
      try{
        if (sub && sub.unsubscribe) sub.unsubscribe()
        // v2 channel unlisten
        // @ts-ignore
        if (sub && sub.remove) sub.remove()
      }catch(e){}
    }
  },[fetchPackages])


  return (
    <section className="py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-extrabold">اختر باقتك وابدأ رحلتك التعليمية</h2>
          <p className="mt-2 text-sm text-gray-600">اختر الباقة الأنسب لك من الباقات المتوفرة.</p>
        </div>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({length:4}).map((_,i)=>(
              <div key={i} className="rounded-xl p-6 bg-white dark:bg-gray-800">
                <Skeleton className="h-6 w-3/4 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-32 w-full mb-4" />
                <Skeleton className="h-10 w-32 mt-auto" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <p className="text-red-600 font-medium mb-4">{error}</p>
            <button onClick={fetchPackages} className="px-4 py-2 rounded-md bg-primary text-white">إعادة المحاولة</button>
          </div>
        )}

        {!loading && !error && packages && packages.length === 0 && (
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <p className="text-gray-600">لا توجد باقات متاحة حالياً.</p>
          </div>
        )}

        {!loading && !error && packages && packages.length > 0 && (
          <>
            <PackagesGrid packages={packages} />

            <div className="mt-10 rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-6 shadow-sm dark:border-emerald-800 dark:from-emerald-950/40 dark:to-green-950/40">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-foreground">حجز حصة من خلال التواصل على الواتساب</h3>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    إذا كنت تفضل حجز حصة مباشرة أو تريد الاستفسار عن الباقات يناسبك، تواصل معنا على الواتساب وسنساعدك في اختيار الموعد المناسب.
                  </p>
                </div>

                <a
                  href="https://wa.me/201060990370?text=أريد%20حجز%20حصة%20خصوصية%20في%20منصة%20معلوم"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700"
                >
                  تواصل عبر واتساب
                </a>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
