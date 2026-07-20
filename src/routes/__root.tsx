import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-vault-ivory px-4">
      <div className="max-w-[28rem] text-center">
        <h1 className="numeral text-7xl text-kosha-navy">404</h1>
        <h2 className="mt-4 text-xl text-kosha-navy">Page not found</h2>
        <p className="mt-2 text-sm text-slate-grey">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-kosha-navy px-4 py-2 text-sm font-semibold text-vault-ivory transition-colors hover:bg-kosha-navy/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-vault-ivory px-4">
      <div className="max-w-[28rem] text-center">
        <h1 className="text-xl text-kosha-navy">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-slate-grey">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-kosha-navy px-4 py-2 text-sm font-semibold text-vault-ivory transition-colors hover:bg-kosha-navy/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-[color:var(--color-border-default)] bg-pure-white px-4 py-2 text-sm font-semibold text-kosha-navy transition-colors hover:bg-vault-ivory"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Koshagra — Institutional Continuity Platform" },
      { name: "description", content: "Koshagra is an institutional operating system for multi-generational continuity." },
      { name: "author", content: "Koshagra" },
      { name: "theme-color", content: "#0A1628" },
      { property: "og:title", content: "Koshagra — Institutional Continuity Platform" },
      { property: "og:description", content: "Koshagra is an institutional operating system for multi-generational continuity." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Koshagra — Institutional Continuity Platform" },
      { name: "twitter:description", content: "Koshagra is an institutional operating system for multi-generational continuity." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/76f591be-b329-4de1-a6ac-848ab244c7df/id-preview-aca98484--0c5e0a41-a58b-41bc-b767-cf051ec86469.lovable.app-1784532238629.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/76f591be-b329-4de1-a6ac-848ab244c7df/id-preview-aca98484--0c5e0a41-a58b-41bc-b767-cf051ec86469.lovable.app-1784532238629.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", type: "image/svg+xml", href: "/brand/app-icon.svg" },
      { rel: "apple-touch-icon", href: "/brand/app-icon.svg" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Montserrat:wght@600&family=Source+Sans+3:wght@400;600&family=IBM+Plex+Mono:wght@500&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* The workspace shell now lives in _authenticated/route.tsx.
          Public routes (/, /auth, /reset-password, /style-guide) render bare. */}
      <Outlet />
    </QueryClientProvider>
  );
}
