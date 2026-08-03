import React, { useState } from 'react'
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

  const handleBook = async () => {
    if (loading || authLoading) return
    setError(null)
    setLoading(true)
    try{
      // If not authenticated, redirect to login and include redirect to confirm with packageId
      if (!isAuthenticated) {
        try{ localStorage.setItem('selectedPackageId', pkg.id) }catch(e){}
        const redirect = `/private-lessons/confirm?packageId=${encodeURIComponent(pkg.id)}`
        navigate({ to: '/login', search: { redirect } })
        return
      }

      // authenticated: save in app state and navigate to confirm
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
      whileHover={{ scale: 1.02 }}
      className={`relative rounded-xl p-6 shadow-md transition-transform transform hover:shadow-2xl bg-white dark:bg-gray-800`}
    >
      {pkg.badge && (
        <div className="absolute -top-3 left-6">
          <span className="inline-block px-3 py-1 text-xs font-semibold text-white rounded-full" style={{background: pkg.color || '#7c3aed'}}>
            {pkg.badge}
          </span>
        </div>
      )}

      <div className="flex flex-col h-full">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{pkg.name}</h3>
          {pkg.short_description && <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">{pkg.short_description}</p>}
        </div>

        <div className="flex-1">
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 mb-4">
            {pkg.features && pkg.features.map((f,i)=>(
              <li key={i} className="flex items-start">
                <span className="mr-2 text-primary-500">●</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 flex items-end justify-between">
          <div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pkg.price.toLocaleString()}</span>
              {pkg.old_price ? (
                <span className="text-sm line-through text-gray-400">{pkg.old_price.toLocaleString()}</span>
              ) : null}
              {pkg.discount_percent ? (
                <span className="text-sm text-green-600">-{pkg.discount_percent}%</span>
              ) : null}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {pkg.sessions_count ? `${pkg.sessions_count} حصة` : ''} {pkg.duration_minutes ? `• ${pkg.duration_minutes} دقيقة` : ''}
            </div>
          </div>

          <div className="flex flex-col items-end">
            {error && <div className="text-sm text-destructive mb-2">{error}</div>}
            <button
              onClick={handleBook}
              aria-label={`احجز الآن ${pkg.name}`}
              disabled={loading || authLoading}
              className="ml-4 inline-flex items-center justify-center px-4 py-2 rounded-md bg-sky-600 text-white font-medium hover:bg-sky-700 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed transition-transform active:scale-95"
            >
              {loading ? 'جاري...' : 'احجز الآن'}
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  )
}
