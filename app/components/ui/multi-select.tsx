"use client"

import * as React from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { cn } from "@/app/lib/utils"
import { Badge } from "@/app/components/ui/badge"
import { Button } from "@/app/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover"

interface MultiSelectOption {
  label: string
  value: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
  isRequired?: boolean
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  className,
  isRequired = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value]
    onChange(newSelected)
  }

  const handleRemove = (value: string) => {
    onChange(selected.filter((item) => item !== value))
  }

  const selectedOptions = selected.map(value => 
    options.find(option => option.value === value)
  ).filter(Boolean) as MultiSelectOption[]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            // Match SelectTrigger styling exactly but allow height growth
            "flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            // Dynamic theming with CSS custom properties (same as Select)
            "bg-[var(--foreground-color)] border-[var(--text-color)]/50 text-[var(--text-color)]",
            "focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)]/20 transition-all duration-200",
            "min-h-[40px] h-auto py-2", // Auto height with minimum and consistent padding
            isRequired && "!bg-white !border-red-200 !text-gray-900",
            className
          )}
          style={isRequired ? {
            backgroundColor: '#ffffff',
            borderColor: '#fecaca',
            color: '#111827'
          } : undefined}
        >
          <div className="flex-1 flex gap-1 flex-wrap items-center justify-start">
            {selectedOptions.length > 0 ? (
              selectedOptions.map((option) => (
                <Badge
                  variant="secondary"
                  key={option.value}
                  className="h-6 text-xs flex items-center justify-center"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleRemove(option.value)
                  }}
                >
                  {option.label}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn(
        // Match SelectContent styling exactly
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border shadow-md",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        // Dynamic theming (same as Select)
        "bg-[var(--foreground-color)] border-[var(--text-color)]/50 text-[var(--text-color)] shadow-lg",
        "w-[var(--radix-popover-trigger-width)] p-0",
        isRequired && "!bg-white !border-gray-200 !text-gray-900"
      )}
      style={isRequired ? {
        backgroundColor: '#ffffff',
        borderColor: '#e5e7eb',
        color: '#111827'
      } : undefined}>
        <div className="p-1 max-h-60 overflow-auto">
          {options.map((option) => (
            <div
              key={option.value}
              className={cn(
                // Match SelectItem styling exactly
                "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none",
                "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                // Dynamic theming with CSS custom properties (same as Select)
                isRequired
                  ? "!text-gray-900 hover:!bg-gray-100 focus:!bg-gray-100 data-[highlighted]:!bg-gray-100"
                  : "text-[var(--text-color)] hover:bg-[var(--primary-color)]/20 focus:bg-[var(--primary-color)]/20",
                selected.includes(option.value) && (isRequired ? "!bg-gray-100" : "bg-[var(--primary-color)]/20")
              )}
              onClick={() => handleSelect(option.value)}
            >
              <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                {selected.includes(option.value) && (
                  <Check className="h-4 w-4 text-[var(--primary-color)]" />
                )}
              </span>
              <span className={cn(
                "flex-1",
                isRequired ? "!text-gray-900" : "text-[var(--text-color)]"
              )}>{option.label}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}