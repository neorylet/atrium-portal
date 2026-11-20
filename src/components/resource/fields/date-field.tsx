import { ButtonGroup } from "#/components/ui/button-group"
import { DropdownMenuItem } from "#/components/ui/dropdown-menu"
import { Input } from "#/components/ui/input"
import type { FieldProps } from "#/types/fields"

import { useFieldContext } from "../form-hook"
import { FieldOptionDropdown } from "./field-option-dropdown"

export function DateField({ columnMetadata }: FieldProps) {
  const field = useFieldContext<unknown>()

  return (
    <ButtonGroup className="w-full">
      <ButtonGroup className="relative w-full">
        <Input
          type="date"
          name={field.name}
          value={(field.state.value as string | null | undefined) ?? ""}
          onChange={(e) => field.handleChange(e.target.value)}
          onBlur={field.handleBlur}
          disabled={columnMetadata.disabled}
        />
      </ButtonGroup>
      <FieldOptionDropdown
        columnMetadata={columnMetadata}
        setValue={(value) => field.handleChange(value)}
      >
        <DropdownMenuItem
          onClick={() =>
            field.handleChange(new Date().toISOString().slice(0, 10))
          }
        >
          NOW
        </DropdownMenuItem>
      </FieldOptionDropdown>
    </ButtonGroup>
  )
}
