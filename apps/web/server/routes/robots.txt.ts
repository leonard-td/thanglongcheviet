export default defineEventHandler((event) => {
  // Derived from the request's own Host/X-Forwarded-Proto so the sitemap
  // link is correct for whichever domain crawled it.
  const baseUrl = getRequestURL(event).origin

  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /app',
    'Disallow: /admin',
    'Disallow: /gio-hang',
    'Disallow: /tai-khoan',
    'Disallow: /en/cart',
    'Disallow: /en/account',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    '',
  ].join('\n')

  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  return body
})
