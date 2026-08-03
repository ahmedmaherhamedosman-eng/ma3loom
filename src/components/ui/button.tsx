/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-bold tracking-[-0.01em] transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(135deg,#FF7A00,#FF9A2F)] text-white shadow-[0_14px_35px_-12px_rgba(255,122,0,0.35)] hover:-translate-y-0.5 hover:shadow-[0_18px_42px_-12px_rgba(255,122,0,0.4)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-primary/25 bg-white text-primary shadow-sm hover:-translate-y-0.5 hover:border-primary/40 hover:bg-[#EAF4FF] hover:text-primary hover:shadow-md",
        secondary:
          "bg-[#EAF4FF] text-[#0F3DDE] shadow-sm hover:-translate-y-0.5 hover:bg-[#DCEEFF] hover:shadow-md",
        ghost: "text-primary hover:bg-[#EAF4FF] hover:text-[#0F3DDE]",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-[linear-gradient(135deg,#0F3DDE,#1E6DFF)] text-white shadow-[0_18px_40px_-14px_rgba(15,61,222,0.35)] hover:-translate-y-0.5 hover:shadow-[0_22px_48px_-14px_rgba(15,61,222,0.4)] text-base font-bold",
        warm: "bg-[linear-gradient(135deg,#FF7A00,#FF9A2F)] text-white shadow-[0_14px_35px_-12px_rgba(255,122,0,0.35)] hover:-translate-y-0.5 hover:shadow-[0_18px_42px_-12px_rgba(255,122,0,0.4)] font-bold",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
