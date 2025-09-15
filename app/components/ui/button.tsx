import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/app/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[var(--primary-color)] text-white hover:bg-[var(--primary-color-hover)]",
        destructive:
          "bg-red-600 text-white hover:bg-red-700",
        outline:
          "border border-[var(--text-color)]/50 bg-white text-[var(--text-color)] hover:bg-gray-50",
        secondary:
          "bg-gray-100 text-[var(--text-color)] hover:bg-gray-200",
        ghost: "hover:bg-gray-100 text-[var(--text-color)]",
        link: "text-[var(--foreground-color)] underline-offset-4 hover:underline",
        // Metronic-inspired variants with dynamic theming
        primary: "bg-[var(--primary-color)] text-white hover:bg-[var(--primary-color-hover)] focus:ring-[var(--primary-color)]/20 shadow-sm",
        success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-sm",
        info: "bg-cyan-600 text-white hover:bg-cyan-700 focus:ring-cyan-500 shadow-sm",
        warning: "bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500 shadow-sm",
        danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm",
        light: "bg-white text-[var(--text-color)] hover:bg-gray-50 border border-[var(--text-color)]/50",
        dark: "bg-gray-900 text-white hover:bg-gray-800 shadow-sm",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-12 rounded-md px-10 text-base",
        icon: "h-10 w-10",
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