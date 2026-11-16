import { useCallback, useEffect, useMemo, useState } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"

import { AlignStartHorizontalIcon } from "lucide-react"
import { toast } from "sonner"

import { DynamicIcon } from "#/components/resource/resource-definition-utils"
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
} from "#/components/reui/kanban"
import type { KanbanCommitMeta } from "#/components/reui/kanban"
import { Badge } from "#/components/ui/badge"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "#/components/ui/empty"
import type { ResourceSchema } from "#/lib/database-meta.types"
import { isTableSchema } from "#/lib/database-meta.types"
import { getErrorMessage } from "#/lib/errors"
import type { EnumBadgeMeta } from "#/lib/fields"
import { getPkValue } from "#/lib/fields"
import { updateResourceMutationOptions } from "#/lib/supabase/data/resource"

const PROJECT_STATUSES = [
  "planning",
  "active",
  "on_hold",
  "completed",
  "archived",
] as const

export interface KanbanViewData {
  title: string | null
  description: string | null
  badge: string | null
  badgeIcon?: EnumBadgeMeta["icon"]
  badgeVariant?: EnumBadgeMeta["variant"]
  date: string | null
  data: Record<string, unknown>
}

export type KanbanViewReducedData = Record<string, KanbanViewData[]>

/**
 * The set of column keys that are allowed to exist for this board.
 * - projects grouped by status -> the project_status enum, hardcoded
 * - anything else (e.g. deliverables, which DO have "approved") -> groupValues
 * Returns null when nothing is known, meaning "don't filter".
 */
function getAllowedColumns(
  resource: string,
  groupBy: string,
  groupValues: string[]
): string[] | null {
  if (resource === "projects" && groupBy === "status") {
    return [...PROJECT_STATUSES]
  }
  return groupValues.length > 0 ? groupValues : null
}

function seedGroupColumns(
  data: KanbanViewReducedData,
  allowed: string[] | null
): KanbanViewReducedData {
  const seeded: KanbanViewReducedData = {}

  if (allowed) {
    // Strict: only allowed keys, in allowed order. Anything else in `data` is ignored.
    for (const value of allowed) {
      seeded[value] = data[value] ?? []
    }
    return seeded
  }

  // No allow-list available: pass data through untouched.
  for (const [value, tasks] of Object.entries(data)) {
    seeded[value] = tasks
  }
  return seeded
}

