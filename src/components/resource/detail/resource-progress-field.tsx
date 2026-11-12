import type { LucideIcon } from "lucide-react"
import * as LucideIcons from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select"
import type {
  ColumnSchema,
  EnumColumnMetadata,
} from "#/lib/database-meta.types"
import { formatTitle } from "#/lib/format"
import { cn } from "#/lib/utils"

type Variant = NonNullable<
  NonNullable<EnumColumnMetadata["values"]>[string]["variant"]
>

const filledCircle: Record<Variant, string> = {
  default: "border-primary bg-primary text-primary-foreground",
  secondary: "border-secondary bg-secondary text-secondary-foreground",
  success: "border-green-500 bg-green-500 text-white",
  warning: "border-orange-500 bg-orange-500 text-white",
  destructive: "border-destructive bg-destructive text-destructive-foreground",
  info: "border-blue-500 bg-blue-500 text-white",
}

const filledConnector: Record<Variant, string> = {
  default: "bg-primary",
  secondary: "bg-secondary",
  success: "bg-green-500",
  warning: "bg-orange-500",
  destructive: "bg-destructive",
  info: "bg-blue-500",
}

export function ResourceProgressField({
  column,
  value,
  enumMeta,
  onChange,
}: {
  column: ColumnSchema
  value: string | null
  enumMeta: EnumColumnMetadata
  onChange?: (value: string) => void
}) {
  if (!enumMeta.values) return null
  const steps = Object.entries(enumMeta.values)
  if (steps.length === 0) return null

  const currentIndex = steps.findIndex(([key]) => key === value)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle>{formatTitle(column.name)}</CardTitle>
        {onChange && (
          <Select value={value ?? ""} onValueChange={onChange}>
            <SelectTrigger className="h-8 w-[140px] text-xs capitalize">
              {/* FIX: Explicitly format the value so it doesn't show in_review */}
              <SelectValue placeholder="Select status">
                {value ? formatTitle(value) : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {steps.map(([key]) => (
                <SelectItem key={key} value={key} className="text-xs capitalize">
                  {formatTitle(key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-start">
          {steps.map(([key, cfg], i) => {
            const variant: Variant = cfg.variant ?? "default"
            const isCompleted = currentIndex >= 0 && i < currentIndex
            const isActive = currentIndex >= 0 && i === currentIndex
            const filled = isCompleted || isActive
            const Icon = cfg.icon
              ? (LucideIcons[cfg.icon as keyof typeof LucideIcons] as
                  | LucideIcon
                  | undefined)
              : null
            const isLast = i === steps.length - 1
            return (
              <div
                key={key}
                className={cn(
                  "flex items-start",
                  isLast ? "flex-none" : "flex-1"
                )}
              >
                <div className="flex flex-col items-center gap-2">
                  <div
                    onClick={() => onChange?.(key)}
                    className={cn(
                      "flex size-10 items-center justify-center rounded-full border-2 transition-all",
                      filled
                        ? filledCircle[variant]
                        : "border-muted bg-background text-muted-foreground",
                      isActive && "ring-2 ring-ring ring-offset-2",
                      onChange && "cursor-pointer hover:opacity-80"
                    )}
                  >
                    {Icon ? <Icon className="size-5" /> : null}
                  </div>
                  <span
                    className={cn(
                      "text-center text-xs font-medium",
                      isActive ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {formatTitle(key)}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "mx-2 mt-5 h-0.5 flex-1",
                      isCompleted ? filledConnector[variant] : "bg-muted"
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}