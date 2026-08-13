import { Button } from "@medusajs/ui"
import type { Editor } from "@tiptap/react"
import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import * as mammoth from "mammoth"
import MediaPickerModal from "../media-picker-modal"
import { sanitizePastedHtml } from "./paste-sanitize"
import {
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Highlighter,
  Subscript,
  Superscript,
  Palette,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Pilcrow,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  SquareCode,
  Minus,
  Link,
  Unlink,
  Image as ImageIcon,
  Table as TableIcon,
  Plus,
  Trash2,
  Video,
  Eraser,
  FileUp,
  Maximize2,
  Minimize2
} from "lucide-react"

type TiptapToolbarProps = {
  editor: Editor
  isFullscreen: boolean
  onToggleFullscreen: () => void
}

const ToolbarDivider = () => (
  <div className="bg-ui-border-base mx-1 hidden h-6 w-px sm:block" />
)

const ToolbarButton = ({
  active,
  disabled,
  title,
  onClick,
  children,
}: {
  active?: boolean
  disabled?: boolean
  title: string
  onClick: () => void
  children: React.ReactNode
}) => (
  <Button
    type="button"
    size="small"
    variant={active ? "primary" : "secondary"}
    className="min-w-8 gap-x-1 px-2"
    disabled={disabled}
    title={title}
    onClick={onClick}
  >
    {children}
  </Button>
)

const TiptapToolbar = ({
  editor,
  isFullscreen,
  onToggleFullscreen,
}: TiptapToolbarProps) => {
  const { t } = useTranslation()
  const colorInputRef = useRef<HTMLInputElement>(null)
  const wordInputRef = useRef<HTMLInputElement>(null)
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href as string | undefined
    const url = window.prompt("Link URL", previousUrl ?? "https://")

    if (url === null) {
      return
    }

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }

  const setYoutubeVideo = () => {
    const url = window.prompt("Youtube URL")

    if (url) {
      editor.commands.setYoutubeVideo({
        src: url,
        width: 640,
        height: 480,
      })
    }
  }

  const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    editor.chain().focus().setColor(event.target.value).run()
  }

  const importWord = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    try {
      const { value } = await mammoth.convertToHtml({
        arrayBuffer: await file.arrayBuffer(),
      })
      editor.commands.setContent(sanitizePastedHtml(value))
    } catch {
      window.alert(t("campaign-posts.editor.importWordFailed"))
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-t-lg border border-b-0 border-ui-border-base bg-ui-bg-subtle px-2 py-2">
      <div className="flex flex-wrap items-center gap-1">
        <ToolbarButton
          title={t(
            isFullscreen
              ? "campaign-posts.editor.exitFullscreen"
              : "campaign-posts.editor.fullscreen"
          )}
          onClick={onToggleFullscreen}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </ToolbarButton>
        <input
          ref={wordInputRef}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={importWord}
        />
        <ToolbarButton
          title={t("campaign-posts.editor.importWord")}
          onClick={() => wordInputRef.current?.click()}
        >
          <FileUp size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Undo"
          disabled={!editor.can().chain().focus().undo().run()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Redo"
          disabled={!editor.can().chain().focus().redo().run()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo size={16} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          title="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Inline code"
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Highlight"
          active={editor.isActive("highlight")}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          <Highlighter size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Subscript"
          active={editor.isActive("subscript")}
          onClick={() => editor.chain().focus().toggleSubscript().run()}
        >
          <Subscript size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Superscript"
          active={editor.isActive("superscript")}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
        >
          <Superscript size={16} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          title="Text color"
          onClick={() => colorInputRef.current?.click()}
        >
          <Palette size={16} />
        </ToolbarButton>
        <input
          ref={colorInputRef}
          type="color"
          className="hidden"
          defaultValue="#111827"
          onChange={handleColorChange}
        />
        <ToolbarButton
          title="Clear color"
          onClick={() => editor.chain().focus().unsetColor().run()}
        >
          <Eraser size={16} />
        </ToolbarButton>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <ToolbarButton
          title="Heading 1"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 4"
          active={editor.isActive("heading", { level: 4 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
        >
          <Heading4 size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Paragraph"
          active={editor.isActive("paragraph")}
          onClick={() => editor.chain().focus().setParagraph().run()}
        >
          <Pilcrow size={16} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          title="Align left"
          active={editor.isActive({ textAlign: "left" })}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Align center"
          active={editor.isActive({ textAlign: "center" })}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Align right"
          active={editor.isActive({ textAlign: "right" })}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Justify"
          active={editor.isActive({ textAlign: "justify" })}
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        >
          <AlignJustify size={16} />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          title="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Ordered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Task list"
          active={editor.isActive("taskList")}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          <ListTodo size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Blockquote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Code block"
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <SquareCode size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Horizontal rule"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus size={16} />
        </ToolbarButton>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <ToolbarButton
          title="Add link"
          active={editor.isActive("link")}
          onClick={setLink}
        >
          <Link size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Remove link"
          disabled={!editor.isActive("link")}
          onClick={() => editor.chain().focus().unsetLink().run()}
        >
          <Unlink size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Insert image"
          onClick={() => setMediaPickerOpen(true)}
        >
          <ImageIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Insert Youtube"
          onClick={setYoutubeVideo}
        >
          <Video size={16} color="red" />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          title="Insert table"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
        >
          <TableIcon size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Add column"
          disabled={!editor.can().addColumnAfter()}
          onClick={() => editor.chain().focus().addColumnAfter().run()}
        >
          <Plus size={16} /> Col
        </ToolbarButton>
        <ToolbarButton
          title="Add row"
          disabled={!editor.can().addRowAfter()}
          onClick={() => editor.chain().focus().addRowAfter().run()}
        >
          <Plus size={16} /> Row
        </ToolbarButton>
        <ToolbarButton
          title="Delete table"
          disabled={!editor.can().deleteTable()}
          onClick={() => editor.chain().focus().deleteTable().run()}
        >
          <Trash2 size={16} />
        </ToolbarButton>
      </div>

      <MediaPickerModal
        open={mediaPickerOpen}
        onOpenChange={setMediaPickerOpen}
        onSelect={(url) => editor.chain().focus().setImage({ src: url }).run()}
      />
    </div>
  )
}

export default TiptapToolbar
