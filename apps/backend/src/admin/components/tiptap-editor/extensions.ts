import type { JSONContent } from "@tiptap/core"
import Color from "@tiptap/extension-color"
import Highlight from "@tiptap/extension-highlight"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import Placeholder from "@tiptap/extension-placeholder"
import Subscript from "@tiptap/extension-subscript"
import Superscript from "@tiptap/extension-superscript"
import { TableKit } from "@tiptap/extension-table"
import TaskItem from "@tiptap/extension-task-item"
import TaskList from "@tiptap/extension-task-list"
import TextAlign from "@tiptap/extension-text-align"
import { TextStyle } from "@tiptap/extension-text-style"
import Underline from "@tiptap/extension-underline"
import Youtube from "@tiptap/extension-youtube"
import StarterKit from "@tiptap/starter-kit"
import type { Extensions } from "@tiptap/core"


export const getCampaignEditorExtensions = (): Extensions => [
  StarterKit.configure({
    heading: {
      levels: [1, 2, 3, 4],
    },
    link: false,
    underline: false,
  }),
  Underline,
  Subscript,
  Superscript,
  TextStyle,
  Color,
  Highlight.configure({
    multicolor: true,
  }),
  TextAlign.configure({
    types: ["heading", "paragraph"],
  }),
  Link.configure({
    openOnClick: false,
    autolink: true,
    linkOnPaste: true,
    HTMLAttributes: {
      rel: "noopener noreferrer",
      target: "_blank",
    },
  }),
  Image.configure({
    inline: false,
    allowBase64: false,
  }),
  TaskList,
  TaskItem.configure({
    nested: true,
  }),
  TableKit.configure({
    table: {
      resizable: true,
    },
  }),
  Placeholder.configure({
    placeholder: "Write your article here...",
  }),
  Youtube.configure({
    inline: false,
    width: 640,
    height: 480,
  }),
]

export const EMPTY_TIPTAP_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
}
