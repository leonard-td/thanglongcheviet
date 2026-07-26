/**
 * Minimal TipTap/ProseMirror JSON → HTML renderer for campaign posts coming
 * from the Medusa backend (apps/backend admin composes posts with TipTap).
 * Only the node/mark types the admin editor produces are handled; unknown
 * nodes render their children so content degrades gracefully.
 */

export interface TiptapNode {
  type?: string
  text?: string
  content?: TiptapNode[]
  attrs?: Record<string, unknown>
  marks?: { type: string, attrs?: Record<string, unknown> }[]
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeAttr(value: unknown): string {
  return escapeHtml(String(value ?? ''))
}

function isSafeUrl(url: unknown): boolean {
  const s = String(url ?? '')
  return /^(https?:\/\/|\/|mailto:|tel:)/i.test(s)
}

type UrlResolver = (url: string) => string

const identity: UrlResolver = url => url

function renderMarks(text: string, marks: TiptapNode['marks'] = []): string {
  let html = text
  for (const mark of marks ?? []) {
    switch (mark.type) {
      case 'bold':
        html = `<strong>${html}</strong>`
        break
      case 'italic':
        html = `<em>${html}</em>`
        break
      case 'underline':
        html = `<u>${html}</u>`
        break
      case 'strike':
        html = `<s>${html}</s>`
        break
      case 'code':
        html = `<code>${html}</code>`
        break
      case 'highlight':
        html = `<mark>${html}</mark>`
        break
      case 'subscript':
        html = `<sub>${html}</sub>`
        break
      case 'superscript':
        html = `<sup>${html}</sup>`
        break
      case 'textStyle': {
        const styles: string[] = []
        const color = mark.attrs?.color
        const fontFamily = mark.attrs?.fontFamily
        const fontSize = mark.attrs?.fontSize
        if (typeof color === 'string' && color) styles.push(`color: ${color}`)
        if (typeof fontFamily === 'string' && fontFamily) styles.push(`font-family: ${fontFamily}`)
        if (typeof fontSize === 'string' && fontSize) styles.push(`font-size: ${fontSize}`)
        if (styles.length) {
          html = `<span style="${styles.join('; ')}">${html}</span>`
        }
        break
      }
      case 'link': {
        const href = mark.attrs?.href
        if (isSafeUrl(href)) {
          html = `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">${html}</a>`
        }
        break
      }
      default:
        break
    }
  }
  return html
}

function renderNode(node: TiptapNode, resolveUrl: UrlResolver): string {
  const children = (node.content ?? []).map(n => renderNode(n, resolveUrl)).join('')

  switch (node.type) {
    case 'doc':
      return children
    case 'paragraph':
      return `<p>${children}</p>`
    case 'heading': {
      const level = Math.min(Math.max(Number(node.attrs?.level) || 2, 1), 6)
      return `<h${level}>${children}</h${level}>`
    }
    case 'bulletList':
      return `<ul>${children}</ul>`
    case 'orderedList':
      return `<ol>${children}</ol>`
    case 'listItem':
      return `<li>${children}</li>`
    case 'taskList':
      return `<ul>${children}</ul>`
    case 'taskItem':
      return `<li>${children}</li>`
    case 'blockquote':
      return `<blockquote>${children}</blockquote>`
    case 'codeBlock':
      return `<pre><code>${children}</code></pre>`
    case 'horizontalRule':
      return '<hr>'
    case 'hardBreak':
      return '<br>'
    case 'image': {
      const src = node.attrs?.src
      if (!isSafeUrl(src)) return ''
      const alt = escapeAttr(node.attrs?.alt ?? '')
      return `<img src="${escapeAttr(resolveUrl(String(src)))}" alt="${alt}" loading="lazy">`
    }
    case 'youtube': {
      const src = node.attrs?.src
      if (!isSafeUrl(src)) return ''
      return `<iframe src="${escapeAttr(src)}" loading="lazy" allowfullscreen style="aspect-ratio:16/9;width:100%;border:0"></iframe>`
    }
    case 'table':
      return `<div style="overflow-x:auto"><table>${children}</table></div>`
    case 'tableRow':
      return `<tr>${children}</tr>`
    case 'tableHeader':
      return `<th>${children}</th>`
    case 'tableCell':
      return `<td>${children}</td>`
    case 'text':
      return renderMarks(escapeHtml(node.text ?? ''), node.marks)
    default:
      return children
  }
}

export function tiptapToHtml(doc: unknown, resolveUrl: UrlResolver = identity): string {
  if (!doc || typeof doc !== 'object') return ''
  return renderNode(doc as TiptapNode, resolveUrl)
}

/** Plain text of a TipTap document (for excerpts/SEO descriptions). */
export function tiptapToText(doc: unknown): string {
  if (!doc || typeof doc !== 'object') return ''
  const walk = (node: TiptapNode): string => {
    if (node.type === 'text') return node.text ?? ''
    return (node.content ?? []).map(walk).join(' ')
  }
  return walk(doc as TiptapNode).replace(/\s+/g, ' ').trim()
}

/** First image URL inside a TipTap document, if any. */
export function tiptapFirstImage(doc: unknown, resolveUrl: UrlResolver = identity): string | null {
  if (!doc || typeof doc !== 'object') return null
  const walk = (node: TiptapNode): string | null => {
    if (node.type === 'image' && isSafeUrl(node.attrs?.src)) {
      return resolveUrl(String(node.attrs!.src))
    }
    for (const child of node.content ?? []) {
      const found = walk(child)
      if (found) return found
    }
    return null
  }
  return walk(doc as TiptapNode)
}
