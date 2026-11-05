import { useQuery } from "@tanstack/react-query"
import { supabase } from "#/lib/supabase/client"
import { Skeleton } from "#/components/ui/skeleton"

export function UserCell({ userId }: { userId: string }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ["supasheet-user", userId],
    queryFn: async () => {
      const { data } = await supabase
        .schema("supasheet")
        .from("users")
        .select("name, email")
        .eq("id", userId)
        .single()
      return data
    },
    enabled: !!userId,
  })

  if (isLoading) return <Skeleton className="h-4 w-24" />
  if (!user) return <span className="text-muted-foreground">{userId}</span>

  return <span>{user.name || user.email}</span>
}
