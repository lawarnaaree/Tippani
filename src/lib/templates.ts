import type { VaultEntry } from "./tauri";

export type BuiltInTemplate = {
  name: string;
  filename: string;
  content: string;
};

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  {
    name: "Problem Set",
    filename: "problem-set.md",
    content: `# Problem Set: {{title}}

**Subject**:
**Date**:

---

## Problem 1

**Statement:**

**Working:**

**Answer:**

---

## Problem 2

**Statement:**

**Working:**

**Answer:**

---

## Problem 3

**Statement:**

**Working:**

**Answer:**
`,
  },
  {
    name: "Lab Report",
    filename: "lab-report.md",
    content: `# Lab Report: {{title}}

**Date**:
**Subject**:
**Partner(s)**:

---

## Aim

## Hypothesis

## Method

### Apparatus

### Procedure

1.

## Results

| Variable | Value | Units |
|----------|-------|-------|
|          |       |       |

## Analysis

## Conclusion

## Evaluation

**Sources of error:**

**Improvements:**
`,
  },
  {
    name: "Lecture Notes",
    filename: "lecture-notes.md",
    content: `# {{title}}

**Date**:
**Subject**:
**Topic**:

---

## Overview

## Key Points

-

## Definitions

| Term | Definition |
|------|------------|
|      |            |

## Formulas

## Questions / Things to follow up

- [ ]
`,
  },
  {
    name: "CS Notes",
    filename: "cs-notes.md",
    content: `# {{title}}

**Topic**:
**Date**:

---

## Concept

## Algorithm / Pseudocode

\`\`\`
// pseudocode here
\`\`\`

## Code Example

\`\`\`python

\`\`\`

## Time & Space Complexity

| Operation | Time | Space |
|-----------|------|-------|
|           | O()  | O()   |

## Key Notes

-

## Related Topics

-
`,
  },
  {
    name: "Physics Formula Sheet",
    filename: "physics-formulas.md",
    content: `# Physics Formula Sheet: {{title}}

**Topic**:

---

## Formulas

| Formula | Description | Variables |
|---------|-------------|-----------|
| $F = ma$ | Newton's 2nd Law | $F$ = force, $m$ = mass, $a$ = acceleration |
|         |             |           |

## Constants

| Constant | Symbol | Value |
|----------|--------|-------|
| Speed of light | $c$ | $3 \\times 10^8$ m/s |
| Gravitational constant | $G$ | $6.674 \\times 10^{-11}$ N m² kg⁻² |
| Planck's constant | $h$ | $6.626 \\times 10^{-34}$ J s |

## Derivations

## Worked Examples
`,
  },
];

export function isTemplatePath(vaultPath: string | null, filePath: string): boolean {
  if (!vaultPath) return false;
  const rel = filePath.slice(vaultPath.length).replace(/^[/\\]/, "");
  return rel.startsWith("_templates/") || rel.startsWith("_templates\\");
}

export function listVaultTemplates(entries: VaultEntry[], vaultPath: string | null): VaultEntry[] {
  if (!vaultPath) return [];
  return flattenFiles(entries).filter((e) => isTemplatePath(vaultPath, e.path));
}

function flattenFiles(entries: VaultEntry[]): VaultEntry[] {
  const files: VaultEntry[] = [];
  for (const e of entries) {
    if (e.kind === "file") files.push(e);
    else if (e.children) files.push(...flattenFiles(e.children));
  }
  return files;
}

export function applyTemplateTitle(content: string, title: string): string {
  return content.replace(/\{\{title\}\}/g, title);
}
