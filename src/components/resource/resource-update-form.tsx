import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useStore } from "@tanstack/react-form"
import { useBlocker, useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"

import { toast } from "sonner"

import { Button } from "#/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog"
import { Alert, AlertDescription } from "#/components/ui/alert"
import type {
  ColumnSchema,
  PrimaryKey,
  TableMetadata,
  TableSchema,
} from "#/lib/database-meta.types"
import { updateResourceMutationOptions } from "#/lib/supabase/data/resource"

import { useAppForm } from "./form-hook"
import { ResourceFormLayout } from "./resource-form-layout"
import {
  buildUpdatePayload,
  getUpdateInitialValue,
  isSkippedForUpdate,
} from "./resource-form-utils"

interface ResourceUpdateFormProps {
  columnsSchema: ColumnSchema[]
  primaryKeys: PrimaryKey[]
  record: Record<string, unknown>
  tableSchema: TableSchema
  saveOnly?: boolean
  clientFeedback?: string | null
}

export function ResourceUpdateForm({
  columnsSchema,
  primaryKeys,
  record,
  tableSchema,
  saveOnly,
  clientFeedback,
}: ResourceUpdateFormProps) {
  const schema = tableSchema?.schema
  const resource = tableSchema?.name

  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const pk = Object.fromEntries(
    primaryKeys.map((k) => [k.name, record[k.name]])
  )

  const editableCols = columnsSchema.filter(
    (col) => !isSkippedForUpdate(col, primaryKeys) && (col.is_updatable ?? true)
  )

  const defaultValues = useMemo(() => 
    Object.fromEntries(
      editableCols.map((col) => [
        col.name ?? col.id,
        getUpdateInitialValue(col, record),
      ])
    ), [editableCols, record]
  )

  // Track the baseline for the dirty check
  const [baseline, setBaseline] = useState(defaultValues)

  // Sync baseline if the parent record refetches
  useEffect(() => {
    setBaseline(defaultValues)
  }, [defaultValues])

  const { mutateAsync: updateRow } = useMutation(
    updateResourceMutationOptions(schema, resource)
  )

  const behavior = (JSON.parse(tableSchema?.comment ?? "{}") as TableMetadata)
    .fields?.behavior

  const form = useAppForm({
    defaultValues,
    onSubmit: async ({ value, meta }) => {
      const data = buildUpdatePayload(value, editableCols, behavior)
      await updateRow({ pk, data })
      queryClient.invalidateQueries({
        queryKey: ["supasheet", "resource-data", schema, resource],
      })
      toast.success("Record updated")
      
      // THE FIX: Update baseline and reset form so it's no longer dirty
      setBaseline(value)
      form.reset({ values: value })

      if ((meta as { target?: string } | undefined)?.target === "close") {
        navigate({
          to: "/$schema/resource/$resource",
          params: { schema, resource },
        })
      }
    },
  })

  const isDirty = useStore(form.store, (s) => s.isDirty)
  const currentValues = useStore(form.store, (s) => s.values)
  
  // Compare against the baseline instead of the original defaultValues
  const isActuallyDirty = isDirty || JSON.stringify(currentValues) !== JSON.stringify(baseline)

  // 1. Block internal navigation
  const blocker = useBlocker({
    shouldBlockFn: () => isActuallyDirty,
    enableBeforeUnload: true,
    withResolver: true,
  })

  // 2. Block closing the browser tab
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isActuallyDirty) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isActuallyDirty])

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <ResourceFormLayout
          tableSchema={tableSchema}
          writableCols={editableCols}
          form={form}
          mode="update"
          headerTitle="Edit record"
          saveOnly={saveOnly}
          clientFeedback={clientFeedback}
        />
      </form>

      {/* --- UNSAVED CHANGES DIALOG --- */}
      {blocker.status === "blocked" && (
        <Dialog
          open={true}
          onOpenChange={(open) => {
            if (!open && blocker.reset) blocker.reset()
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unsaved Changes</DialogTitle>
              <DialogDescription>
                You have unsaved progress on this form. Are you sure you want to
                leave this page? Your changes will be lost.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => blocker.reset?.()}>
                Keep Editing
              </Button>
              <Button variant="destructive" onClick={() => blocker.proceed?.()}>
                Discard Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}