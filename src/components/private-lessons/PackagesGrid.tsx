import React from 'react'
import PackageCard, { Package } from './PackageCard'

export default function PackagesGrid({ packages }:{packages:Package[]}){
  if (!packages || packages.length === 0) return null

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {packages.map((p, index) => (
        <div key={p.id} className={index === 1 ? 'xl:translate-y-3' : index === 2 ? 'xl:-translate-y-1' : ''}>
          <PackageCard pkg={p} />
        </div>
      ))}
    </div>
  )
}
