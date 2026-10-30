import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";

import { Toaster } from "sonner";
import { AppShell } from "../components/AppShell";
import { PortfolioProvider, usePortfolio } from "../lib/store";
import { isLang, type Lang } from "../lib/i18n";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  const c = useErrorCopy();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{c.notFound}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{c.notFoundDescription}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {c.home}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  const c = useErrorCopy();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{c.errorTitle}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{c.errorDescription}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {c.retry}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {c.home}
          </a>
        </div>
      </div>
    </div>
  );
}

function useErrorCopy() {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    try {
      const preference: unknown = JSON.parse(localStorage.getItem("folio-state-v2") ?? "null");
      if (
        preference &&
        typeof preference === "object" &&
        "lang" in preference &&
        isLang(preference.lang)
      )
        setLang(preference.lang);
    } catch {
      // The English fallback remains usable when the local preference is unavailable.
    }
  }, []);
  return ERROR_COPY[lang];
}

function AssetRefreshNotice() {
  const p = usePortfolio();
  const c = ERROR_COPY[p.lang];
  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-3 bg-primary px-4 py-3 text-center text-sm text-primary-foreground shadow-lg"
    >
      <span>{c.updateAvailable}</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-full border border-current px-3 py-1 font-semibold"
      >
        {c.reload}
      </button>
    </div>
  );
}

const ERROR_COPY: Record<
  Lang,
  {
    notFound: string;
    notFoundDescription: string;
    errorTitle: string;
    errorDescription: string;
    retry: string;
    home: string;
    updateAvailable: string;
    reload: string;
  }
> = {
  en: {
    notFound: "Page not found",
    notFoundDescription: "The page you're looking for doesn't exist or has been moved.",
    errorTitle: "This page didn't load",
    errorDescription: "Something went wrong. You can try refreshing or head back home.",
    retry: "Try again",
    home: "Go home",
    updateAvailable: "A new version is available. Reload to continue.",
    reload: "Reload",
  },
  bg: {
    notFound: "Страницата не е намерена",
    notFoundDescription: "Страницата не съществува или е преместена.",
    errorTitle: "Страницата не се зареди",
    errorDescription: "Възникна проблем. Опитай отново или се върни към началото.",
    retry: "Опитай отново",
    home: "Към началото",
    updateAvailable: "Има нова версия. Презареди страницата, за да продължиш.",
    reload: "Презареди",
  },
  de: {
    notFound: "Seite nicht gefunden",
    notFoundDescription: "Die gesuchte Seite existiert nicht oder wurde verschoben.",
    errorTitle: "Diese Seite konnte nicht geladen werden",
    errorDescription:
      "Es ist ein Fehler aufgetreten. Versuche es erneut oder gehe zurück zur Startseite.",
    retry: "Erneut versuchen",
    home: "Startseite",
    updateAvailable: "Eine neue Version ist verfügbar. Lade die Seite neu, um fortzufahren.",
    reload: "Neu laden",
  },
  es: {
    notFound: "Página no encontrada",
    notFoundDescription: "La página no existe o se ha movido.",
    errorTitle: "No se pudo cargar esta página",
    errorDescription: "Se produjo un error. Inténtalo de nuevo o vuelve al inicio.",
    retry: "Reintentar",
    home: "Ir al inicio",
    updateAvailable: "Hay una nueva versión. Recarga la página para continuar.",
    reload: "Recargar",
  },
  it: {
    notFound: "Pagina non trovata",
    notFoundDescription: "La pagina non esiste o è stata spostata.",
    errorTitle: "Impossibile caricare la pagina",
    errorDescription: "Si è verificato un errore. Riprova o torna alla pagina iniziale.",
    retry: "Riprova",
    home: "Vai alla home",
    updateAvailable: "È disponibile una nuova versione. Ricarica la pagina per continuare.",
    reload: "Ricarica",
  },
};

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Capispot — Portfolio Tracker" },
      {
        name: "description",
        content: "Track your investment portfolio: net worth, allocation, holdings and dividends.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "CapiSpot" },
      { property: "og:image", content: "https://capispot.com/og.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://capispot.com/og.png" },
      { name: "theme-color", content: "#060914" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "Capispot" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
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
  const [assetRefreshRequired, setAssetRefreshRequired] = useState(false);

  useEffect(() => {
    const handlePreloadError = (event: Event) => {
      event.preventDefault();
      setAssetRefreshRequired(true);
    };
    const handleResourceError = (event: Event) => {
      const target = event.target;
      if (
        target instanceof HTMLScriptElement &&
        target.src.startsWith(`${window.location.origin}/assets/`)
      )
        setAssetRefreshRequired(true);
    };

    window.addEventListener("vite:preloadError", handlePreloadError);
    window.addEventListener("error", handleResourceError, true);
    return () => {
      window.removeEventListener("vite:preloadError", handlePreloadError);
      window.removeEventListener("error", handleResourceError, true);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <PortfolioProvider>
        {assetRefreshRequired && <AssetRefreshNotice />}
        <AppShell>
          <Outlet />
        </AppShell>
        <Toaster richColors position="bottom-right" />
      </PortfolioProvider>
    </QueryClientProvider>
  );
}
