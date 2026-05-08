import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { tags as t } from "@lezer/highlight";

const bg = "#000000";
const fg = "#d4b88a";
const accent = "#e8c184";
const muted = "#a08660";
const dim = "#6b5740";
const sand = "#c4a570";
const sandLow = "#b89668";

const theme = EditorView.theme(
  {
    "&": { color: fg, backgroundColor: bg },
    ".cm-content": { caretColor: accent },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: accent },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      { backgroundColor: "rgba(212, 184, 138, 0.18)" },
    ".cm-gutters": { backgroundColor: bg, color: dim, border: "none" },
    ".cm-activeLine": { backgroundColor: "rgba(212, 184, 138, 0.04)" },
    ".cm-activeLineGutter": { backgroundColor: "rgba(212, 184, 138, 0.06)" },
    ".cm-selectionMatch": { backgroundColor: "rgba(212, 184, 138, 0.10)" },
    ".cm-panels": { backgroundColor: bg, color: fg },
    ".cm-panels.cm-panels-top": { borderBottom: "1px solid #1a1408" },
    ".cm-panels.cm-panels-bottom": { borderTop: "1px solid #1a1408" },
    ".cm-searchMatch": {
      backgroundColor: "rgba(232, 193, 132, 0.18)",
      outline: "1px solid #e8c184",
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: "rgba(232, 193, 132, 0.32)",
    },
    ".cm-tooltip": {
      backgroundColor: "#0a0805",
      border: "1px solid #1a1408",
      color: fg,
    },
  },
  { dark: true },
);

const highlight = HighlightStyle.define([
  { tag: t.heading, color: accent, fontWeight: "600" },
  { tag: t.heading1, color: accent, fontWeight: "700" },
  { tag: t.strong, color: accent, fontWeight: "600" },
  { tag: t.emphasis, color: fg, fontStyle: "italic" },
  { tag: t.link, color: accent, textDecoration: "underline" },
  { tag: t.url, color: muted },
  { tag: t.monospace, color: sandLow },
  { tag: t.keyword, color: accent },
  { tag: t.string, color: sand },
  { tag: t.comment, color: dim, fontStyle: "italic" },
  { tag: t.list, color: fg },
  { tag: t.quote, color: muted, fontStyle: "italic" },
  { tag: t.atom, color: accent },
  { tag: [t.number, t.bool], color: sand },
  { tag: t.contentSeparator, color: dim },
  { tag: t.processingInstruction, color: muted },
]);

export const warmDark: Extension = [theme, syntaxHighlighting(highlight)];
