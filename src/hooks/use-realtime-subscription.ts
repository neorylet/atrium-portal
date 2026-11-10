import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { supabase } from "#/lib/supabase/client"

export function useRealtimeSubscription<T>({
  table,
  schema = "public",
  event = "*",
  filter,
  queryKey,
  enabled = true,
}: {
  table: string
  schema?: string
  event?: "*" | "INSERT" | "UPDATE" | "DELETE"
  filter?: string
  queryKey: unknown[]
  enabled?: boolean
}) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) return

    const channel = supabase
      .channel(`${table}-realtime-${JSON.stringify(filter)}`)
      .on("postgres_changes", { event, schema, table, filter }, () => {
        queryClient.invalidateQueries({ queryKey, exact: false })
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [table, schema, event, filter, queryKey, enabled, queryClient])
}
