import { ChevronDownIcon } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { Editor } from "#/components/editor/editor-md"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "#/components/ui/collapsible"
import { Label } from "#/components/ui/label"
import { getColumnMetadata } from "#/lib/columns"
import type {
  ColumnSchema,
  TableMetadata,
  TableSchema,
} from "#/lib/database-meta.types"
import { formatTitle } from "#/lib/format"
import { supabase } from "#/lib/supabase/client"
import type { FileObject } from "#/types/fields"

import { AllCells } from "../cells/all-cells"
import type { ResolvedFieldSection } from "../resource-form-utils"
import {
  evaluateConditionalField,
  getColumnFieldSpan,
} from "../resource-form-utils"
import { ResourceAvatarDisplay } from "./resource-avatar-display"
import { ResourceFileDisplay } from "./resource-file-display"

type Props = {
  section: ResolvedFieldSection
  colByName: Map<string, ColumnSchema>
  tableSchema: TableSchema | null
  record: Record<string, unknown>
}

// 🚀 NEW COMPONENT: Guaranteed to fetch the name instead of failing on joins
export function ForeignKeyNameFetcher({ table, id }: { table: string; id: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["fk-name", table, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table as never)
        .select("name")
        .eq("id", id)
        .maybeSingle()
      if (error) throw error
      return data as { name: string } | null
    },
    staleTime: 1000 * 60 * 5,
  })

  if (isLoading) return <span className="text-sm text-muted-foreground">Loading...</span>
  return <span className="text-sm">{data?.name || id}</span>
}

export function ResourceSectionDetail({
  section,
  colByName,
  tableSchema,
  record,
}: Props) {
  const behavior = (JSON.parse(tableSchema?.comment ?? "{}") as TableMetadata)
    .fields?.behavior

  const cols = section.fields
    .filter((name) => {
      const visible = behavior?.[name]?.visible
      if (!visible?.length) return true
      return evaluateConditionalField(visible, record)
    })
    .map((name) => colByName.get(name))
    .filter((col): col is ColumnSchema => Boolean(col))

  if (!cols.length) return null

  const body = (
    <CardContent className="grid grid-cols-1 gap-4 py-4 md:grid-cols-2">
      {cols.map((column) => {
        const value = record[column.name]
        const columnMetadata = getColumnMetadata(tableSchema, column)
        const span = getColumnFieldSpan(column, tableSchema)

        const isFile = column.name === "file_path" || column.name === "logo_url" || columnMetadata.variant === "file" || (typeof value === "string" && /\.(png|jpg|jpeg|gif|pdf|docx|csv|xlsx|zip)$/i.test(value))

        return (
          <div
            key={column.id}
            className={
              span === 2
                ? "flex min-w-0 flex-col gap-1.5 md:col-span-2"
                : "flex min-w-0 flex-col gap-1.5"
            }
          >
            <Label className="inline-flex items-center gap-1.5 text-sm font-medium">
              {columnMetadata.icon} {formatTitle(columnMetadata.name)}
            </Label>
            <div className="text-sm text-muted-foreground">
              {value ? (
                columnMetadata.variant === "rich_text" ? (
                  <Editor
                    name={columnMetadata.name}
                    value={value as string}
                    disabled
                  />
                ) : isFile ? (
                  <ResourceFileDisplay value={value as any} />
                ) : columnMetadata.variant === "avatar" ? (
                  <ResourceAvatarDisplay
                    value={(value as FileObject | null) ?? null}
                  />
                ) : column.name === "project_id" ? (
                  <ForeignKeyNameFetcher table="projects" id={value as string} />
                ) : column.name === "org_id" ? (
                  <ForeignKeyNameFetcher table="organisations" id={value as string} />
                ) : (
                  <AllCells columnMetadata={columnMetadata} value={value} record={record} />
                )
              ) : (
                <div className="text-muted">N/A</div>
              )}
            </div>
          </div>
        )
      })}
    </CardContent>
  )

  if (!section.collapsible) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{section.title}</CardTitle>
          {section.description ? (
            <CardDescription>{section.description}</CardDescription>
          ) : null}
        </CardHeader>
        {body}
      </Card>
    )
  }

  return (
    <Collapsible defaultOpen={false}>
      <Card>
        <CollapsibleTrigger
          render={
            <button
              type="button"
              className="group/section-trigger w-full cursor-pointer text-left"
            />
          }
        >
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <CardTitle>{section.title}</CardTitle>
              {section.description ? (
                <CardDescription>{section.description}</CardDescription>
              ) : null}
            </div>
            <ChevronDownIcon className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]/section-trigger:rotate-180" />
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>{body}</CollapsibleContent>
      </Card>
    </Collapsible>
  )
}