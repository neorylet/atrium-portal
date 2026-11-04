import { memo, useMemo } from "react"

import { ArrowUpRightIcon } from "lucide-react"

import { getColumnMetadata } from "#/lib/columns"
import type { DataTableRow } from "#/lib/data-table-types"
import type {
  ColumnSchema,
  Relationship,
  ResourceDataSchema,
  ResourceSchema,
  TableMetadata,
} from "#/lib/database-meta.types"
import { isTableSchema } from "#/lib/database-meta.types"
import { cn } from "#/lib/utils"

import { AllCells } from "./cells/all-cells"
import { ArrayCell } from "./cells/array-cell"
import { DetailRecordTrigger } from "./sheet/detail-record-trigger"

export const ResourceRowCell = memo(function ({
  row,
  columnSchema,
  resourceSchema,
}: {
  row: DataTableRow<ResourceDataSchema>
  columnSchema: ColumnSchema
  resourceSchema: ResourceSchema
}) {
  const tableSchema = isTableSchema(resourceSchema) ? resourceSchema : null

  const columnData = useMemo(
    () => getColumnMetadata(tableSchema, columnSchema),
    [tableSchema, columnSchema]
  )

  const tableMeta = useMemo(
    () => JSON.parse(resourceSchema.comment ?? "{}") as TableMetadata,
    [resourceSchema.comment]
  )

  const joinConfig = useMemo(
    () => tableMeta.query?.join?.find((j) => j.on === columnSchema.name),
    [tableMeta, columnSchema.name]
  )

  const relationship = useMemo(
    () =>
      (tableSchema?.relationships as Relationship[])?.find(
        (r) => r.source_column_name === columnSchema.name
      ),
    [tableSchema?.relationships, columnSchema.name]
  )

  const value = row.original?.[columnSchema.name]

  // Helper to check if a string is a UUID
  const isUUID = (str: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

  // Helper to get joined table name from column name (e.g., project_id -> projects)
  const getJoinedTableName = (colName: string) => {
    if (colName === "org_id") return "organisations"
    if (colName.endsWith("_id")) {
      return colName.slice(0, -3) + "s" // project_id -> projects
    }
    return colName
  }

  if (joinConfig) {
    const embedKey = joinConfig.alias ?? joinConfig.table
    const joinedObj = row.original?.[embedKey] as
      | Record<string, unknown>
      | null
      | undefined
    const joinedValue = joinedObj?.[joinConfig.columns[0]]

    return (
      <div
        className={cn("relative truncate select-none", relationship && "pl-6")}
      >
        {relationship && (
          <DetailRecordTrigger
            pk={{ [relationship.target_column_name]: value }}
            primaryKeyNames={[relationship.target_column_name]}
            schema={relationship.target_table_schema}
            resource={relationship.target_table_name}
            size="icon-xs"
            variant="outline"
            className="absolute top-1/2 left-0 size-5 -translate-y-1/2 [&_svg]:size-3"
          >
            <ArrowUpRightIcon />
          </DetailRecordTrigger>
        )}
        <span>{joinedValue?.toString() ?? ""}</span>
      </div>
    )
  }

  // Fallback: if value is UUID and there's a nested joined object, render the name
  const stringValue = value?.toString()
  if (isUUID(stringValue || "")) {
    const joinedTableName = getJoinedTableName(columnSchema.name)
    const joinedObj = row.original?.[joinedTableName] as
      | Record<string, unknown>
      | null
      | undefined
    if (joinedObj && typeof joinedObj.name === "string") {
      return (
        <div
          className={cn("relative truncate select-none", relationship && "pl-6")}
        >
          {relationship && (
            <DetailRecordTrigger
              pk={{ [relationship.target_column_name]: value }}
              primaryKeyNames={[relationship.target_column_name]}
              schema={relationship.target_table_schema}
              resource={relationship.target_table_name}
              size="icon-xs"
              variant="outline"
              className="absolute top-1/2 left-0 size-5 -translate-y-1/2 [&_svg]:size-3"
            >
              <ArrowUpRightIcon />
            </DetailRecordTrigger>
          )}
          <span>{joinedObj.name}</span>
        </div>
      )
    }
  }

  return (
    <div
      className={cn("relative truncate select-none", relationship && "pl-6")}
    >
      {relationship ? (
        <>
          <DetailRecordTrigger
            pk={{ [relationship.target_column_name]: value }}
            primaryKeyNames={[relationship.target_column_name]}
            schema={relationship.target_table_schema}
            resource={relationship.target_table_name}
            size="icon-xs"
            variant="outline"
            className="absolute top-1/2 left-0 size-5 -translate-y-1/2 [&_svg]:size-3"
          >
            <ArrowUpRightIcon />
          </DetailRecordTrigger>
          <span>
            {row.original?.[relationship.source_column_name]?.toString() || ""}
          </span>
        </>
      ) : columnData.isArray ? (
        <ArrayCell value={value as any[]} />
      ) : (
        <AllCells columnMetadata={columnData} value={value} />
      )}
    </div>
  )
})
