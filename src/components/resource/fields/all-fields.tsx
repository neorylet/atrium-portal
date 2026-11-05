import type { FieldProps } from "#/types/fields"

import { BooleanField } from "./boolean-field"
import { CountryComboboxField } from "./country-combobox-field"
import { CurrencyComboboxField } from "./currency-combobox-field"
import { DateField } from "./date-field"
import { DatetimeField } from "./datetime-field"
import { DurationField } from "./duration-field"
import { FileUploadField } from "./file-upload-field"
import { JsonField } from "./json-field"
import { LongtextField } from "./long-text-field"
import { MoneyField } from "./money-field"
import { NumberField } from "./number-field"
import { PercentageField } from "./percentage-field"
import { RatingField } from "./rating-field"
import { RichTextField } from "./rich-text-field"
import { SelectField } from "./select-field"
import { TextField } from "./text-field"
import { TimeField } from "./time-field"
import { TimezoneComboboxField } from "./timezone-combobox-field"
import { UuidField } from "./uuid-field"

export function AllFields({ columnMetadata, form }: FieldProps) {
  // FORCE FILE UPLOADER FOR SPECIFIC COLUMNS
  // This bypasses any database type confusion (like jsonb vs text)
  if (columnMetadata.name === "file_path" || columnMetadata.name === "logo_url") {
    return <FileUploadField columnMetadata={columnMetadata} form={form} />
  }

  if (
    columnMetadata.variant === "currency_code" ||
    columnMetadata.name === "currency_code"
  ) {
    return <CurrencyComboboxField columnMetadata={columnMetadata} form={form} />
  }

  if (
    columnMetadata.variant === "country_code" ||
    columnMetadata.name === "country_code"
  ) {
    return <CountryComboboxField columnMetadata={columnMetadata} form={form} />
  }

  if (
    columnMetadata.variant === "timezone" ||
    columnMetadata.name === "timezone"
  ) {
    return <TimezoneComboboxField columnMetadata={columnMetadata} form={form} />
  }

  switch (columnMetadata.variant) {
    case "uuid":
      return <UuidField columnMetadata={columnMetadata} />
    case "money":
      return <MoneyField columnMetadata={columnMetadata} />
    case "number":
      return <NumberField columnMetadata={columnMetadata} />
    case "percentage":
      return <PercentageField columnMetadata={columnMetadata} />
    case "boolean":
      return <BooleanField columnMetadata={columnMetadata} />
    case "select":
      return <SelectField columnMetadata={columnMetadata} />
    case "date":
      return <DateField columnMetadata={columnMetadata} />
    case "time":
      return <TimeField columnMetadata={columnMetadata} />
    case "datetime":
      return <DatetimeField columnMetadata={columnMetadata} />
    case "json":
      return <JsonField columnMetadata={columnMetadata} />
    case "long_text":
      return <LongtextField columnMetadata={columnMetadata} />
    case "rating":
      return <RatingField columnMetadata={columnMetadata} />
    case "duration":
      return <DurationField columnMetadata={columnMetadata} />
    case "rich_text":
      return <RichTextField columnMetadata={columnMetadata} />
    case "file":
      return <FileUploadField columnMetadata={columnMetadata} form={form} />
    case "color":
    case "barcode":
    case "email":
    case "tel":
    case "text":
    case "url":
    default:
      return <TextField columnMetadata={columnMetadata} />
  }
}