"use client"

import React from "react"
import { motion } from "framer-motion"
import { Settings } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select"
import { MultiSelect } from "@/app/components/ui/multi-select"
import type { QuestionData } from "@/app/services/api/booking-data"

interface QuestionsFormProps {
  questions: QuestionData[]
  answers: Record<number, string>
  onChange: (questionId: number, answer: string) => void
  unavailable?: boolean
  /** Card title override. Defaults to "Service Details". */
  title?: string
  /** Optional slot rendered below the questions (e.g. a "Calculate price" CTA). */
  footer?: React.ReactNode
}

export function QuestionsForm({
  questions,
  answers,
  onChange,
  unavailable,
  title = "Service Details",
  footer,
}: QuestionsFormProps) {
  if (questions.length === 0 && !unavailable) return null

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unavailable ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800">
                Service details questions are temporarily unavailable. You can continue with your booking.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6">
              {questions.map(question => (
                <QuestionField
                  key={question.QuestionId}
                  question={question}
                  value={answers[question.QuestionId] ?? ""}
                  onChange={value => onChange(question.QuestionId, value)}
                />
              ))}
            </div>
          )}
          {footer && <div className="pt-2 sm:pt-4 border-t border-gray-200 mt-3 sm:mt-6">{footer}</div>}
        </CardContent>
      </Card>
    </motion.div>
  )
}

interface QuestionFieldProps {
  question: QuestionData
  value: string
  onChange: (value: string) => void
}

function QuestionField({ question, value, onChange }: QuestionFieldProps) {
  const isPhone = question.QuestionText.toLowerCase().includes("phone")

  const control = (() => {
    switch (question.QuestionType) {
      case "Multiple Select List":
        return (
          <MultiSelect
            options={question.Answers.map(answer => ({
              label: answer.AnswerText,
              value: answer.AnswerId.toString(),
            }))}
            selected={value ? value.split(",").filter(Boolean) : []}
            onChange={selectedValues => onChange(selectedValues.join(","))}
            placeholder="Select options..."
            className="mt-2"
          />
        )
      case "Select List":
        return (
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {question.Answers.map(answer => (
                <SelectItem
                  key={`${question.QuestionId}-${answer.AnswerId}`}
                  value={answer.AnswerId.toString()}
                >
                  {answer.AnswerText}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case "Whole Number":
        return (
          <Input
            type="number"
            step="1"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="Enter a number"
            className="mt-2"
          />
        )
      case "Decimal":
        return (
          <Input
            type="number"
            step="0.01"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="Enter a decimal number"
            className="mt-2"
          />
        )
      case "Rich Text":
        return (
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="Enter your notes..."
            className="mt-2 w-full p-3 border border-gray-300 rounded-lg resize-y"
            rows={3}
          />
        )
      case "Date":
        return (
          <Input
            type="date"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="mt-2"
          />
        )
      case "Time":
        return (
          <Input
            type="time"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="mt-2"
          />
        )
      case "Date and Time":
        return (
          <Input
            type="datetime-local"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="mt-2"
          />
        )
      default:
        return (
          <Input
            type={isPhone ? "tel" : "text"}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={isPhone ? "Enter phone number" : "Enter your answer"}
            className="mt-2"
          />
        )
    }
  })()

  return (
    <div>
      <Label variant={question.IsRequired ? "required" : "default"} className="text-base font-medium">
        {question.QuestionText}
      </Label>
      {question.HelpText && <p className="text-sm text-gray-500 mt-1">{question.HelpText}</p>}
      {control}
    </div>
  )
}
