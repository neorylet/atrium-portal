import { ArrowUpRightIcon } from "lucide-react"

import { getDataTableSelectColumn } from "#/components/data-table/data-table-select-column"
import { getColumnDefMeta } from "#/lib/columns"
import type {
  DataTableColumn,
  DataTableColumnDef,
  DataTableRow,
} from "#/lib/data-table-types"
import type {
  ColumnMetadata,
  ColumnSchema,
  ResourceDataSchema,
  ResourceSchema,
  TableMetadata,
} from "#/lib/database-meta.types"
import { getMetaFields, isTableSchema, parseComment } from "#/lib/database-meta.types"
import type { ResourceActionRow } from "#/lib/supabase/data/resource"

import { ResourceColumnHeader } from "../resource-column-header"
import { ResourceRowActions } from "../resource-row-actions"
import { ResourceRowCell } from "../resource-row-cell"
import { DetailRecordTrigger } from "../sheet/detail-record-trigger"

export function getResourceForeignTableColumns({
  columnsSchema,
  resourceSchema,
  actions = [],
}: {
  columnsSchema: ColumnSchema[]
  resourceSchema: ResourceSchema
  actions?: ResourceActionRow[]
}) {
  const tableSchema = isTableSchema(resourceSchema) ? resourceSchema : null
  const primaryKeys = tableSchema?.primary_keys ?? []
  const primaryKeyNames = primaryKeys.map((k) => k.name)
  const hasPrimaryKeys = primaryKeys.length > 0

  // Filter out metadata fields (id, org_id, created_at, etc.)
  // Note: This does NOT filter out hidden_in_form columns - those are for forms only
  const metaFields = getMetaFields(resourceSchema)

  // Build a map of columns with hidden_in_table flag
  const columnHiddenInTable = new Map<string, boolean>()
  for (const col of columnsSchema ?? []) {
    const meta = parseComment<ColumnMetadata>(col.comment, {})
    if (meta.hidden_in_table) {
      columnHiddenInTable.set(col.name, true)
    }
  }

  // Parse table comment to get sections ordering
  const tableMeta = parseComment<TableMetadata>(resourceSchema.comment, {})
  const sections = tableMeta.fields?.sections ?? []

  // Build a flat ordered list of all column names from sections
  const orderedColumnNames: string[] = []
  for (const section of sections) {
    for (const fieldName of section.fields) {
      if (!orderedColumnNames.includes(fieldName)) {
        orderedColumnNames.push(fieldName)
      }
    }
  }

  // Build a map of column name -> order index
  const columnOrderMap = new Map<string, number>()
  orderedColumnNames.forEach((name, index) => {
    columnOrderMap.set(name, index)
  })

  // Filter out metadata fields and hidden_in_table columns, then sort by sections order
  const sortedColumns = (columnsSchema ?? [])
    .filter((c) => !metaFields.includes(c.name) && !columnHiddenInTable.get(c.name))
    .sort((a, b) => {
      const orderA = columnOrderMap.get(a.name)
      const orderB = columnOrderMap.get(b.name)
      if (orderA !== undefined && orderB !== undefined) {
        return orderA - orderB
      }
      if (orderA !== undefined) return -1
      if (orderB !== undefined) return 1
      return 0
    })

  const selectColumns: DataTableColumnDef<ResourceDataSchema>[] = hasPrimaryKeys
    ? [
        getDataTableSelectColumn<ResourceDataSchema>(),
        {
          id: "detail",
          header: () => null,
          cell: ({ row }) => {
            const pk = Object.fromEntries(
              primaryKeys.map((k) => [k.name, row.original[k.name]])
            )
            return (
              <DetailRecordTrigger
                pk={pk}
                primaryKeyNames={primaryKeyNames}
                schema={resourceSchema.schema}
                resource={resourceSchema.name}
                size="icon-xs"
                variant="outline"
                className="size-5 opacity-0 transition-opacity group-hover:opacity-100 [&_svg]:size-3"
              >
                <ArrowUpRightIcon />
              </DetailRecordTrigger>
            )
          },
          size: 40,
          enableSorting: false,
          enableHiding: false,
          enableColumnFilter: false,
        },
      ]
    : []

  return [
    ...selectColumns,
    ...(actions.length > 0
      ? [
          {
            id: "actions",
            header: () => null,
            cell: ({ row }: { row: DataTableRow<ResourceDataSchema> }) => (
              <ResourceRowActions
                schema={resourceSchema.schema}
                resource={resourceSchema.name}
                record={row.original}
                actions={actions}
                columnsSchema={columnsSchema}
              />
            ),
            size: 40,
            enableSorting: false,
            enableHiding: false,
            enableColumnFilter: false,
          },
        ]
      : []),
    ...sortedColumns.map((c) => {
      const meta = getColumnDefMeta(resourceSchema, c)

      return {
        id: c.name,
        accessorKey: c.name,
        header: ({
          column,
        }: {
          column: DataTableColumn<ResourceDataSchema>
        }) => (
          <ResourceColumnHeader
            column={column}
            title={meta.field?.name ?? c.name}
            isSorted={column.getIsSorted()}
          />
        ),
        cell: ({ row }: { row: DataTableRow<ResourceDataSchema> }) => (
          <ResourceRowCell
            row={row}
            columnSchema={c}
            resourceSchema={resourceSchema}
          />
        ),
        size: 150,
        enableColumnFilter: true,
        enableSorting: true,
        enableHiding: true,
        meta,
      }
    }),
  ] as DataTableColumnDef<ResourceDataSchema>[]
}
