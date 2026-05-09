// Curated LaTeX-name → Unicode glyph map.
// Used by:
//   - the markdown editor's autoreplace extension (`\theta ` → "θ ")
//   - the symbol palette popup (Ctrl+Shift+S)
//   - canvas text-element insertion

export type SymbolCategory =
  | "greek"
  | "operators"
  | "sets"
  | "logic"
  | "arrows"
  | "misc";

export type Symbol = {
  name: string;
  char: string;
  category: SymbolCategory;
  // Extra search keywords (besides the name itself).
  aliases?: string[];
};

export const SYMBOLS: readonly Symbol[] = [
  // ── Greek lowercase ──
  { name: "alpha", char: "α", category: "greek" },
  { name: "beta", char: "β", category: "greek" },
  { name: "gamma", char: "γ", category: "greek" },
  { name: "delta", char: "δ", category: "greek" },
  { name: "epsilon", char: "ε", category: "greek" },
  { name: "varepsilon", char: "ϵ", category: "greek" },
  { name: "zeta", char: "ζ", category: "greek" },
  { name: "eta", char: "η", category: "greek" },
  { name: "theta", char: "θ", category: "greek" },
  { name: "vartheta", char: "ϑ", category: "greek" },
  { name: "iota", char: "ι", category: "greek" },
  { name: "kappa", char: "κ", category: "greek" },
  { name: "lambda", char: "λ", category: "greek" },
  { name: "mu", char: "μ", category: "greek" },
  { name: "nu", char: "ν", category: "greek" },
  { name: "xi", char: "ξ", category: "greek" },
  { name: "omicron", char: "ο", category: "greek" },
  { name: "pi", char: "π", category: "greek" },
  { name: "varpi", char: "ϖ", category: "greek" },
  { name: "rho", char: "ρ", category: "greek" },
  { name: "varrho", char: "ϱ", category: "greek" },
  { name: "sigma", char: "σ", category: "greek" },
  { name: "varsigma", char: "ς", category: "greek" },
  { name: "tau", char: "τ", category: "greek" },
  { name: "upsilon", char: "υ", category: "greek" },
  { name: "phi", char: "φ", category: "greek" },
  { name: "varphi", char: "ϕ", category: "greek" },
  { name: "chi", char: "χ", category: "greek" },
  { name: "psi", char: "ψ", category: "greek" },
  { name: "omega", char: "ω", category: "greek" },

  // ── Greek uppercase ──
  { name: "Gamma", char: "Γ", category: "greek" },
  { name: "Delta", char: "Δ", category: "greek" },
  { name: "Theta", char: "Θ", category: "greek" },
  { name: "Lambda", char: "Λ", category: "greek" },
  { name: "Xi", char: "Ξ", category: "greek" },
  { name: "Pi", char: "Π", category: "greek" },
  { name: "Sigma", char: "Σ", category: "greek" },
  { name: "Upsilon", char: "Υ", category: "greek" },
  { name: "Phi", char: "Φ", category: "greek" },
  { name: "Psi", char: "Ψ", category: "greek" },
  { name: "Omega", char: "Ω", category: "greek" },

  // ── Operators / calculus ──
  { name: "sum", char: "∑", category: "operators", aliases: ["sigma-sum"] },
  { name: "prod", char: "∏", category: "operators", aliases: ["product"] },
  { name: "int", char: "∫", category: "operators", aliases: ["integral"] },
  { name: "iint", char: "∬", category: "operators" },
  { name: "iiint", char: "∭", category: "operators" },
  { name: "oint", char: "∮", category: "operators" },
  { name: "partial", char: "∂", category: "operators", aliases: ["d", "derivative"] },
  { name: "nabla", char: "∇", category: "operators", aliases: ["del", "grad"] },
  { name: "infty", char: "∞", category: "operators", aliases: ["infinity"] },
  { name: "pm", char: "±", category: "operators", aliases: ["plusminus"] },
  { name: "mp", char: "∓", category: "operators" },
  { name: "times", char: "×", category: "operators", aliases: ["mul", "cross"] },
  { name: "div", char: "÷", category: "operators", aliases: ["divide"] },
  { name: "cdot", char: "·", category: "operators", aliases: ["dot"] },
  { name: "ast", char: "∗", category: "operators", aliases: ["star"] },
  { name: "approx", char: "≈", category: "operators" },
  { name: "neq", char: "≠", category: "operators", aliases: ["ne", "notequal"] },
  { name: "leq", char: "≤", category: "operators", aliases: ["le", "lte"] },
  { name: "geq", char: "≥", category: "operators", aliases: ["ge", "gte"] },
  { name: "ll", char: "≪", category: "operators", aliases: ["muchless"] },
  { name: "gg", char: "≫", category: "operators", aliases: ["muchgreater"] },
  { name: "equiv", char: "≡", category: "operators" },
  { name: "propto", char: "∝", category: "operators", aliases: ["proportional"] },
  { name: "sqrt", char: "√", category: "operators", aliases: ["root"] },
  { name: "cbrt", char: "∛", category: "operators" },
  { name: "deg", char: "°", category: "operators", aliases: ["degree"] },
  { name: "prime", char: "′", category: "operators" },
  { name: "dprime", char: "″", category: "operators" },

  // ── Sets ──
  { name: "in", char: "∈", category: "sets", aliases: ["elementof"] },
  { name: "notin", char: "∉", category: "sets" },
  { name: "ni", char: "∋", category: "sets" },
  { name: "subset", char: "⊂", category: "sets" },
  { name: "supset", char: "⊃", category: "sets" },
  { name: "subseteq", char: "⊆", category: "sets" },
  { name: "supseteq", char: "⊇", category: "sets" },
  { name: "cup", char: "∪", category: "sets", aliases: ["union"] },
  { name: "cap", char: "∩", category: "sets", aliases: ["intersect"] },
  { name: "setminus", char: "∖", category: "sets" },
  { name: "emptyset", char: "∅", category: "sets", aliases: ["empty"] },
  { name: "N", char: "ℕ", category: "sets", aliases: ["naturals"] },
  { name: "Z", char: "ℤ", category: "sets", aliases: ["integers"] },
  { name: "Q", char: "ℚ", category: "sets", aliases: ["rationals"] },
  { name: "R", char: "ℝ", category: "sets", aliases: ["reals"] },
  { name: "C", char: "ℂ", category: "sets", aliases: ["complex"] },

  // ── Logic ──
  { name: "forall", char: "∀", category: "logic", aliases: ["all"] },
  { name: "exists", char: "∃", category: "logic", aliases: ["some"] },
  { name: "nexists", char: "∄", category: "logic" },
  { name: "neg", char: "¬", category: "logic", aliases: ["not"] },
  { name: "land", char: "∧", category: "logic", aliases: ["and", "wedge"] },
  { name: "lor", char: "∨", category: "logic", aliases: ["or", "vee"] },
  { name: "implies", char: "⇒", category: "logic", aliases: ["Rightarrow"] },
  { name: "iff", char: "⇔", category: "logic", aliases: ["Leftrightarrow"] },
  { name: "therefore", char: "∴", category: "logic" },
  { name: "because", char: "∵", category: "logic" },

  // ── Arrows ──
  { name: "to", char: "→", category: "arrows", aliases: ["rightarrow"] },
  { name: "leftarrow", char: "←", category: "arrows", aliases: ["gets"] },
  { name: "leftrightarrow", char: "↔", category: "arrows" },
  { name: "uparrow", char: "↑", category: "arrows" },
  { name: "downarrow", char: "↓", category: "arrows" },
  { name: "Rightarrow", char: "⇒", category: "arrows" },
  { name: "Leftarrow", char: "⇐", category: "arrows" },
  { name: "Leftrightarrow", char: "⇔", category: "arrows" },
  { name: "mapsto", char: "↦", category: "arrows" },

  // ── Misc / CS ──
  { name: "oplus", char: "⊕", category: "misc", aliases: ["xor"] },
  { name: "ominus", char: "⊖", category: "misc" },
  { name: "otimes", char: "⊗", category: "misc" },
  { name: "lceil", char: "⌈", category: "misc", aliases: ["ceil"] },
  { name: "rceil", char: "⌉", category: "misc" },
  { name: "lfloor", char: "⌊", category: "misc", aliases: ["floor"] },
  { name: "rfloor", char: "⌋", category: "misc" },
  { name: "langle", char: "⟨", category: "misc" },
  { name: "rangle", char: "⟩", category: "misc" },
  { name: "hbar", char: "ℏ", category: "misc", aliases: ["planck"] },
  { name: "ell", char: "ℓ", category: "misc" },
  { name: "Re", char: "ℜ", category: "misc" },
  { name: "Im", char: "ℑ", category: "misc" },
  { name: "aleph", char: "ℵ", category: "misc" },
  { name: "ldots", char: "…", category: "misc", aliases: ["dots"] },
  { name: "cdots", char: "⋯", category: "misc" },
];

export const SYMBOL_BY_NAME: ReadonlyMap<string, Symbol> = new Map(
  SYMBOLS.map((s) => [s.name, s] as const),
);

export const CATEGORY_LABELS: Record<SymbolCategory, string> = {
  greek: "Greek",
  operators: "Operators",
  sets: "Sets",
  logic: "Logic",
  arrows: "Arrows",
  misc: "Misc",
};

export function lookupSymbol(name: string): Symbol | undefined {
  return SYMBOL_BY_NAME.get(name);
}

// Shared autoreplace logic for LaTeX-style symbol input.
//
// Given the text immediately preceding the trigger character and the trigger
// itself, returns the length of the `\name` token (including backslash) and
// the replacement glyph if a replacement should fire — otherwise null.
//
// A trigger fires when the user types a single non-word character (space,
// punctuation, newline, backslash, etc.) right after a `\name` run where
// `name` is in the symbol map.
export function tryAutoreplace(
  textBefore: string,
  trigger: string,
): { tokenLength: number; glyph: string } | null {
  const isNewline = trigger === "\n" || trigger === "\r\n";
  const isNonWord = /^[^A-Za-z0-9_]$/.test(trigger);
  if (!isNonWord && !isNewline) return null;

  const m = /\\([A-Za-z]+)$/.exec(textBefore);
  if (!m) return null;

  const sym = SYMBOL_BY_NAME.get(m[1]);
  if (!sym) return null;

  return { tokenLength: m[0].length, glyph: sym.char };
}

export function searchSymbols(query: string): Symbol[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...SYMBOLS];
  return SYMBOLS.filter((s) => {
    if (s.name.toLowerCase().includes(q)) return true;
    if (s.char === q) return true;
    if (s.aliases?.some((a) => a.toLowerCase().includes(q))) return true;
    return false;
  });
}
