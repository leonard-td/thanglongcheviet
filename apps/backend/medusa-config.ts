import path from "node:path"
import { createRequire } from "node:module"
import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const backendRequire = createRequire(path.join(process.cwd(), "package.json"))
const dashboardReactRouterDom = path.dirname(
  backendRequire.resolve("react-router-dom/package.json", {
    paths: [backendRequire.resolve("@medusajs/dashboard")],
  })
)

const isDockerDev = process.env.CHOKIDAR_USEPOLLING === "true"
// Docker + plain HTTP: production mode sets Secure cookies that browsers drop on http://localhost
const localHttpCookies = process.env.MEDUSA_COOKIE_SECURE === "false"
// In Docker, Vite file polling causes false-positive rebuilds on bind mounts → reload loop.
// Default to no admin HMR/watch unless explicitly opted in.
const disableAdminHmr =
  process.env.DISABLE_ADMIN_HMR === "true" ||
  (isDockerDev && process.env.ENABLE_ADMIN_HMR !== "true")

// The admin bundler's generated index.html has no <title> and a blank
// `data:,` favicon (see @medusajs/admin-bundler's writeHTMLFile) — this
// plugin's transformIndexHtml hook runs on that exact template (both in
// `medusa develop` and in the production build, since both go through the
// same Vite plugin pipeline) and swaps in the storefront's branding.
// The favicon file is served from /static (same static dir Medusa's local
// file provider already serves uploads from), not from src/admin, since the
// admin bundler treats src/admin as component source, not static assets.
// Also injects a noindex meta tag: the dashboard is proxied on the same
// public domain as the storefront (infra/nginx's `location /app/`) and
// robots.txt alone is only a crawl hint, not a guarantee against indexing
// a page linked from elsewhere — this makes the page self-declare
// non-indexable regardless of how it was reached. Rounds out the rest of
// the head (lang attribute, description, theme-color) to match the
// storefront's baseline — charset/viewport already ship in the bundler's
// base template, so those aren't duplicated here.
const adminBrandingPlugin = {
  name: "tlcv-admin-branding",
  transformIndexHtml(html: string) {
    return html
      .replace("<html>", '<html lang="vi">')
      .replace(
        '<link rel="icon" href="data:," data-placeholder-favicon />',
        '<link rel="icon" type="image/png" href="/static/branding-favicon.png" />'
      )
      .replace(
        "<head>",
        [
          "<head>",
          '            <meta name="robots" content="noindex, nofollow" />',
          '            <meta name="description" content="Trang quản trị nội bộ Thăng Long Chè Việt — không dành cho công khai." />',
          '            <meta name="theme-color" content="#c9a86c" />',
          "            <title>Thăng Long Chè Việt</title>",
        ].join("\n")
      )
  },
}

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // Each of the ~25 core modules opens its own Postgres pool at boot. The
    // default pool.min (2) makes every module eagerly open connections
    // simultaneously — a 50+ connection burst that Postgres over the WSL2
    // docker bridge sometimes can't establish fast enough, surfacing as
    // "Knex: Timeout acquiring a connection" during db:migrate. Lazy pools
    // (min: 0) plus a longer acquire timeout avoid the burst.
    databaseDriverOptions: {
      pool: { min: 0, max: 10, acquireTimeoutMillis: 60000 },
    },
    // Medusa forces a `Secure` session cookie whenever NODE_ENV=production,
    // so the admin dashboard only authenticates over HTTPS. Behind a real
    // TLS-terminating proxy that's exactly right — leave it. But when testing
    // the PROD stack locally over plain http://localhost:8800 the browser
    // silently drops the Secure cookie and every /admin call comes back 401.
    // Set COOKIE_SECURE=false in that case (LOCAL/HTTP ONLY — never on a real
    // internet-facing deployment).
    cookieOptions:
      process.env.COOKIE_SECURE === "false"
        ? { secure: false, sameSite: "lax" }
        : undefined,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
    ...(localHttpCookies
      ? {
          cookieOptions: {
            secure: false,
            sameSite: "lax" as const,
          },
        }
      : {}),
  },
  admin: {
    vite: () => ({
      server: {
        allowedHosts: true,
        hmr: disableAdminHmr
          ? false
          : {
              clientPort: Number(
                process.env.VITE_HMR_CLIENT_PORT || process.env.HTTP_PORT
              ) || 9000,
              protocol: "ws",
            },
        watch: disableAdminHmr
          ? null
          : {
              ignored: ["**/.medusa/**", "**/node_modules/**", "**/static/**"],
            },
      },
      optimizeDeps: {
        include: ["qs"],
      },
      resolve: {
        dedupe: ["react", "react-dom", "react-router-dom"],
        alias: {
          "react-router-dom": dashboardReactRouterDom,
        },
      },
      plugins: [adminBrandingPlugin],
    }),
  },
  plugins: [],
  modules: [
    {
      resolve: "@medusajs/medusa/rbac",
    },
    {
      resolve: "./src/modules/campaign",
    },
    {
      resolve: "./src/modules/inquiry",
    },
    {
      resolve: "./src/modules/event",
    },
    {
      resolve: "./src/modules/card",
    },
    {
      resolve: "./src/modules/navigation",
    },
    {
      resolve: "./src/modules/care-channel",
    },
    {
      resolve: "./src/modules/site-settings",
    },
    {
      resolve: "./src/modules/ask",
    },
    {
      resolve: "@medusajs/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/file-local",
            id: "local",
            options: {
              upload_dir: "static",
              // LocalFileService serves uploads from the "static" dir under a
              // "/static" URL path (its own default is
              // "http://localhost:9000/static") — this was missing the
              // "/static" segment, so every uploaded file's returned url
              // 404'd instead of resolving to the file it just wrote.
              backend_url: `${process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"}/static`,
            },
          },
        ],
      },
    },
  ],
  featureFlags: {
    rbac: true,
  },
})
