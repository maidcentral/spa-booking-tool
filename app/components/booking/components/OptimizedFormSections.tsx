import React, { memo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Button } from "@/app/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Calendar, MapPin, Clock, Check, Plus, Settings, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils";
import { validateQuestionAnswer, validateAllQuestions } from "@/app/lib/questionValidation";
import { ErrorBoundary } from "@/app/components/common/ErrorBoundary";
import type { PostalCodeResult, RateModification, Frequency, QuestionData } from "@/app/services/api/booking-data";

/**
 * Optimized Location Section
 * Memoized to prevent unnecessary re-renders when other sections update
 */
interface LocationSectionProps {
  zipCode: string;
  onZipCodeChange: (value: string) => void;
  onValidate: () => void;
  postalCodeLoading: boolean;
  postalCodeError: string;
  validatedPostalCode: PostalCodeResult | null;
}

export const LocationSection = memo<LocationSectionProps>(({
  zipCode,
  onZipCodeChange,
  onValidate,
  postalCodeLoading,
  postalCodeError,
  validatedPostalCode
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Service Location
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="zipCode" variant="required">
            Postal Code
          </Label>
          <div className="flex gap-3 mt-2">
            <Input
              id="zipCode"
              type="text"
              value={zipCode}
              onChange={(e) => onZipCodeChange(e.target.value)}
              onBlur={onValidate}
              placeholder="Enter postal code"
              className={cn(
                "max-w-xs",
                postalCodeError && "border-red-500"
              )}
            />
            <Button
              type="button"
              variant="outline"
              onClick={onValidate}
              disabled={postalCodeLoading}
            >
              Validate
            </Button>
          </div>
          
          {postalCodeError && (
            <p className="text-sm text-red-600 mt-1">{postalCodeError}</p>
          )}
          
          {validatedPostalCode && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg"
            >
              <p className="text-sm text-green-800">
                ✓ Service available in {validatedPostalCode.ZoneName} zone
              </p>
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

LocationSection.displayName = 'LocationSection';

/**
 * Optimized Schedule Section
 * Memoized to prevent re-renders when dates haven't changed
 */
interface ScheduleSectionProps {
  availableDates: string[];
  selectedDate: Date | null;
  selectedTime: string;
  availabilityLoading: boolean;
  availabilityError: string;
  onDateSelect: (dateString: string) => void;
}

export const ScheduleSection = memo<ScheduleSectionProps>(({
  availableDates,
  selectedDate,
  selectedTime,
  availabilityLoading,
  availabilityError,
  onDateSelect
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Select Date & Time
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {availabilityLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
        ) : availabilityError ? (
          <div className="text-center p-4">
            <p className="text-red-600">{availabilityError}</p>
          </div>
        ) : availableDates.length > 0 ? (
          <div>
            <Label>Available Dates</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
              {availableDates.slice(0, 9).map((dateString) => {
                const date = new Date(dateString)
                const isSelected = selectedDate?.toISOString() === date.toISOString()
                
                return (
                  <button
                    key={dateString}
                    onClick={() => onDateSelect(dateString)}
                    className={cn(
                      "p-3 rounded-lg border-2 transition-all text-sm",
                      isSelected
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-300 hover:border-blue-400"
                    )}
                  >
                    <div className="font-medium">
                      {date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {date.toLocaleDateString('en-US', { 
                        weekday: 'short' 
                      })}
                    </div>
                  </button>
                )
              })}
            </div>
            
            {selectedDate && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-blue-50 rounded-lg"
              >
                <div className="flex items-center gap-2 text-blue-700">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Selected: {selectedDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    })} at {selectedTime || "9:00 AM"}
                  </span>
                </div>
              </motion.div>
            )}
          </div>
        ) : (
          <p className="text-gray-600">No available dates found. Please try a different location.</p>
        )}
      </CardContent>
    </Card>
  );
});

ScheduleSection.displayName = 'ScheduleSection';

/**
 * Optimized Frequency Selection
 * Memoized to prevent re-renders when frequency options haven't changed
 */
interface FrequencySectionProps {
  frequencies: Frequency[];
  selectedFrequency: Frequency | null;
  onFrequencySelect: (frequency: Frequency) => void;
}

export const FrequencySection = memo<FrequencySectionProps>(({
  frequencies,
  selectedFrequency,
  onFrequencySelect
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Service Frequency
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {frequencies.map((frequency, index) => (
            <motion.button
              key={frequency.FrequencyId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onFrequencySelect(frequency)}
              className={cn(
                "relative p-4 text-sm rounded-lg border-2 transition-all hover:shadow-sm text-left",
                selectedFrequency?.FrequencyId === frequency.FrequencyId
                  ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                  : "border-gray-400 hover:border-blue-400 text-gray-800"
              )}
            >
              {selectedFrequency?.FrequencyId === frequency.FrequencyId && (
                <div className="absolute top-2 right-2">
                  <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                </div>
              )}
              
              <h3 className="font-medium text-gray-900 mb-1 leading-tight">
                {frequency.Name}
              </h3>
              
              {frequency.FrequencyId === 'E1' && (
                <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  15% Savings
                </span>
              )}
              {frequency.FrequencyId === 'E2' && (
                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  10% Savings
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

FrequencySection.displayName = 'FrequencySection';

/**
 * Optimized Add-ons Section
 * Memoized to prevent re-renders when modifications haven't changed
 */
interface AddOnsSectionProps {
  rateModifications: RateModification[];
  selectedModifications: Record<number, number>;
  onModificationToggle: (modId: number, quantity: number) => void;
}

export const AddOnsSection = memo<AddOnsSectionProps>(({
  rateModifications,
  selectedModifications,
  onModificationToggle
}) => {
  if (rateModifications.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add-on Services
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {rateModifications.map((modification) => {
              const isSelected = selectedModifications[modification.RateModificationId] > 0
              const isRequired = modification.IsRequired
              
              return (
                <button
                  key={modification.RateModificationId}
                  type="button"
                  onClick={() => onModificationToggle(
                    modification.RateModificationId, 
                    isSelected ? 0 : 1
                  )}
                  disabled={isRequired}
                  className={cn(
                    "relative p-4 text-sm rounded-lg border-2 transition-all hover:shadow-sm text-left",
                    isSelected 
                      ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                      : "border-gray-400 hover:border-blue-400 text-gray-800"
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900 leading-tight">
                      {modification.Name}
                    </h4>
                    
                    <p className="text-sm font-medium text-green-600">
                      {modification.CostDisplay}
                    </p>
                    
                    {isRequired && (
                      <span className="inline-block bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                        Required
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

AddOnsSection.displayName = 'AddOnsSection';

/**
 * Optimized Questions Section
 * Memoized to prevent re-renders when questions haven't changed
 */
interface QuestionsSectionProps {
  questions: QuestionData[];
  questionAnswers: Record<number, string>;
  questionsUnavailable: boolean;
  onQuestionAnswer: (questionId: number, answer: string) => void;
  questionErrors?: Record<number, string>;
  onValidationChange?: (errors: Record<number, string>) => void;
}

export const QuestionsSection = memo<QuestionsSectionProps>(({
  questions,
  questionAnswers,
  questionsUnavailable,
  onQuestionAnswer,
  questionErrors = {},
  onValidationChange
}) => {
  // Local state for managing validation errors
  const [localErrors, setLocalErrors] = useState<Record<number, string>>({});

  // Validate a single question and update errors
  const validateQuestion = useCallback((question: QuestionData, answer: string) => {
    const result = validateQuestionAnswer(question, answer);
    const newErrors = { ...localErrors };

    if (!result.isValid && result.error) {
      newErrors[question.QuestionId] = result.error;
    } else {
      delete newErrors[question.QuestionId];
    }

    setLocalErrors(newErrors);

    // Notify parent component of validation changes
    if (onValidationChange) {
      onValidationChange(newErrors);
    }
  }, [localErrors, onValidationChange]);

  // Handle question answer with validation
  const handleQuestionAnswer = useCallback((questionId: number, answer: string) => {
    // Update the answer
    onQuestionAnswer(questionId, answer);

    // Find the question and validate
    const question = questions.find(q => q.QuestionId === questionId);
    if (question) {
      validateQuestion(question, answer);
    }
  }, [onQuestionAnswer, questions, validateQuestion]);

  // Use provided errors or local errors
  const displayErrors = Object.keys(questionErrors).length > 0 ? questionErrors : localErrors;

  if (questions.length === 0 && !questionsUnavailable) return null;

  return (
    <ErrorBoundary
      fallbackTitle="Questions Section Error"
      fallbackMessage="Unable to load service details questions. You can continue with your booking."
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Service Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {questionsUnavailable ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800">
                Service details questions are temporarily unavailable. You can continue with your booking.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {questions.map((question) => (
              <div key={question.QuestionId}>
                <Label className="text-base font-medium">
                  {question.QuestionText}
                  {question.IsRequired && <span className="text-red-600"> *</span>}
                </Label>
                
                {question.HelpText && (
                  <p className="text-sm text-gray-500 mt-1">
                    {question.HelpText}
                  </p>
                )}
                
                {/* Handle different question types */}
                {question.QuestionType === "Select List" || question.QuestionType === "Multiple Select List" ? (
                  <div>
                    <Select
                      value={questionAnswers[question.QuestionId] || ""}
                      onValueChange={(value) => handleQuestionAnswer(question.QuestionId, value)}
                    >
                    <SelectTrigger className={cn(
                      "mt-2",
                      question.IsRequired && "!bg-white !border-red-200 !text-gray-900 [&>span]:!text-gray-900"
                    )}
                    style={question.IsRequired ? {
                      backgroundColor: '#ffffff',
                      borderColor: '#fecaca',
                      color: '#111827'
                    } : undefined}>
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent className={cn(
                      question.IsRequired && "!bg-white !border-gray-200 !text-gray-900 shadow-lg"
                    )}
                    style={question.IsRequired ? {
                      backgroundColor: '#ffffff',
                      borderColor: '#e5e7eb',
                      color: '#111827'
                    } : undefined}>
                      {question.Answers.map((answer, index) => (
                        <SelectItem
                          key={`${question.QuestionId}-answer-${index}`}
                          value={answer.AnswerId.toString()}
                          className={cn(
                            question.IsRequired && "!text-gray-900 hover:!bg-gray-100 focus:!bg-gray-100 data-[highlighted]:!bg-gray-100"
                          )}
                        >
                          {answer.AnswerText}
                        </SelectItem>
                      ))}
                    </SelectContent>
                    </Select>
                    {displayErrors[question.QuestionId] && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        {displayErrors[question.QuestionId]}
                      </div>
                    )}
                  </div>
                ) : question.QuestionType === "Whole Number" ? (
                  <div>
                    <Input
                      type="number"
                      step="1"
                      value={questionAnswers[question.QuestionId] || ""}
                      onChange={(e) => handleQuestionAnswer(question.QuestionId, e.target.value)}
                      placeholder="Enter a number"
                      className={cn(
                        "mt-2",
                        displayErrors[question.QuestionId] && "border-red-500 focus-visible:ring-red-500"
                      )}
                    />
                    {displayErrors[question.QuestionId] && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        {displayErrors[question.QuestionId]}
                      </div>
                    )}
                  </div>
                ) : question.QuestionType === "Decimal" ? (
                  <div>
                    <Input
                      type="number"
                      step="0.01"
                      value={questionAnswers[question.QuestionId] || ""}
                      onChange={(e) => handleQuestionAnswer(question.QuestionId, e.target.value)}
                      placeholder="Enter a decimal number"
                      className={cn(
                        "mt-2",
                        displayErrors[question.QuestionId] && "border-red-500 focus-visible:ring-red-500"
                      )}
                    />
                    {displayErrors[question.QuestionId] && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        {displayErrors[question.QuestionId]}
                      </div>
                    )}
                  </div>
                ) : question.QuestionType === "Rich Text" ? (
                  <div>
                    <textarea
                      value={questionAnswers[question.QuestionId] || ""}
                      onChange={(e) => handleQuestionAnswer(question.QuestionId, e.target.value)}
                      placeholder="Enter your notes..."
                      className={cn(
                        "mt-2 w-full p-3 border border-gray-300 rounded-lg resize-y",
                        displayErrors[question.QuestionId] && "border-red-500 focus:ring-red-500"
                      )}
                      rows={3}
                    />
                    {displayErrors[question.QuestionId] && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        {displayErrors[question.QuestionId]}
                      </div>
                    )}
                  </div>
                ) : question.QuestionText.toLowerCase().includes("phone") ? (
                  <div>
                    <Input
                      type="tel"
                      value={questionAnswers[question.QuestionId] || ""}
                      onChange={(e) => handleQuestionAnswer(question.QuestionId, e.target.value)}
                      placeholder="Enter phone number"
                      className={cn(
                        "mt-2",
                        displayErrors[question.QuestionId] && "border-red-500 focus-visible:ring-red-500"
                      )}
                    />
                    {displayErrors[question.QuestionId] && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        {displayErrors[question.QuestionId]}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <Input
                      type="text"
                      value={questionAnswers[question.QuestionId] || ""}
                      onChange={(e) => handleQuestionAnswer(question.QuestionId, e.target.value)}
                      placeholder="Enter your answer"
                      className={cn(
                        "mt-2",
                        displayErrors[question.QuestionId] && "border-red-500 focus-visible:ring-red-500"
                      )}
                    />
                    {displayErrors[question.QuestionId] && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        {displayErrors[question.QuestionId]}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
    </ErrorBoundary>
  );
});

QuestionsSection.displayName = 'QuestionsSection';