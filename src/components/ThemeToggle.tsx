"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Moon,
  SunMedium,
  Cloud,
  Sparkles,
  ChevronDown,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const themeOptions = [
  { id: "brand", label: "الافتراضي", icon: Sparkles, className: "" },
  { id: "dark", label: "ليلي", icon: Moon, className: "dark" },
  { id: "sky", label: "سماوي", icon: Cloud, className: "theme-sky" },
  { id: "sunrise", label: "غروب", icon: SunMedium, className: "theme-sunset" },
] as const

type ThemeOption = (typeof themeOptions)[number]

type ThemeId = ThemeOption["id"]

const STORAGE_KEY = "ma3loom-theme"

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeId>("brand")

  const currentTheme = useMemo(
    () => themeOptions.find((option) => option.id === theme) ?? themeOptions[0],
    [theme]
  )

  useEffect(() => {
    if (typeof window === "undefined") return
    const saved = window.localStorage.getItem(STORAGE_KEY) as ThemeId | null
    if (saved && themeOptions.some((option) => option.id === saved)) {
      setTheme(saved)
      return
    }

    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches
    setTheme(prefersDark ? "dark" : "brand")
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove("dark", "theme-sky", "theme-sunset")

    if (theme === "dark") {
      root.classList.add("dark")
    } else if (theme === "sky") {
      root.classList.add("theme-sky")
    } else if (theme === "sunrise") {
      root.classList.add("theme-sunset")
    }

    window.localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="min-w-[10rem] justify-between gap-2">
          <span className="flex items-center gap-2">
            <currentTheme.icon className="h-4 w-4" />
            {currentTheme.label}
          </span>
          <ChevronDown className="h-4 w-4 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48">
        {themeOptions.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => setTheme(option.id)}
            className={theme === option.id ? "bg-primary/10 text-primary" : ""}
          >
            <span className="flex items-center gap-2">
              <option.icon className="h-4 w-4" />
              {option.label}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
