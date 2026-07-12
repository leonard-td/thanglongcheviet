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
  value?: JSONContent | null
  onChange?: (content: JSONContent) => void
  editorKey?: string
  readOnly?: boolean
}

const TiptapEditor = ({
  value,
  onChange,
  editorKey = "new",
  readOnly = false,
}: TiptapEditorProps) => {
  const extensions = useMemo(() => getCampaignEditorExtensions(), [])

  const initialContent = useMemo(() => {
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
        onChange?.(currentEditor.getJSON())
      },
    },
    [editorKey, readOnly]
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
