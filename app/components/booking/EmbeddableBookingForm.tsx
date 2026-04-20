"use client"

import React from "react"
import { useBookingLayout } from "@/app/contexts/BookingLayoutContext"
import { SinglePageBookingFlow } from "./SinglePageBookingFlow"
import { MultiStepBookingFlow } from "./multistep/MultiStepBookingFlow"

export function EmbeddableBookingForm() {
  const { isMultiStep } = useBookingLayout()
  return isMultiStep ? <MultiStepBookingFlow /> : <SinglePageBookingFlow />
}
