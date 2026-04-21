import type { QuestionData } from "@/app/services/api/booking-data"

/**
 * MaidCentral's QuestionStepType enum is serialized with the Description
 * attribute, so on the wire it arrives as one of these three strings (see
 * the backend enum definition). Any other value falls through to Step 2
 * (`duringPricing`) — unknown configs stay visible rather than disappear.
 */
export type WizardStep = "beforePricing" | "duringPricing" | "afterPricing"

export const STEP_INDEX: Record<WizardStep, number> = {
  beforePricing: 0, // Step 1 — About you
  duringPricing: 1, // Step 2 — Home & pricing
  afterPricing: 2, // Step 3 — Schedule & book
}

const STEP_TYPE_TO_STEP: Record<string, WizardStep> = {
  "Before Pricing": "beforePricing",
  "During Pricing": "duringPricing",
  "After Pricing": "afterPricing",
}

export function questionStepFor(question: QuestionData): WizardStep {
  return STEP_TYPE_TO_STEP[question.QuestionStepType] ?? "duringPricing"
}

export function filterQuestionsForStep(
  questions: QuestionData[],
  step: WizardStep
): QuestionData[] {
  return questions.filter(q => questionStepFor(q) === step)
}
