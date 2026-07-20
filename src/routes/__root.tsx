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

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-vault-ivory px-4">
      <div className="max-w-md text-center">
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
      <div className="max-w-md text-center">
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

  return (
    <QueryClientProvider client={queryClient}>
      <AppShell>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </AppShell>
    </QueryClientProvider>
  );
}

/**
 * Sprint 0 application shell.
 *
 * Structural regions only — a fixed left navigation rail (kosha-navy) and a
 * top header (pure-white on vault-ivory). No real navigation items and no
 * business content yet; those arrive in Sprint 1.
 *
 * Rhythm follows Book 1 Layout Rhythm: Page(3xl) > Section(2xl) > Panel(xl).
 */
function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-vault-ivory text-kosha-navy">
      <div className="flex min-h-dvh">
        {/* Left navigation rail — placeholder, no items */}
        <aside
          aria-label="Primary navigation"
          className="hidden md:flex md:w-64 md:flex-col bg-kosha-navy text-vault-ivory"
        >
          <div className="flex h-20 items-center px-lg border-b border-white/5">
            <img
              src="/brand/mark-primary.svg"
              alt="Koshagra"
              className="h-8 w-8"
              width={32}
              height={32}
            />
            <span className="ml-sm font-display text-lg tracking-tight text-vault-ivory">
              Koshagra
            </span>
          </div>
          <nav className="flex-1 px-md py-lg" aria-label="Sections">
            {/* Sprint 1 will populate this region. */}
            <p className="px-sm text-xs uppercase tracking-widest text-vault-ivory/40">
              Navigation
            </p>
            <div className="mt-md h-2 w-3/4 rounded-sm bg-vault-ivory/5" />
            <div className="mt-sm h-2 w-2/3 rounded-sm bg-vault-ivory/5" />
            <div className="mt-sm h-2 w-1/2 rounded-sm bg-vault-ivory/5" />
          </nav>
          <div className="px-lg py-md text-xs text-vault-ivory/40">
            Sprint 0 · Foundation
          </div>
        </aside>

        {/* Right side: header + content */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-20 items-center justify-between border-b border-[color:var(--color-border-default)] bg-pure-white px-xl">
            <div className="flex items-center gap-md">
              <img
                src="/brand/lockup-horizontal-primary.svg"
                alt="Koshagra"
                className="h-8 w-auto md:hidden"
              />
              <span className="hidden md:inline text-sm text-slate-grey">
                Continuity workspace
              </span>
            </div>
            <div className="flex items-center gap-md">
              <span className="text-xs uppercase tracking-widest text-slate-grey">
                Foundation preview
              </span>
              <div
                aria-hidden
                className="h-9 w-9 rounded-full bg-vault-ivory ring-1 ring-[color:var(--color-border-default)]"
              />
            </div>
          </header>

          <main className="flex-1 px-xl py-2xl md:px-3xl md:py-3xl">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
