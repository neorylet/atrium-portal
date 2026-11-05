import { useMutation, useQueryClient } from "@tanstack/react-query"

import { Editor } from "#/components/editor/editor-md"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card"
import { Label } from "#/components/ui/label"
import { Button } from "#/components/ui/button"
import { Textarea } from "#/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "#/components/ui/dialog"
import { useHasPermission } from "#/hooks/use-permissions"
import { getColumnMetadata } from "#/lib/columns"
import type {
  ColumnSchema,
  ResourceSchema,
  TableMetadata,
} from "#/lib/database-meta.types"
import { getMetaFields, isTableSchema } from "#/lib/database-meta.types"
import { formatTitle } from "#/lib/format"
import { updateResourceMutationOptions } from "#/lib/supabase/data/resource"
import type { FileObject } from "#/types/fields"
import { toast } from "sonner"

import { AllCells } from "../cells/all-cells"
import { getColumnFieldSpan } from "../resource-form-utils"
import { ResourceAvatarDisplay } from "./resource-avatar-display"
import { ResourceFileDisplay } from "./resource-file-display"

export function ResourceDetailView({
  resourceSchema,
  columnsSchema,
  singleResourceData,
}: {
  resourceSchema: ResourceSchema
  columnsSchema: ColumnSchema[]
  singleResourceData: Record<string, unknown>
}) {
  const queryClient = useQueryClient()
  const schema = resourceSchema.schema ?? ""
  const resource = resourceSchema.name ?? ""
  const tableSchema = isTableSchema(resourceSchema) ? resourceSchema : null
  
  const isClient = !useHasPermission({ schema, resource, action: "update" })
  const isDeliverables = resource === "deliverables"
  
  const { mutateAsync: updateRecord } = useMutation(
    updateResourceMutationOptions(schema, resource)
  )
  
  const handleApprove = async () => {
    try {
      await updateRecord({
        pk: { id: singleResourceData.id },
        data: {
          status: "approved"
        }
      })
      queryClient.invalidateQueries({
        queryKey: ["supasheet", "resource-data", schema, resource],
      })
      toast.success("Deliverable approved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve")
    }
  }
  
  const handleRequestChanges = async (feedback: string) => {
    try {
      await updateRecord({
        pk: { id: singleResourceData.id },
        data: {
          status: "changes_requested",
          client_feedback: feedback
        }
      })
      queryClient.invalidateQueries({
        queryKey: ["supasheet", "resource-data", schema, resource],
      })
      toast.success("Changes requested")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to request changes")
    }
  }
  
  if (Object.keys(singleResourceData).length === 0) return null
  const detailColumns =
    columnsSchema?.filter((column) => {
      const name = column.name
      // Hide client_feedback for clients in deliverables (they have a dedicated UI below)
      if (isClient && isDeliverables && name === "client_feedback") return false
      return !getMetaFields(resourceSchema).includes(name)
    }) ?? []

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle>
              {(JSON.parse(resourceSchema.comment ?? "{}") as TableMetadata)
                .name ?? formatTitle(resourceSchema.name)}
            </CardTitle>
            <CardDescription>
              View resource details and properties
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 py-4 md:grid-cols-2">
        {detailColumns.map((column) => {
          const value = singleResourceData?.[column.name]

          const columnMetadata = getColumnMetadata(tableSchema, column)
          const span = getColumnFieldSpan(column, tableSchema)

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
              
              {/* THE FIX: Look for updated_by_name instead of users.name */}
              {column.name === "client_feedback" && (singleResourceData as any)?.updated_by_name && (
                <p className="text-xs text-muted-foreground mb-1">
                  Last updated by: {(singleResourceData as any).updated_by_name}
                </p>
              )}

              <div className="text-sm text-muted-foreground">
                {value ? (
                  columnMetadata.variant === "rich_text" ? (
                    <Editor
                      name={columnMetadata.name}
                      value={value as string}
                      disabled
                    />
                  ) : columnMetadata.variant === "file" ? (
                    <ResourceFileDisplay value={value as FileObject[]} />
                  ) : columnMetadata.variant === "avatar" ? (
                    <ResourceAvatarDisplay
                      value={(value as FileObject | null) ?? null}
                    />
                  ) : (
                    <AllCells columnMetadata={columnMetadata} value={value} record={singleResourceData} />
                  )
                ) : (
                  <div className="text-muted">N/A</div>
                )}
              </div>
            </div>
          )
        })}
        
        {/* Client Review Workflow for Deliverables */}
        {isClient && isDeliverables && (
          <div className="md:col-span-2 flex gap-2 mt-4 pt-4 border-t">
            <Button onClick={handleApprove} className="flex-1">
              Approve
            </Button>
            <Dialog>
              <DialogTrigger render={<Button variant="outline" className="flex-1">Request Changes</Button>} />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Changes</DialogTitle>
                </DialogHeader>
                <Textarea
                  placeholder="Please describe the changes needed..."
                  className="min-h-[120px]"
                  id="changes-feedback"
                />
                <DialogFooter>
                  <DialogTrigger render={<Button variant="outline">Cancel</Button>} />
                  <Button
                    onClick={() => {
                      const textarea = document.getElementById('changes-feedback') as HTMLTextAreaElement
                      if (textarea?.value.trim()) {
                        handleRequestChanges(textarea.value.trim())
                      }
                    }}
                  >
                    Submit
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  )
}