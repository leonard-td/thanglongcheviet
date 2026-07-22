export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const baseUrl = String(config.public.siteUrl || 'https://thanglongcheviet.vn').replace(/\/$/, '')

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
