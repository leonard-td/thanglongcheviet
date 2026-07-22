/**
 * Strip dangerous HTML from admin/CMS content before v-html.
 * Allows a small safe subset of tags; removes scripts, event handlers, and
 * javascript: URLs. Prefer TipTap JSON → HTML for new content.
 */
const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'blockquote', 'a', 'img', 'span', 'div',
])

export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return ''

  let html = String(input)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/on\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')

  html = html.replace(/<\/?([a-z0-9-]+)([^>]*)>/gi, (full, tag: string, attrs: string) => {
    const name = tag.toLowerCase()
    const closing = full.startsWith('</')
    if (!ALLOWED_TAGS.has(name)) return ''
    if (closing) return `</${name}>`

    if (name === 'a') {
      const hrefMatch = attrs.match(/href\s*=\s*(['"])(.*?)\1/i)
      const href = hrefMatch?.[2] ?? ''
      if (!/^(https?:\/\/|\/|mailto:|tel:)/i.test(href)) return '<a>'
      return `<a href="${href.replace(/"/g, '&quot;')}" rel="noopener noreferrer" target="_blank">`
    }

    if (name === 'img') {
      const srcMatch = attrs.match(/src\s*=\s*(['"])(.*?)\1/i)
      const altMatch = attrs.match(/alt\s*=\s*(['"])(.*?)\1/i)
      const src = srcMatch?.[2] ?? ''
      if (!/^(https?:\/\/|\/)/i.test(src)) return ''
      const alt = (altMatch?.[2] ?? '').replace(/"/g, '&quot;')
      return `<img src="${src.replace(/"/g, '&quot;')}" alt="${alt}" loading="lazy">`
    }

    return `<${name}>`
  })

  return html
}
