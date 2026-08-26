import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Check, Clock3, MessageCircle, Sparkles, Star, Users } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useSelectedPackage } from '@/context/SelectedPackageContext'
import { useNavigate } from '@tanstack/react-router'

const WHATSAPP_NUMBER = '201060990370'

export type Package = {
  id: string
  name: string
  badge?: string | null
  short_description?: string | null
  price: number
  old_price?: number | null
  discount_percent?: number | null
  sessions_count?: number | null
  duration_minutes?: number | null
  features?: string[] | null
  color?: string | null
  image_url?: string | null
  direct_booking?: boolean | null
}

export default function PackageCard({ pkg }:{pkg:Package}){
  const color = pkg.color || undefined
  const { isLoading: authLoading } = useAuth()
  const { setSelectedPackage } = useSelectedPackage()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const illustration = useMemo(() => {
    const normalizedName = `${pkg.name} ${pkg.badge || ''}`.toLowerCase()

    if (normalizedName.includes('مميز') || normalizedName.includes('vip') || normalizedName.includes('premium') || normalizedName.includes('متقدم')) {
      return { emoji: '✨', title: 'خطة مميزة', accent: '#8b5cf6', glow: 'from-violet-500 via-purple-500 to-indigo-600' }
    }

    if (normalizedName.includes('مبتد') || normalizedName.includes('أساس') || normalizedName.includes('starter')) {
      return { emoji: '📘', title: 'خطة تأسيس', accent: '#0ea5e9', glow: 'from-sky-500 via-cyan-500 to-blue-600' }
    }

    if (normalizedName.includes('تدريب') || normalizedName.includes('تحضير') || normalizedName.includes('تخصص')) {
      return { emoji: '🎯', title: 'تدريب متعمق', accent: '#f59e0b', glow: 'from-amber-400 via-orange-500 to-yellow-500' }
    }

    return { emoji: '🌟', title: 'خطة مرنة', accent: '#10b981', glow: 'from-emerald-500 via-green-500 to-teal-600' }
  }, [pkg.badge, pkg.name])

  const accentColor = color || illustration.accent
  const isFeatured = Boolean(pkg.badge) || Boolean(pkg.discount_percent && pkg.discount_percent >= 15) || Boolean(pkg.sessions_count && pkg.sessions_count >= 8)

  const handleBook = async () => {
    if (loading || authLoading) return
    setError(null)
    setLoading(true)
    try{
      try { localStorage.setItem('selectedPackageId', pkg.id) } catch (e) {}
      setSelectedPackage(pkg.id)
      navigate({ to: pkg.direct_booking ? '/private-lessons/checkout' : '/private-lessons/confirm', search: { packageId: pkg.id } })
    }catch(e:any){
      console.error('Booking button failed', e)
      setError(e?.message || 'حدث خطأ أثناء المتابعة')
    }finally{
      setLoading(false)
    }
  }

  const handleWhatsAppBooking = () => {
    const message = `أريد حجز باقة ${pkg.name} (${pkg.price.toLocaleString()} ر.س). أود الاستفسار عن التفاصيل والتأكيد على الموعد.`
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <motion.article
      layout
      whileHover={{ y: -8, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      className={`group relative overflow-hidden rounded-[26px] border bg-white p-0 shadow-[0_18px_50px_rgba(15,23,42,0.08)] transition-all duration-300 dark:bg-slate-900 ${isFeatured ? 'border-violet-200 ring-1 ring-violet-100 dark:border-violet-800 dark:ring-violet-900/50' : 'border-slate-200 dark:border-slate-700'}`}
    >
      <div className="absolute inset-x-0 top-0 h-28 opacity-90" style={{ background: `linear-gradient(135deg, ${accentColor}26 0%, rgba(255,255,255,0) 100%)` }} />

      <div className="relative p-5">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl shadow-md ring-2 ring-white/80"
              style={{ background: `linear-gradient(135deg, ${accentColor}, rgba(255,255,255,0.95))` }}
            >
              {illustration.emoji}
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-slate-500">PACKAGE</p>
              <h3 className="mt-1 text-lg font-black text-slate-900 dark:text-white">{pkg.name}</h3>
            </div>
          </div>

          {pkg.badge ? (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-white shadow-sm" style={{ background: accentColor }}>
              <Star size={12} fill="currentColor" />
              {pkg.badge}
            </span>
          ) : isFeatured ? (
            <span className="inline-flex items-center rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-white dark:bg-slate-100 dark:text-slate-900">
              شائع
            </span>
          ) : null}
        </div>

        {pkg.image_url ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <img src={pkg.image_url} alt={pkg.name} className="h-36 w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-100 via-white to-slate-50 p-3 dark:border-slate-700 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800">
            <div className="flex h-36 items-center justify-center rounded-xl text-4xl shadow-inner" style={{ background: `linear-gradient(135deg, ${accentColor}22, rgba(255,255,255,0.9))` }}>
              {illustration.emoji}
            </div>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/80">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-300">
            <span>{illustration.title}</span>
            <Sparkles size={12} style={{ color: accentColor }} />
          </div>
          {pkg.short_description ? (
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{pkg.short_description}</p>
          ) : (
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">حل متكامل لتطوير مهاراتك في جلسات مخصصة وفق خطتك.</p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-right">
          <div className="rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-300">
              <Users size={14} style={{ color: accentColor }} />
              <span className="text-[10px] font-semibold">جلسات</span>
            </div>
            <p className="mt-1 text-base font-black text-slate-900 dark:text-white">{pkg.sessions_count ?? 0}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-300">
              <Clock3 size={14} style={{ color: accentColor }} />
              <span className="text-[10px] font-semibold">مدة</span>
            </div>
            <p className="mt-1 text-base font-black text-slate-900 dark:text-white">{pkg.duration_minutes ?? 0} د</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-300">المزايا</p>
            {pkg.discount_percent ? (
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">خصم {pkg.discount_percent}%</span>
            ) : null}
          </div>

          <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-300">
            {(pkg.features && pkg.features.length > 0 ? pkg.features : ['جلسات مخصصة', 'تخطيط فردي', 'متابعة مستمرة']).slice(0, 3).map((feature, index) => (
              <li key={`${pkg.id}-${index}`} className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full shadow-sm" style={{ background: `${accentColor}22`, color: accentColor }}>
                  <Check size={12} strokeWidth={3} />
                </span>
                <span className="leading-6">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-4 dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-slate-500">السعر</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 dark:text-white">{pkg.price.toLocaleString()}</span>
                <span className="text-xs text-slate-500 dark:text-slate-300">ر.س</span>
              </div>
            </div>

            {pkg.old_price ? (
              <div className="text-left">
                <span className="block text-xs text-slate-400 line-through">{pkg.old_price.toLocaleString()} ر.س</span>
                <span className="mt-1 inline-flex rounded-full bg-red-50 px-2 py-1 text-[10px] font-bold text-red-600">سعر سابق</span>
              </div>
            ) : null}
          </div>
        </div>

        {error && <div className="mt-3 text-sm font-medium text-red-600">{error}</div>}

        <button
          onClick={handleBook}
          aria-label={`احجز الآن ${pkg.name}`}
          disabled={loading || authLoading}
          className="relative mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 text-base font-bold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98] dark:focus:ring-offset-slate-900"
        >
          <span>{loading ? 'جاري المعالجة...' : 'احجز الآن'}</span>
          <ArrowLeft size={16} />
        </button>

        <button
          type="button"
          onClick={handleWhatsAppBooking}
          aria-label={`الحجز عبر الواتساب ${pkg.name}`}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-500 bg-emerald-50 px-5 py-3 text-base font-bold text-emerald-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:border-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 dark:focus:ring-offset-slate-900"
        >
          <span>الحجز عبر الواتساب</span>
          <MessageCircle size={16} />
        </button>
      </div>
    </motion.article>
  )
}
