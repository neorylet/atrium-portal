import { format, formatDistanceToNow } from "date-fns"
import { ArrowRight, CheckCircle, Clock, XCircle } from "lucide-react"

import { UserCell } from "#/components/resource/cells/user-cell"
import { Badge } from "#/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card"
import type { Tables } from "#/lib/database.types"
import { AuditLogTarget } from "./audit-log-target"

type AuditLog = Tables<{ schema: "supasheet" }, "audit_logs">

export function AuditLogDetail({ data }: { data: AuditLog }) {
  const isUpdate = data.operation === "UPDATE"
  const isInsert = data.operation === "INSERT"
  const isDelete = data.operation === "DELETE"

  const changedFields = (data.changed_fields as string[]) || []
  const oldData = (data.old_data as Record<string, unknown>) || {}
  const newData = (data.new_data as Record<string, unknown>) || {}

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-12">
      {/* Header Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${isUpdate ? 'bg-blue-500/10 text-blue-500' : isInsert ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                {data.is_error ? <XCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
              </div>
              <div>
                <CardTitle className="text-xl">
                  {isUpdate ? "Record Updated" : isInsert ? "Record Created" : "Record Deleted"}
                </CardTitle>
                <CardDescription className="flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(data.created_at), { addSuffix: true })}
                  <span className="mx-1">•</span>
                  {format(new Date(data.created_at), "PPP 'at' p")}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">User</p>
              <div className="flex items-center gap-2">
                {data.created_by ? <UserCell userId={data.created_by} /> : <span className="text-sm">System Automation</span>}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Action</p>
              <Badge variant="outline" className="font-mono">{data.operation}</Badge>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Target Record</p>
              <AuditLogTarget tableName={data.table_name} recordId={data.record_id} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What Changed (The Diff) */}
      {isUpdate && changedFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What Changed</CardTitle>
            <CardDescription>The following fields were modified</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {changedFields.map((field) => {
              if (["updated_at", "updated_by", "created_at", "created_by"].includes(field)) return null;
              const oldVal = oldData[field];
              const newVal = newData[field];
              if (oldVal === newVal) return null;

              return (
                <div key={field} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 p-3 rounded-lg bg-muted/50 border">
                  <div className="w-32 shrink-0">
                    <p className="font-mono text-sm font-medium">{field}</p>
                  </div>
                  <div className="flex flex-1 items-center gap-3 text-sm overflow-hidden">
                    <span className="line-through text-red-500/70 truncate max-w-[200px]">
                      {oldVal === null || oldVal === undefined || oldVal === "" ? "empty" : String(oldVal)}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-green-600 font-medium truncate max-w-[200px]">
                      {newVal === null || newVal === undefined || newVal === "" ? "empty" : String(newVal)}
                    </span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Subtle Developer Payload */}
      <details className="group [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors px-2 py-1">
          <span className="font-mono">View raw database payload</span>
          <ArrowRight className="h-3 w-3 transition-transform group-open:rotate-90" />
        </summary>
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
          <div>
            <p className="text-[10px] font-mono mb-1 text-red-500/70">OLD_DATA</p>
            <pre className="text-[10px] bg-muted/30 p-2 rounded-md overflow-auto max-h-48 text-muted-foreground/80 font-mono">
              {JSON.stringify(data.old_data, null, 2) || "null"}
            </pre>
          </div>
          <div>
            <p className="text-[10px] font-mono mb-1 text-green-500/70">NEW_DATA</p>
            <pre className="text-[10px] bg-muted/30 p-2 rounded-md overflow-auto max-h-48 text-muted-foreground/80 font-mono">
              {JSON.stringify(data.new_data, null, 2) || "null"}
            </pre>
          </div>
        </div>
      </details>
    </div>
  )
}