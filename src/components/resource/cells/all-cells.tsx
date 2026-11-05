import { memo } from "react"

import { formatDate } from "#/lib/format"
import {
  formatCountryLabel,
  formatCurrencyLabel,
  formatTimezoneLabel,
} from "#/lib/geo-data"
import type { ColumnFieldMetadata, FileObject } from "#/types/fields"

import { AvatarCell } from "./avatar-cell"
import { BarcodeCell } from "./barcode-cell"
import { BooleanCell } from "./boolean-cell"
import { ColorCell } from "./color-cell"
import { DurationCell } from "./duration-cell"
import { FileCell } from "./file-cell"
import { PercentageCell } from "./percentage-cell"
import { RatingCell } from "./rating-cell"
import { SelectCell } from "./select-cell"

// Helper to check if a string is a UUID
const isUUID = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

// Helper to get joined table name from column name
const getJoinedTableName = (colName: string) => {
  if (colName === "org_id") return "organisations"
  if (colName.endsWith("_id")) {
    return colName.slice(0, -3) + "s"
  }
  return colName
}

export const AllCells = memo(function ({
  columnMetadata,
  value,
  record,
}: {
  columnMetadata: ColumnFieldMetadata
  value: unknown
  record?: Record<string, unknown>
}) {
  // Handle foreign key UUIDs - display joined name if available
  const stringValue = value?.toString()
  if (isUUID(stringValue || "") && record && columnMetadata.name) {
    const joinedTableName = getJoinedTableName(columnMetadata.name)
    const joinedObj = record[joinedTableName] as
      | Record<string, unknown>
      | null
      | undefined
    if (joinedObj && typeof joinedObj.name === "string") {
      return joinedObj.name
    }
  }

  switch (columnMetadata.variant) {
    case "boolean":
      return <BooleanCell value={value as string} />
    case "barcode":
      return <BarcodeCell value={value as string | null} />
    case "color":
      return <ColorCell value={value as string} />
    case "percentage":
      return <PercentageCell value={value as number} />
    case "duration":
      return <DurationCell value={value as string} />
    case "file":
      return <FileCell value={value as FileObject[]} />
    case "avatar":
      return <AvatarCell value={value as FileObject | null} />
    case "rating":
      return <RatingCell value={value as number | null} />
    case "select":
      return (
        <SelectCell value={value as string} columnMetadata={columnMetadata} />
      )
    case "money":
      return value ? `${value}` : ""
    case "currency_code":
      return value ? formatCurrencyLabel(String(value)) : ""
    case "country_code":
      return value ? formatCountryLabel(String(value)) : ""
    case "timezone":
      return value ? formatTimezoneLabel(String(value)) : ""
    case "json":
      return (
        <pre className="truncate">
          {value ? JSON.stringify(value, null, 2) : ""}
        </pre>
      )
    case "date":
      return value ? formatDate(value as string) : ""
    case "datetime":
      return value
        ? formatDate(value as string, {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : ""
    case "time":
      return value?.toString()
    default:
      return value?.toString()
  }
})
