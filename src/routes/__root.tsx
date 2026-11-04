import { TanStackDevtools } from "@tanstack/react-devtools"
import type { QueryClient } from "@tanstack/react-query"
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools"
import {
  HeadContent,
  Outlet,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"

import { useEffect } from "react"

import { NuqsAdapter } from "nuqs/adapters/tanstack-router"

import { ThemeProvider } from "#/components/theme-provider"
import { Button } from "#/components/ui/button"
import { Toaster } from "#/components/ui/sonner"
import { Spinner } from "#/components/ui/spinner"
import { TooltipProvider } from "#/components/ui/tooltip"
import { authUserQueryOptions } from "#/lib/supabase/data/auth"
import {
  DEFAULT_APP_CONFIG,
  appConfigQueryOptions,
} from "#/lib/supabase/data/config"
import { userQueryOptions } from "#/lib/supabase/data/users"

import "../styles.css"

interface RouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async ({ context, location }) => {
    const [authUser, appConfig] = await Promise.all([
      context.queryClient.query({
        ...authUserQueryOptions,
        staleTime: "static",
      }),
      context.queryClient.query({
        ...appConfigQueryOptions(),
        staleTime: "static",
      }),
    ])
    if (!authUser && !location.pathname.startsWith("/auth")) {
      const segment = location.pathname.split("/")[1] ?? ""
      const isSchemaRoute =
        segment !== "" && !["account", "core", "storage"].includes(segment)
      if (!isSchemaRoute) {
        window.location.href = `/auth/sign-in?redirect=${encodeURIComponent(location.href)}`
        await new Promise<never>(() => {})
      }
    }
    const user = authUser
      ? await context.queryClient.query({
          ...userQueryOptions(authUser.id),
          staleTime: "static",
        })
      : null
    return { authUser, user, appConfig }
  },
  loader: ({ context }) => ({ appConfig: context.appConfig }),
  head: ({ loaderData }) => {
    const appConfig = loaderData?.appConfig ?? DEFAULT_APP_CONFIG
    return {
      meta: [
        { title: appConfig.name },
        { name: "description", content: appConfig.description },
      ],
    }
  },
  pendingMs: 0,
  pendingComponent: LoadingScreen,
  component: RootComponent,
  errorComponent: ErrorScreen,
})

function ErrorScreen({ error, reset }: ErrorComponentProps) {
  const router = useRouter()

  return (
    <div className="flex h-svh flex-col items-center justify-center gap-4">
      <p className="text-sm text-muted-foreground">
        {(error as Error)?.message ?? "An unexpected error occurred."}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            reset()
            router.invalidate()
          }}
        >
          Try again
        </Button>
        <Button variant="ghost" onClick={() => router.navigate({ to: "/" })}>
          Go home
        </Button>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="flex h-svh items-center justify-center">
      <Spinner className="size-6" />
    </div>
  )
}

function RootComponent() {
  const router = useRouter()

  /**
   * Intercept Supabase invite / password-recovery links.
   *
   * When a user clicks the invite email, Supabase appends a URL hash like:
   *   #access_token=...&refresh_token=...&type=invite
   *
   * The Supabase JS client auto-signs them in, but the app would then navigate
   * to "/" without ever letting them set a password. This effect detects the
   * hash on first mount and redirects to the update-password page instead.
   *
   * We also listen for the PASSWORD_RECOVERY auth event (triggered by
   * "Forgot password" links) so both flows land on the same form.
   */
  useEffect(() => {
    // 1. Check the URL hash on initial mount (covers invite & recovery links).
    const hash = window.location.hash
    if (hash) {
      const params = new URLSearchParams(hash.replace(/^#/, ""))
      const type = params.get("type")
      if (type === "invite" || type === "recovery") {
        // Strip the hash so it doesn't re-trigger on next render.
        history.replaceState(null, "", window.location.pathname + window.location.search)
        void router.navigate({ to: "/auth/update-password", replace: true })
        return
      }
    }

    // 2. Import supabase dynamically to avoid a circular-module issue in root.
    import("#/lib/supabase/client").then(({ supabase }) => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event) => {
          if (event === "PASSWORD_RECOVERY") {
            void router.navigate({ to: "/auth/update-password", replace: true })
          }
        }
      )
      return () => subscription.unsubscribe()
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <HeadContent />
      <NuqsAdapter>
        <ThemeProvider>
          <TooltipProvider>
            <Outlet />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </NuqsAdapter>
      <TanStackDevtools
        config={{
          position: "bottom-right",
        }}
        plugins={[
          {
            name: "TanStack Router",
            render: <TanStackRouterDevtoolsPanel />,
          },
          {
            name: "TanStack Query",
            render: <ReactQueryDevtoolsPanel />,
          },
        ]}
      />
    </>
  )
}
