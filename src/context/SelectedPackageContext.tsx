import React, { createContext, useContext, useState } from 'react'

type SelectedPackageContextValue = {
  selectedPackageId: string | null
  setSelectedPackage: (id: string | null) => void
}

const SelectedPackageContext = createContext<SelectedPackageContextValue | undefined>(undefined)

export function SelectedPackageProvider({ children }:{children:React.ReactNode}){
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(() => {
    try{
      return typeof window !== 'undefined' ? localStorage.getItem('selectedPackageId') : null
    }catch(e){
      return null
    }
  })

  const setSelectedPackage = (id: string | null) => {
    setSelectedPackageId(id)
    try{
      if (id) localStorage.setItem('selectedPackageId', id)
      else localStorage.removeItem('selectedPackageId')
    }catch(e){}
  }

  return (
    <SelectedPackageContext.Provider value={{ selectedPackageId, setSelectedPackage }}>
      {children}
    </SelectedPackageContext.Provider>
  )
}

export function useSelectedPackage(){
  const ctx = useContext(SelectedPackageContext)
  if (!ctx) throw new Error('useSelectedPackage must be used within SelectedPackageProvider')
  return ctx
}
