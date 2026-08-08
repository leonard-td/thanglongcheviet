export default defineEventHandler((event) => {
  // Derived from the request's own Host/X-Forwarded-Proto so the sitemap
  // link is correct for whichever domain crawled it.
  const baseUrl = getRequestURL(event).origin

  const body = [
    'User-agent: *',
    'Allow: /',
    // /app is the actual Medusa admin dashboard UI (see infra/nginx's
    // location /app/); /admin is just the JSON API behind it. Both are
    // proxied on this same public domain, so both need disallowing.
    'Disallow: /admin',
    'Disallow: /app',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ].join('\n')

  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  return body
})
