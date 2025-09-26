/**
 * Question form validation utilities
 * Provides validation logic for different question types and error handling
 */

import type { QuestionData } from "@/app/services/api/booking-data";

export interface QuestionValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate a single question answer
 */
export function validateQuestionAnswer(
  question: QuestionData,
  answer: string | undefined
): QuestionValidationResult {
  // Required questions must have an answer
  if (question.IsRequired && (!answer || answer.trim() === "")) {
    return {
      isValid: false,
      error: "This field is required"
    };
  }

  // If no answer provided for optional question, it's valid
  if (!answer || answer.trim() === "") {
    return { isValid: true };
  }

  // Validate based on question type
  switch (question.QuestionType) {
    case "Whole Number":
      return validateWholeNumber(answer);

    case "Decimal":
      return validateDecimal(answer);

    case "Select List":
    case "Multiple Select List":
      return validateSelectOption(question, answer);

    case "Rich Text":
      return validateRichText(answer);

    default:
      // For text and phone fields, basic validation
      if (question.QuestionText.toLowerCase().includes("phone")) {
        return validatePhone(answer);
      }
      return validateText(answer);
  }
}

/**
 * Validate all questions in a form
 */
export function validateAllQuestions(
  questions: QuestionData[],
  questionAnswers: Record<number, string>
): Record<number, string> {
  const errors: Record<number, string> = {};

  questions.forEach(question => {
    const answer = questionAnswers[question.QuestionId];
    const result = validateQuestionAnswer(question, answer);

    if (!result.isValid && result.error) {
      errors[question.QuestionId] = result.error;
    }
  });

  return errors;
}

/**
 * Check if all required questions are answered
 */
export function areRequiredQuestionsAnswered(
  questions: QuestionData[],
  questionAnswers: Record<number, string>
): boolean {
  const requiredQuestions = questions.filter(q => q.IsRequired);

  return requiredQuestions.every(question => {
    const answer = questionAnswers[question.QuestionId];
    return answer && answer.toString().trim() !== "";
  });
}

// Specific validation functions

function validateWholeNumber(value: string): QuestionValidationResult {
  const num = parseInt(value);
  if (isNaN(num) || !Number.isInteger(num)) {
    return {
      isValid: false,
      error: "Please enter a valid whole number"
    };
  }

  if (num < 0) {
    return {
      isValid: false,
      error: "Please enter a positive number"
    };
  }

  return { isValid: true };
}

function validateDecimal(value: string): QuestionValidationResult {
  const num = parseFloat(value);
  if (isNaN(num)) {
    return {
      isValid: false,
      error: "Please enter a valid decimal number"
    };
  }

  if (num < 0) {
    return {
      isValid: false,
      error: "Please enter a positive number"
    };
  }

  return { isValid: true };
}

function validateSelectOption(question: QuestionData, value: string): QuestionValidationResult {
  // Check if the selected value exists in the available answers
  const answerId = parseInt(value);
  const validAnswerIds = question.Answers.map(answer => answer.AnswerId);

  if (!validAnswerIds.includes(answerId)) {
    return {
      isValid: false,
      error: "Please select a valid option"
    };
  }

  return { isValid: true };
}

function validatePhone(value: string): QuestionValidationResult {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');

  // Check for valid US phone number length (10 digits)
  if (digits.length !== 10) {
    return {
      isValid: false,
      error: "Please enter a valid 10-digit phone number"
    };
  }

  return { isValid: true };
}

function validateText(value: string): QuestionValidationResult {
  // Basic text validation - check for minimum length
  if (value.trim().length < 1) {
    return {
      isValid: false,
      error: "Please enter a valid value"
    };
  }

  return { isValid: true };
}

function validateRichText(value: string): QuestionValidationResult {
  // Rich text validation - check for minimum meaningful content
  if (value.trim().length < 3) {
    return {
      isValid: false,
      error: "Please enter at least 3 characters"
    };
  }

  return { isValid: true };
}

/**
 * Format error message for display
 */
export function formatErrorMessage(question: QuestionData, error: string): string {
  const fieldName = question.QuestionText.replace(/[*:]/g, '').trim();
  return `${fieldName}: ${error}`;
}