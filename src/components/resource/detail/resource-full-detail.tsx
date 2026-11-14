import { useMemo } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import {
  buildLayoutPlan,
  getProgressFields,
} from "#/components/resource/resource-form-utils"
import type {
  ColumnSchema,
  ResourceSchema,
  TableMetadata,
} from "#/lib/database-meta.types"
import { isTableSchema } from "#/lib/database-meta.types"
import { updateResourceMutationOptions } from "#/lib/supabase/data/resource"
import { toast } from "sonner"

import { Button } from "#/components/ui/button"
import { Textarea } from "#/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "#/components/ui/dialog"
import { useHasPermission } from "#/hooks/use-permissions"

import { ResourceDetailView } from "./resource-detail-view"
import { ResourceMetadataView } from "./resource-metadata-view"
import { ResourceProgressField } from "./resource-progress-field"
import { ResourceSectionDetail } from "./resource-section-detail"

type Props = {
  resourceSchema: ResourceSchema
  columnsSchema: ColumnSchema[]
  record: Record<string, unknown>
  showMetadata?: boolean
}

export function ResourceFullDetail({
  resourceSchema,
  columnsSchema,
  record,
  showMetadata = true,
}: Props) {
  const tableSchema = isTableSchema(resourceSchema) ? resourceSchema : null
  const schema = resourceSchema.schema ?? ""
  const resource = resourceSchema.name ?? ""
  
  const queryClient = useQueryClient()
  const isClient = !useHasPermission({ schema, resource, action: "insert" })
  const isDeliverables = resource === "deliverables"
  
  const { mutateAsync: updateRecord } = useMutation(
    updateResourceMutationOptions(schema, resource)
  )
  
  const handleApprove = async () => {
    try {
      await updateRecord({
        pk: { id: record.id },
        data: { status: "approved" }
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
        pk: { id: record.id },
        data: { status: "changes_requested", client_feedback: feedback }
      })
      queryClient.invalidateQueries({
        queryKey: ["supasheet", "resource-data", schema, resource],
      })
      toast.success("Changes requested")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to request changes")
    }
  }

  const { colByName, progressFields, filteredPlan } = useMemo(() => {
    const tableMeta = JSON.parse(
      resourceSchema.comment ?? "{}"
    ) as TableMetadata
    const availableNames = new Set(
      columnsSchema.map((c) => c.name ?? c.id ?? "")
    )
    const plan = buildLayoutPlan(
      tableMeta.fields?.sections,
      availableNames,
      "read"
    )
    const byName = new Map(columnsSchema.map((c) => [c.name ?? c.id ?? "", c]))
    const progress = getProgressFields(columnsSchema)
    const progressNames = new Set(progress.map(({ col }) => col.name))
    const filtered = plan
      ? {
          ...plan,
          sections: plan.sections
            .map((s) => ({
              ...s,
              fields: s.fields.filter((f) => !progressNames.has(f)),
            }))
            .filter((s) => s.fields.length > 0),
        }
      : plan
    return {
      colByName: byName,
      progressFields: progress,
      filteredPlan: filtered,
    }
  }, [resourceSchema.comment, columnsSchema])

  return (
    <div className="space-y-4">
      {progressFields.length > 0 && (
        <div className="space-y-4">
          {progressFields.map(({ col, meta }) => (
            <ResourceProgressField
              key={col.id}
              column={col}
              value={(record[col.name] as string | null) ?? null}
              enumMeta={meta}
            />
          ))}
        </div>
      )}
      {filteredPlan ? (
        <>
          {filteredPlan.sections.map((s) => (
            <ResourceSectionDetail
              key={s.id}
              section={s}
              colByName={colByName}
              tableSchema={tableSchema}
              record={record}
            />
          ))}
          {isClient && isDeliverables && record.status === 'in_review' && (
            <div className="flex gap-2 pt-4 border-t">
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
        </>
      ) : (
        <ResourceDetailView
          resourceSchema={resourceSchema}
          columnsSchema={columnsSchema}
          singleResourceData={record}
        />
      )}
      {showMetadata && (
        <ResourceMetadataView
          resourceSchema={resourceSchema}
          columnsSchema={columnsSchema}
          singleResourceData={record}
        />
      )}
    </div>
  )
}
