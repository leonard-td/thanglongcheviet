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
import FontFamily from "@tiptap/extension-text-style/font-family"
import FontSize from "@tiptap/extension-text-style/font-size"
import Underline from "@tiptap/extension-underline"
import Youtube from "@tiptap/extension-youtube"
import StarterKit from "@tiptap/starter-kit"
import type { Extensions } from "@tiptap/core"


export type CampaignEditorOptions = {
  placeholder?: string
}

export const getCampaignEditorExtensions = (
  options: CampaignEditorOptions = {},
): Extensions => [
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
  FontFamily,
  FontSize,
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
    placeholder: options.placeholder ?? "Write your article here...",
  }),
  Youtube.configure({
    inline: false,
    width: 640,
    height: 480,
  }),
]

export const EMPTY_TIPTAP_DOC = {
  type: "doc",
  content: [{ type: "paragraph" }],
} as const
