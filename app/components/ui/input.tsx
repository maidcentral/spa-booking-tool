import * as React from "react"

import { cn } from "@/app/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          // Dynamic theming with CSS custom properties
          "bg-[var(--foreground-color)] border-[var(--text-color)]/50 text-[var(--text-color)] placeholder:text-[var(--text-color)]/50",
          "focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)]/20 transition-all duration-200",
          error && "border-red-400 focus:border-red-500 focus:ring-red-200",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }