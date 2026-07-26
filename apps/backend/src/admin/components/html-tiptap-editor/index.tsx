import { EditorContent, useEditor } from "@tiptap/react"
import { useMemo } from "react"

import {
  EMPTY_TIPTAP_DOC,
  getCampaignEditorExtensions,
} from "../tiptap-editor/extensions"
import TiptapToolbar from "../tiptap-editor/toolbar"

import "../tiptap-editor/editor.css"

type HtmlTiptapEditorProps = {
  value?: string
  onChange?: (html: string) => void
  editorKey?: string
  placeholder?: string
  readOnly?: boolean
}

const HtmlTiptapEditor = ({
  value = "",
  onChange,
  editorKey = "new",
  placeholder,
  readOnly = false,
}: HtmlTiptapEditorProps) => {
  const extensions = useMemo(
    () => getCampaignEditorExtensions({ placeholder }),
    [placeholder],
  )

  const initialContent = useMemo(() => {
    const trimmed = value?.trim()
    return trimmed || EMPTY_TIPTAP_DOC
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
        onChange?.(currentEditor.getHTML())
      },
    },
    [editorKey, readOnly, placeholder],
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

export default HtmlTiptapEditor
