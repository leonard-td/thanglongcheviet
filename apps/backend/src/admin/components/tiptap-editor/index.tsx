import type { JSONContent } from "@tiptap/core"
import { EditorContent, useEditor } from "@tiptap/react"
import { useMemo } from "react"

import {
  EMPTY_TIPTAP_DOC,
  getCampaignEditorExtensions,
} from "./extensions"
import TiptapToolbar from "./toolbar"

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

  if (!editor) {
    return null
  }

  return (
    <div
      className="campaign-tiptap-editor overflow-visible"
      onKeyDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {!readOnly && <TiptapToolbar editor={editor} />}

      <div className="campaign-tiptap-editor__content">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

export default TiptapEditor