export function ResourceKanban({
  data,
  resourceSchema,
  groupBy,
  groupValues = [],
  groupMeta = {},
  readOnly = false,
}: {
  data: KanbanViewReducedData
  resourceSchema: ResourceSchema
  groupBy: string
  groupValues?: string[]
  groupMeta?: Record<string, EnumBadgeMeta>
  readOnly?: boolean
}) {
  const schema = resourceSchema.schema ?? ""
  const resource = resourceSchema.name ?? ""
  const primaryKeys = isTableSchema(resourceSchema)
    ? (resourceSchema.primary_keys ?? [])
    : []

  const column = groupBy || "status"

  // Stable key so the effect below doesn't re-fire on every render
  const groupValuesKey = groupValues.join("|")
  const allowed = useMemo(
    () => getAllowedColumns(resource, column, groupValues),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [resource, column, groupValuesKey]
  )

  const navigate = useNavigate({
    from: "/$schema/resource/$resource/kanban/$kanbanId",
  })
  const queryClient = useQueryClient()

  const [columns, setColumns] = useState<KanbanViewReducedData>(() =>
    seedGroupColumns(data, allowed)
  )

  useEffect(() => {
    // Diagnostic: shows exactly which keys the parent is handing us.
    // If "approved" appears here, the leak is upstream of this component.
    console.debug(
      "[kanban] resource:",
      resource,
      "groupBy:",
      column,
      "data keys:",
      Object.keys(data)
    )
    setColumns(seedGroupColumns(data, allowed))
  }, [data, allowed, resource, column])

  const { mutate: updateResource } = useMutation(
    updateResourceMutationOptions(schema, resource)
  )

  const buildId = useCallback(
    (item: KanbanViewData) =>
      primaryKeys.map((pk) => String(item.data[pk.name] ?? "")).join("/"),
    [primaryKeys]
  )

  const handleValueCommit = useCallback(
    (next: KanbanViewReducedData, meta: KanbanCommitMeta<KanbanViewData>) => {
      if (meta.kind !== "item" || meta.activeContainer === meta.overContainer) {
        return
      }

      const target = meta.overContainer
      if (allowed && !allowed.includes(target)) {
        toast.error(`"${target}" is not a valid stage.`)
        setColumns(meta.previousValue)
        return
      }

      const prevIds = new Set((meta.previousValue[target] ?? []).map(buildId))
      const item = (next[target] ?? []).find((i) => !prevIds.has(buildId(i)))
      if (!item) return

      const pk = Object.fromEntries(
        primaryKeys.map((f) => [f.name, item.data[f.name]])
      )
      const originalStatus = meta.activeContainer

      updateResource(
        { pk, data: { [column]: target } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({
              queryKey: ["supasheet", "resource-data", schema, resource],
            })
            toast.success(`Moved to ${target.replace(/_/g, " ")}`, {
              action: {
                label: "Undo",
                onClick: () => {
                  updateResource(
                    { pk, data: { [column]: originalStatus } },
                    {
                      onSuccess: () => {
                        queryClient.invalidateQueries({
                          queryKey: [
                            "supasheet",
                            "resource-data",
                            schema,
                            resource,
                          ],
                        })
                        toast.success("Move undone")
                      },
                    }
                  )
                },
              },
            })
          },
          onError: (err) => {
            setColumns(meta.previousValue)
            toast.error(getErrorMessage(err, "Failed to update record"))
          },
        }
      )
    },
    [
      allowed,
      column,
      resource,
      primaryKeys,
      updateResource,
      queryClient,
      buildId,
      setColumns,
    ]
  )

  const hasNoData =
    Object.keys(columns).length === 0 ||
    Object.values(columns).every((tasks) => tasks.length === 0)

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-2">
        {hasNoData ? (
          <Empty className="min-h-[400px] border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <AlignStartHorizontalIcon />
              </EmptyMedia>
              <EmptyTitle>No items to display</EmptyTitle>
              <EmptyDescription>
                There are no items available in this kanban view.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Kanban
            className="flex min-h-0 flex-1 flex-col"
            value={columns}
            onValueChange={setColumns}
            onValueCommit={readOnly ? undefined : handleValueCommit}
            getItemValue={buildId}
          >
            <KanbanBoard className="flex min-h-0 flex-1 flex-row overflow-x-auto">
              {Object.entries(columns).map(([columnValue, tasks]) => {
                const meta = groupMeta[columnValue]
                const humanLabel = columnValue
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())

                return (
                  <KanbanColumn
                    key={columnValue}
                    value={columnValue}
                    className="flex w-[300px] min-w-[300px] shrink-0 flex-col gap-2 rounded-lg border bg-card p-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DynamicIcon iconName={meta?.icon} />
                        <span className="text-sm font-semibold">
                          {humanLabel}
                        </span>
                        <Badge
                          variant={meta?.variant ?? "secondary"}
                          className="pointer-events-none rounded-sm"
                        >
                          {tasks.length}
                        </Badge>
                      </div>
                    </div>
                    <KanbanColumnContent
                      value={columnValue}
                      className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-0.5"
                    >
                      {tasks.map((task) => {
                        const resourceId = getPkValue(task.data, primaryKeys)
                        return (
                          <KanbanItem
                            key={buildId(task)}
                            value={buildId(task)}
                            disabled={readOnly}
                          >
                            <KanbanItemHandle
                              className="block cursor-pointer rounded-lg bg-card p-3 shadow-xs ring-1 ring-foreground/10"
                              onClick={() =>
                                navigate({
                                  to: "/$schema/resource/$resource/$resourceId/detail",
                                  params: { schema, resource, resourceId },
                                })
                              }
                            >
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="line-clamp-1 text-sm font-medium">
                                    {task.title ?? "Untitled"}
                                  </span>
                                  {task.badge && (
                                    <Badge
                                      variant={task.badgeVariant}
                                      className="pointer-events-none h-5 px-1.5 text-[11px]"
                                    >
                                      <DynamicIcon iconName={task.badgeIcon} />
                                      {task.badge}
                                    </Badge>
                                  )}
                                </div>
                                {task.data.organisations?.name && (
                                  <span className="w-fit rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                                    {task.data.organisations.name}
                                  </span>
                                )}
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  {task.description && (
                                    <span className="line-clamp-1">
                                      {task.description}
                                    </span>
                                  )}
                                  {task.date && (
                                    <time className="text-[10px] whitespace-nowrap tabular-nums">
                                      {new Date(task.date).toDateString()}
                                    </time>
                                  )}
                                </div>
                              </div>
                            </KanbanItemHandle>
                          </KanbanItem>
                        )
                      })}
                    </KanbanColumnContent>
                  </KanbanColumn>
                )
              })}
            </KanbanBoard>
            <KanbanOverlay>
              <div className="size-full rounded-md bg-primary/10" />
            </KanbanOverlay>
          </Kanban>
        )}
      </div>
    </>
  )
}
