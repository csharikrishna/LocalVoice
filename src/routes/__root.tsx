import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode } from "react";

import appCss from "../styles.css?url";
import { Nav } from "@/components/civic/Nav";
import { Footer } from "@/components/civic/Footer";
import { SEO } from "@/components/civic/SEO";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--bg)] px-4">
      <div className="max-w-md text-center">
        <p className="mb-4 text-xs uppercase tracking-[0.4em] text-slate-500">
          Page Not Found
        </p>

        <h1 className="text-8xl font-black tracking-tight text-slate-950">
          404
        </h1>

        <h2 className="mt-4 text-2xl font-semibold text-slate-900">
          We couldn't find that page
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          The page you're looking for may have been moved, deleted, or never
          existed.
        </p>

        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-medium text-white transition-all hover:opacity-90"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  console.error(error);

  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--bg)] px-4">
      <div className="max-w-md text-center">
        <p className="mb-4 text-xs uppercase tracking-[0.4em] text-slate-500">
          Unexpected Error
        </p>

        <h1 className="text-3xl font-bold text-slate-950">
          Something interrupted the experience
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          We couldn't load this page right now. Please try again in a moment.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition-all hover:opacity-90"
          >
            Try Again
          </button>

          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },

      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },

      {
        title: `${import.meta.env.VITE_APP_NAME || "LocalVoice"} — Smarter Communities Start With a Scan`,
      },

      {
        name: "description",
        content:
          "Transform civic reporting with QR-powered issue tracking. Report streetlights, roads, water leaks, garbage, and public infrastructure issues instantly.",
      },

      {
        name: "author",
        content: import.meta.env.VITE_APP_NAME || "LocalVoice",
      },

      {
        name: "theme-color",
        content: "#0f172a",
      },
    ],

    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },

      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },

      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },

      {
        rel: "stylesheet",
        href:
          "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Playfair+Display:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap",
      },

      {
        rel: "icon",
        href: "/favicon.ico",
      },

      {
        rel: "apple-touch-icon",
        href: "/apple-touch-icon.png",
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
        <SEO />
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
  const location = useLocation();

  const isPrintQr = location.pathname === "/print-qr";

  return (
    <QueryClientProvider client={queryClient}>
      <div className="relative min-h-screen bg-[color:var(--bg)] text-[color:var(--text-primary)] antialiased selection:bg-slate-950 selection:text-white">
        {/* Optional subtle texture layer */}
        <div className="pointer-events-none fixed inset-0 opacity-[0.015]" />

        {!isPrintQr && <Nav />}

        <main className="relative">
          <Outlet />
        </main>

        {!isPrintQr && <Footer />}
        <Toaster position="top-right" richColors />
      </div>
    </QueryClientProvider>
  );
}