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
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  className,
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
          className={cn("w-full justify-between min-h-[40px]", className)}
        >
          <div className="flex gap-1 flex-wrap">
            {selectedOptions.length > 0 ? (
              selectedOptions.map((option) => (
                <Badge
                  variant="secondary"
                  key={option.value}
                  className="mr-1 mb-1"
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
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <div className="max-h-60 overflow-auto">
          {options.map((option) => (
            <div
              key={option.value}
              className={cn(
                "flex items-center space-x-2 p-2 hover:bg-accent hover:text-accent-foreground cursor-pointer",
                selected.includes(option.value) && "bg-accent"
              )}
              onClick={() => handleSelect(option.value)}
            >
              <div
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                  selected.includes(option.value)
                    ? "bg-primary text-primary-foreground"
                    : "opacity-50"
                )}
              >
                {selected.includes(option.value) && (
                  <Check className="h-3 w-3" />
                )}
              </div>
              <span className="flex-1">{option.label}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}