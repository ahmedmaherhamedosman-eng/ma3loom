import React from 'react'
import PackageCard, { Package } from './PackageCard'

export default function PackagesGrid({ packages }:{packages:Package[]}){
  if (!packages || packages.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {packages.map(p => (
        <PackageCard key={p.id} pkg={p} />
      ))}
    </div>
  )
}
