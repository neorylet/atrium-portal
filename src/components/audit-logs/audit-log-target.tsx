import { useQuery } from "@tanstack/react-query"
import { supabase } from "#/lib/supabase/client"
import { Skeleton } from "#/components/ui/skeleton"
import { Badge } from "#/components/ui/badge"
import { Link } from "@tanstack/react-router"
import { ExternalLink } from "lucide-react"

export function AuditLogTarget({ tableName, recordId }: { tableName: string, recordId: string | null }) {
  if (!recordId) return <span className="text-sm text-muted-foreground">No record ID</span>

  // If it's a deliverable, fetch the title, project, and org
  if (tableName === "deliverables") {
    return <DeliverableTarget id={recordId} />
  }

  // If it's a project, fetch the name and org
  if (tableName === "projects") {
    return <ProjectTarget id={recordId} />
  }

  // Fallback for other tables
  return <span className="font-mono text-xs text-muted-foreground">{recordId}</span>
}

function DeliverableTarget({ id }: { id: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["audit_target_deliverable", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliverables")
        .select("title, projects(name), organisations(name)")
        .eq("id", id)
        .single()
      if (error) return null
      return data
    },
  })

  if (isLoading) return <Skeleton className="h-5 w-48" />
  if (!data) return <span className="text-sm text-muted-foreground">Record deleted</span>

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm">{data.title}</span>
        <Link to="/public/resource/deliverables/$resourceId/detail" params={{ resourceId: id }} className="text-muted-foreground hover:text-foreground">
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">{data.projects?.name || "Unknown Project"}</Badge>
        <Badge variant="outline" className="px-1.5 py-0 text-[10px]">{data.organisations?.name || "Unknown Org"}</Badge>
      </div>
    </div>
  )
}

function ProjectTarget({ id }: { id: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["audit_target_project", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("name, organisations(name)")
        .eq("id", id)
        .single()
      if (error) return null
      return data
    },
  })

  if (isLoading) return <Skeleton className="h-5 w-48" />
  if (!data) return <span className="text-sm text-muted-foreground">Record deleted</span>

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm">{data.name}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="px-1.5 py-0 text-[10px]">{data.organisations?.name || "Unknown Org"}</Badge>
      </div>
    </div>
  )
}