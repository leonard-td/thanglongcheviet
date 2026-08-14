const ALLOWED_TAGS = new Set([
  "P", "BR", "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "LI",
  "BLOCKQUOTE", "PRE", "CODE", "STRONG", "B", "EM", "I", "U", "S",
  "STRIKE", "SUB", "SUP", "A", "IMG", "TABLE", "THEAD", "TBODY", "TR",
  "TH", "TD", "HR",
])

const UNSAFE_PROTOCOL = /^(?:javascript|data|vbscript):/i

/**
 * Removes presentational markup pasted from Word/social sites, retaining only
 * semantic HTML supported by the editor and storefront.
 */
export const sanitizePastedHtml = (html: string) => {
  const document = new DOMParser().parseFromString(html, "text/html")

  document.body.querySelectorAll("script, style, iframe, object, embed, meta, link").forEach(
    (element) => element.remove()
  )

  for (const element of Array.from(document.body.querySelectorAll("*"))) {
    if (!ALLOWED_TAGS.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes))
      continue
    }

    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase()
      const value = attribute.value.trim()
      const isSafeLink = name === "href" && !UNSAFE_PROTOCOL.test(value)
      const isSafeImage = name === "src" && !UNSAFE_PROTOCOL.test(value)

      if (!isSafeLink && !isSafeImage) {
        element.removeAttribute(attribute.name)
      }
    }
  }

  return document.body.innerHTML
}
