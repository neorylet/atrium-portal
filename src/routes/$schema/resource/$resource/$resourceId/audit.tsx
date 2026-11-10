import { Suspense } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, notFound } from "@tanstack/react-router"

import { HistoryIcon } from "lucide-react"

import { DefaultHeader } from "#/components/layouts/default-header"
import { ResourceAuditTimeline } from "#/components/resource/audit/resource-audit-timeline"
import { ResourceRecordMenu } from "#/components/resource/resource-record-menu"
import { Skeleton } from "#/components/ui/skeleton"
import { hasResourcePermission } from "#/hooks/use-permissions"
import { isTableSchema, parseComment, type TableMetadata } from "#/lib/database-meta.types"
import { formatTitle } from "#/lib/format"
import { pageTitle } from "#/lib/page-title"
import { userPermissionsQueryOptions } from "#/lib/supabase/data/core"
import { resourceAuditLogsQueryOptions, singleResourceDataQueryOptions } from "#/lib/supabase/data/resource"

export const Route = createFileRoute(
  "/$schema/resource/$resource/$resourceId/audit"
)({
  beforeLoad: async ({ context }) => {
    const auditPermissions = context.authUser
      ? await context.queryClient.query({
          ...userPermissionsQueryOptions("supasheet"),
          staleTime: "static",
        })
      : null
    const hasAudit = hasResourcePermission(auditPermissions, {
      schema: "supasheet",
      resource: "audit_logs",
      action: "select",
    })
    if (!hasAudit) throw notFound()
    const tableSchema = isTableSchema(context.resourceSchema)
      ? context.resourceSchema
      : null
    if (!tableSchema) throw notFound()
    return { tableSchema }
  },
  loader: async ({ context, params: { schema, resource, resourceId } }) => {
    const tableSchema = isTableSchema(context.resourceSchema)
      ? context.resourceSchema
      : null

    // Fetch the record to get its title for the header
    if (tableSchema) {
      const primaryKeys = tableSchema.primary_keys ?? []
      const pk = Object.fromEntries(
        primaryKeys.map((k) => [k.name, resourceId])
      )
      const tableMeta = parseComment<TableMetadata>(tableSchema.comment, {})
      await context.queryClient.ensureQueryData(
        singleResourceDataQueryOptions(schema, resource, pk, tableMeta.query)
      )
    }

    context.queryClient.query({
      ...resourceAuditLogsQueryOptions(schema, resource, resourceId),
      staleTime: "static",
    })
  },
  head: ({ params }) => ({
    meta: [
      {
        title: pageTitle(`Audit | ${formatTitle(params.resource)}`),
      },
    ],
  }),
  pendingComponent: PendingComponent,
  component: RouteComponent,
})

function PendingComponent() {
  const { schema, resource, resourceId } = Route.useParams()

  return (
    <>
      <DefaultHeader
        breadcrumbs={[
          {
            title: formatTitle(resource),
            url: `/${schema}/resource/${resource}/table`,
          },
          {
            title: resourceId.slice(0, 8) + "…",
            url: `/${schema}/resource/${resource}/${resourceId}/detail`,
          },
          { title: "Audit Log" },
        ]}
      />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col p-4">
          <div className="mx-auto w-full max-w-2xl space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="mt-1 h-3.5 w-3.5 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2 rounded-lg border p-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function AuditTimelineBody() {
  const { schema, resource, resourceId } = Route.useParams()

  const { data: logs } = useSuspenseQuery(
    resourceAuditLogsQueryOptions(schema, resource, resourceId)
  )

  return <ResourceAuditTimeline logs={logs} />
}

function RouteComponent() {
  const { schema, resource, resourceId } = Route.useParams()
  const { tableSchema } = Route.useRouteContext()

  // Fetch the record to get its title
  const primaryKeys = tableSchema?.primary_keys ?? []
  const pk = Object.fromEntries(primaryKeys.map((k) => [k.name, resourceId]))
  const tableMeta = parseComment<TableMetadata>(tableSchema?.comment ?? "", {})
  const { data: record } = useSuspenseQuery(
    singleResourceDataQueryOptions(schema, resource, pk, tableMeta.query)
  )

  // Get the title column from metadata
  const titleColumn = tableMeta.detail?.header?.title ?? "title"
  const recordTitle =
    record && typeof record === "object" && !("message" in record)
      ? String((record as Record<string, unknown>)[titleColumn] ?? "")
      : undefined

  const resourceTitle = tableSchema?.comment
    ? (() => {
        try {
          const meta = JSON.parse(tableSchema.comment)
          return meta.label ?? formatTitle(resource)
        } catch {
          return formatTitle(resource)
        }
      })()
    : formatTitle(resource)

  return (
    <>
      <DefaultHeader
        breadcrumbs={[
          {
            title: resourceTitle,
            url: `/${schema}/resource/${resource}/table`,
          },
          {
            title: recordTitle ?? resourceId.slice(0, 8) + "…",
            url: `/${schema}/resource/${resource}/${resourceId}/detail`,
          },
          { title: "Audit Log" },
        ]}
      >
        <ResourceRecordMenu
          schema={schema}
          resource={resource}
          resourceId={resourceId}
        />
      </DefaultHeader>
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col p-4">
          <div className="mx-auto w-full max-w-2xl">
            <div className="mb-4 flex items-center gap-2">
              <HistoryIcon className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium text-muted-foreground">
                Change history for{" "}
                <span className="text-foreground font-semibold">
                  {recordTitle ?? resourceId.slice(0, 8) + "…"}
                </span>
              </h2>
            </div>
            <Suspense fallback={null}>
              <AuditTimelineBody />
            </Suspense>
          </div>
        </div>
      </div>
    </>
  )
}
