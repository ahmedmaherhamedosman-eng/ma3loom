"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"

type BookingButtonProps = {
  pkgId: string
  title?: string
  price?: string | number
  children?: React.ReactNode
  directBooking?: boolean | null
}

export default function BookingButton({ pkgId, title, price, children, directBooking }: BookingButtonProps) {
  const { isAuthenticated } = useAuth()

  const handleClick = () => {
    const confirmPath = `/private-lessons/${directBooking ? 'checkout' : 'confirm'}?packageId=${encodeURIComponent(pkgId)}`
    // Always navigate to the confirmation page. Do not force login at button click.
    window.location.assign(confirmPath)
  }

  return (
    <Button onClick={handleClick} variant="hero" className="bg-[linear-gradient(135deg,#0F3DDE,#1E6DFF)] hover:shadow-[0_22px_48px_-14px_rgba(15,61,222,0.5)] text-white">
      {children ?? 'احجز الآن'}
    </Button>
  )
}
