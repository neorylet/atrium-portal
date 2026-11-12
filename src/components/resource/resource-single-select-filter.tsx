import { FilterIcon } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select"

interface FilterOption {
  label: string
  value: string
}

interface ResourceSingleSelectFilterProps {
  label: string
  options: FilterOption[]
  selectedValue: string | undefined
  onChange: (value: string | undefined) => void
}

export function ResourceSingleSelectFilter({
  label,
  options,
  selectedValue,
  onChange,
}: ResourceSingleSelectFilterProps) {
  return (
    <div className="flex items-center">
      <Select
        value={selectedValue ?? "__all__"}
        onValueChange={(value) => {
          onChange(value === "__all__" ? undefined : value)
        }}
      >
        <SelectTrigger className="w-[250px] h-9">
          <FilterIcon className="size-3.5 text-muted-foreground mr-2 shrink-0" />
          <SelectValue placeholder={`All ${label}`}>
            {selectedValue
              ? options.find((o) => o.value === selectedValue)?.label ||
                selectedValue
              : `All ${label}`}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All {label}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
