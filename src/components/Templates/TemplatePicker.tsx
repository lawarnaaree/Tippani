import { useState } from "react";
import type { VaultEntry } from "../../lib/tauri";
import { BUILT_IN_TEMPLATES, listVaultTemplates } from "../../lib/templates";

type Props = {
  open: boolean;
  onClose: () => void;
  entries: VaultEntry[];
  vaultPath: string | null;
  onSelect: (templateContent: string | null, newName: string) => void;
  onCreateBuiltIns: () => void;
};

export function TemplatePicker({ open, onClose, entries, vaultPath, onSelect, onCreateBuiltIns }: Props) {
  const [step, setStep] = useState<"pick" | "name">("pick");
  const [selectedContent, setSelectedContent] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState("");
  const [newNoteName, setNewNoteName] = useState("");

  if (!open) return null;

  const vaultTemplates = listVaultTemplates(entries, vaultPath);

  function pickTemplate(content: string, name: string) {
    setSelectedContent(content);
    setSelectedName(name);
    setNewNoteName("");
    setStep("name");
  }

  function pickBlank() {
    setSelectedContent(null);
    setSelectedName("Blank");
    setNewNoteName("");
    setStep("name");
  }

  function confirm() {
    if (!newNoteName.trim()) return;
    onSelect(selectedContent, newNoteName.trim());
    setStep("pick");
    setNewNoteName("");
    onClose();
  }

  function close() {
    setStep("pick");
    setNewNoteName("");
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        style={{
          background: "var(--tippani-bg)",
          border: "1px solid var(--tippani-border)",
          borderRadius: 14,
          width: "90%",
          maxWidth: 460,
          padding: 24,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            {step === "pick" ? "New note from template" : `Name your note (${selectedName})`}
          </span>
          <button
            onClick={close}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tippani-muted)", fontSize: 18, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {step === "pick" && (
          <>
            {/* Built-in templates */}
            <div style={{ fontSize: 11, color: "var(--tippani-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
              Built-in templates
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
              {BUILT_IN_TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  className="tippani-template-item"
                  onClick={() => pickTemplate(t.content, t.name)}
                >
                  <span style={{ fontWeight: 500, fontSize: 13 }}>{t.name}</span>
                </button>
              ))}
              <button className="tippani-template-item" onClick={pickBlank}>
                <span style={{ fontWeight: 500, fontSize: 13 }}>Blank note</span>
              </button>
            </div>

            {/* Vault templates */}
            {vaultTemplates.length > 0 && (
              <>
                <div style={{ fontSize: 11, color: "var(--tippani-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6, marginTop: 8 }}>
                  Your templates (_templates/)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                  {vaultTemplates.map((e) => {
                    const name = e.path.split(/[/\\]/).pop()!.replace(/\.md$/i, "");
                    return (
                      <button
                        key={e.path}
                        className="tippani-template-item"
                        onClick={() => pickTemplate(`# ${name}\n\n`, name)}
                      >
                        <span style={{ fontWeight: 500, fontSize: 13 }}>{name}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {vaultTemplates.length === 0 && vaultPath && (
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={onCreateBuiltIns}
                  style={{
                    fontSize: 12,
                    color: "var(--tippani-muted)",
                    background: "none",
                    border: "1px dashed var(--tippani-border)",
                    borderRadius: 6,
                    padding: "6px 12px",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  + Save built-in templates to vault (_templates/)
                </button>
              </div>
            )}
          </>
        )}

        {step === "name" && (
          <div>
            <div style={{ fontSize: 13, color: "var(--tippani-muted)", marginBottom: 10 }}>
              Template: <strong style={{ color: "var(--tippani-fg)" }}>{selectedName}</strong>
            </div>
            <input
              autoFocus
              type="text"
              placeholder="Note name (without .md)"
              value={newNoteName}
              onChange={(e) => setNewNoteName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirm();
                if (e.key === "Escape") setStep("pick");
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 7,
                border: "1px solid var(--tippani-border)",
                background: "var(--tippani-bg)",
                color: "var(--tippani-fg)",
                fontFamily: "inherit",
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
              <button
                onClick={() => setStep("pick")}
                style={{
                  padding: "7px 16px",
                  borderRadius: 6,
                  border: "1px solid var(--tippani-border)",
                  background: "var(--tippani-bg)",
                  color: "var(--tippani-muted)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 13,
                }}
              >
                Back
              </button>
              <button
                onClick={confirm}
                disabled={!newNoteName.trim()}
                style={{
                  padding: "7px 16px",
                  borderRadius: 6,
                  border: "1px solid var(--tippani-border)",
                  background: newNoteName.trim() ? "var(--tippani-accent)" : "var(--tippani-hover)",
                  color: newNoteName.trim() ? "var(--tippani-bg)" : "var(--tippani-muted)",
                  cursor: newNoteName.trim() ? "pointer" : "not-allowed",
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Create note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
