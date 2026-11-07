import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"

import { Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { ResourceRowActions } from "#/components/resource/resource-row-actions"
import { ConfirmDeleteDialog } from "#/components/shared/confirm-delete-dialog"
import { Badge } from "#/components/ui/badge"
import { Button } from "#/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select"
import { useConfirmAction } from "#/hooks/use-confirm-action"
import { useHasPermission } from "#/hooks/use-permissions"
import { getColumnMetadata } from "#/lib/columns"
import type {
  ColumnSchema,
  ResourceSchema,
  TableMetadata,
} from "#/lib/database-meta.types"
import { isTableSchema } from "#/lib/database-meta.types"
import {
  deleteResourceMutationOptions,
  resourceActionsQueryOptions,
  updateResourceMutationOptions,
} from "#/lib/supabase/data/resource"

import { AllCells } from "../cells/all-cells"

type Props = {
  resourceSchema: ResourceSchema
  columnsSchema: ColumnSchema[]
  record: Record<string, unknown>
  fallbackId: string
}

export function ResourceDetailHeader({
  resourceSchema,
  columnsSchema,
  record,
  fallbackId,
}: Props) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const schema = resourceSchema.schema
  const resource = resourceSchema.name
  const primaryKeys = isTableSchema(resourceSchema)
    ? (resourceSchema.primary_keys ?? [])
    : []

  const hasDeletePermission = useHasPermission({ schema, resource, action: "delete" })
  const canDelete = primaryKeys.length > 0 && hasDeletePermission

  const canUpdate = useHasPermission({ schema, resource, action: "update" })

  const { mutateAsync: deleteRow } = useMutation(
    deleteResourceMutationOptions(schema, resource)
  )
  
  const { mutateAsync: updateRow } = useMutation(
    updateResourceMutationOptions(schema, resource)
  )

  const pk = Object.fromEntries(
    primaryKeys.map((key) => [key.name, record[key.name]])
  )

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateRow({ pk, data: { status: newStatus } })
      queryClient.invalidateQueries({
        queryKey: ["supasheet", "resource-data", schema, resource],
      })
      toast.success("Status updated")
    } catch (err) {
      toast.error("Failed to update status")
    }
  }

  const deleteConfirm = useConfirmAction<true>(async () => {
    try {
      await deleteRow(pk)
      queryClient.invalidateQueries({
        queryKey: ["supasheet", "resource-data", schema, resource],
      })
      toast.success("Record deleted")
      navigate({
        to: "/$schema/resource/$resource",
        params: { schema, resource },
      })
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete record"
      )
    }
  })

  const detailMeta = (
    JSON.parse(resourceSchema.comment ?? "{}") as TableMetadata
  ).detail?.header

  const colByName = new Map(columnsSchema.map((c) => [c.name ?? c.id ?? "", c]))

  const titleKey = detailMeta?.title || "title"
  const titleValue = record[titleKey] || record.title || record.name
  const hasTitle = titleValue != null && titleValue !== ""
  const heading = hasTitle ? String(titleValue) : fallbackId

  // Extract status for the dropdown
  const statusCol = colByName.get("status")
  const currentStatus = record.status as string | null
  const statusMeta = statusCol ? getColumnMetadata(resourceSchema, statusCol) : null
  
  // FALLBACK: If metadata fails, hardcode the project statuses
  const statusValues = statusMeta?.values 
    ? Object.keys(statusMeta.values) 
    : ["planning", "active", "on_hold", "completed", "archived"]

  const { data: actions = [] } = useQuery(
    resourceActionsQueryOptions(
      resourceSchema.schema as never,
      resourceSchema.name
    )
  )

  return (
    <div className="mb-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <h1 className="truncate text-xl font-bold tracking-tight">{heading}</h1>
          
          {/* STATUS DROPDOWN */}
          {statusCol && canUpdate && (
            <div className="flex items-center gap-2">
              <Select value={currentStatus || ""} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-7 w-[140px] text-xs capitalize">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusValues.map((val) => (
                    <SelectItem key={val} value={val} className="text-xs capitalize">
                      {val.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ResourceRowActions
            schema={resourceSchema.schema}
            resource={resourceSchema.name}
            record={record}
            actions={actions}
            columnsSchema={columnsSchema}
            variant="menu"
          />
          {canDelete && (
            <Button
              size="sm"
              variant="destructive"
              className="px-2 sm:px-2.5"
              onClick={() => deleteConfirm.request(true)}
            >
              <Trash2Icon />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          )}
        </div>
      </div>

      <ConfirmDeleteDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => !open && deleteConfirm.cancel()}
        onConfirm={deleteConfirm.confirm}
        title="Delete record?"
        pending={deleteConfirm.pending}
      />
    </div>
  )
}