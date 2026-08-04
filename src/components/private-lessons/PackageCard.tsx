import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useSelectedPackage } from '@/context/SelectedPackageContext'
import { useNavigate } from '@tanstack/react-router'

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
}

export default function PackageCard({ pkg }:{pkg:Package}){
  const color = pkg.color || undefined
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { setSelectedPackage } = useSelectedPackage()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const illustration = useMemo(() => {
    const normalizedName = `${pkg.name} ${pkg.badge || ''}`.toLowerCase()

    if (normalizedName.includes('مميز') || normalizedName.includes('vip') || normalizedName.includes('premium') || normalizedName.includes('متقدم')) {
      return { emoji: '✨', title: 'خطة مميزة', accent: '#8b5cf6' }
    }

    if (normalizedName.includes('مبتد') || normalizedName.includes('أساس') || normalizedName.includes('starter')) {
      return { emoji: '📘', title: 'خطة تأسيس', accent: '#0ea5e9' }
    }

    if (normalizedName.includes('تدريب') || normalizedName.includes('تحضير') || normalizedName.includes('تخصص')) {
      return { emoji: '🎯', title: 'تدريب متعمق', accent: '#f59e0b' }
    }

    return { emoji: '🌟', title: 'خطة مرنة', accent: '#10b981' }
  }, [pkg.badge, pkg.name])

  const accentColor = color || illustration.accent

  const handleBook = async () => {
    if (loading || authLoading) return
    setError(null)
    setLoading(true)
    try{
      // Always save selection and navigate to confirmation page (do not force login here)
      try { localStorage.setItem('selectedPackageId', pkg.id) } catch (e) {}
      setSelectedPackage(pkg.id)
      navigate({ to: '/private-lessons/confirm', search: { packageId: pkg.id } })
    }catch(e:any){
      console.error('Booking button failed', e)
      setError(e?.message || 'حدث خطأ أثناء المتابعة')
    }finally{
      setLoading(false)
    }
  }

  return (
    <motion.article
      layout
      whileHover={{ scale: 1.02, y: -4 }}
      className="relative overflow-hidden rounded-[24px] border border-border/70 bg-white p-0 shadow-[0_12px_40px_rgba(15,23,42,0.08)] transition-all hover:shadow-[0_18px_50px_rgba(15,23,42,0.14)] dark:bg-gray-800"
    >
      <div
        className="relative h-40 overflow-hidden p-4"
        style={{
          background: `radial-gradient(circle at top left, ${accentColor}28 0%, transparent 45%), linear-gradient(135deg, ${accentColor}20 0%, rgba(255,255,255,0.95) 100%)`,
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.7),transparent_40%)]" />
        <svg viewBox="0 0 220 120" className="absolute inset-0 h-full w-full opacity-80" aria-hidden="true">
          <path d="M18 88C44 58 81 46 112 56C142 65 167 101 202 98" fill="none" stroke={accentColor} strokeWidth="6" strokeLinecap="round" />
          <circle cx="84" cy="44" r="18" fill={accentColor} fillOpacity="0.2" />
          <circle cx="165" cy="34" r="11" fill={accentColor} fillOpacity="0.18" />
          <path d="M32 38h30" stroke={accentColor} strokeWidth="6" strokeLinecap="round" />
          <path d="M44 24v28" stroke={accentColor} strokeWidth="6" strokeLinecap="round" />
        </svg>

        <div className="relative flex items-start justify-between">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-lg backdrop-blur" style={{ background: `linear-gradient(135deg, ${accentColor}, rgba(255,255,255,0.95))` }}>
            {illustration.emoji}
          </div>
          {pkg.badge && (
            <span className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ background: accentColor }}>
              {pkg.badge}
            </span>
          )}
        </div>

        <div className="relative mt-5 max-w-[70%] rounded-2xl border border-white/60 bg-white/70 p-3 shadow-sm backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">باقات الخصوصية</p>
          <p className="text-sm font-bold text-slate-800">{illustration.title}</p>
        </div>
      </div>

      <div className="flex h-full flex-col p-5">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{pkg.name}</h3>
          {pkg.short_description && <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-300">{pkg.short_description}</p>}
        </div>

        <div className="flex-1">
          <ul className="mb-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
            {pkg.features && pkg.features.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 text-[10px] text-primary">●</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pkg.price.toLocaleString()}</span>
              {pkg.old_price ? (
                <span className="text-sm text-gray-400 line-through">{pkg.old_price.toLocaleString()}</span>
              ) : null}
              {pkg.discount_percent ? (
                <span className="text-sm font-semibold text-green-600">-{pkg.discount_percent}%</span>
              ) : null}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {pkg.sessions_count ? `${pkg.sessions_count} حصة` : ''} {pkg.duration_minutes ? `• ${pkg.duration_minutes} دقيقة` : ''}
            </div>
          </div>

          <div className="flex flex-col items-end">
            {error && <div className="mb-2 text-sm text-destructive">{error}</div>}
            <button
              onClick={handleBook}
              aria-label={`احجز الآن ${pkg.name}`}
              disabled={loading || authLoading}
              className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2 font-medium text-white transition hover:bg-sky-700 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 active:scale-95"
            >
              {loading ? 'جاري...' : 'احجز الآن'}
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  )
}
