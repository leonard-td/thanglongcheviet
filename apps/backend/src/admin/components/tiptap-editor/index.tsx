import type { JSONContent } from "@tiptap/core"
import { EditorContent, useEditor } from "@tiptap/react"
import { useEffect, useMemo, useState } from "react"

import {
  EMPTY_TIPTAP_DOC,
  getCampaignEditorExtensions,
} from "./extensions"
import TiptapToolbar from "./toolbar"
import { sanitizePastedHtml } from "./paste-sanitize"

import "./editor.css"

type TiptapEditorProps = {
  /** TipTap JSON doc (campaign/events) or HTML string (product description). */
  value?: JSONContent | string | null
  onChange?: (content: JSONContent | string) => void
  /** Default `json` preserves campaign/event callers. Use `html` for product.description. */
  output?: "json" | "html"
  editorKey?: string
  readOnly?: boolean
}

const TiptapEditor = ({
  value,
  onChange,
  output = "json",
  editorKey = "new",
  readOnly = false,
}: TiptapEditorProps) => {
  const extensions = useMemo(() => getCampaignEditorExtensions(), [])
  const [isFullscreen, setIsFullscreen] = useState(false)

  const initialContent = useMemo(() => {
    if (typeof value === "string") {
      const trimmed = value.trim()
      return trimmed.length ? trimmed : EMPTY_TIPTAP_DOC
    }
    if (value?.type === "doc" && value.content?.length) {
      return value
    }

    return EMPTY_TIPTAP_DOC
  }, [editorKey])

  const editor = useEditor(
    {
      extensions,
      content: initialContent,
      editable: !readOnly,
      editorProps: {
        attributes: {
          class: "tiptap",
        },
        transformPastedHTML: sanitizePastedHtml,
      },
      onUpdate: ({ editor: currentEditor }) => {
        if (output === "html") {
          onChange?.(currentEditor.getHTML())
        } else {
          onChange?.(currentEditor.getJSON())
        }
      },
    },
    [editorKey, readOnly, output]
  )

  useEffect(() => {
    const onFullscreenChange = () => {
      const active =
        document.fullscreenElement === document.documentElement &&
        document.body.classList.contains("tiptap-fullscreen-active")

      setIsFullscreen(active)
      if (!active) {
        document.body.classList.remove("tiptap-fullscreen-active")
      }
    }

    document.addEventListener("fullscreenchange", onFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange)
      document.body.classList.remove("tiptap-fullscreen-active")
    }
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        // Fullscreening only the editor hides Radix/Medusa modal portals that
        // mount under <body>. Fullscreening <html> keeps those popups inside
        // the browser's fullscreen top layer while CSS isolates this editor.
        document.body.classList.add("tiptap-fullscreen-active")
        await document.documentElement.requestFullscreen()
      }
    } catch {
      // Fullscreen can be blocked by browser permissions or embedded contexts.
      document.body.classList.remove("tiptap-fullscreen-active")
    }
  }

  if (!editor) {
    return null
  }

  return (
    <div
      className={`campaign-tiptap-editor overflow-visible${isFullscreen ? " is-fullscreen" : ""}`}
      onKeyDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {!readOnly && (
        <div className="campaign-tiptap-editor__toolbar">
          <TiptapToolbar
            editor={editor}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />
        </div>
      )}

      <div className="campaign-tiptap-editor__content">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export default TiptapEditor
