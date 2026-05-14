import { useEffect, useState } from "react";
import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  useSettings,
} from "../../stores/settings";
import { check } from "@tauri-apps/plugin-updater";
import { getVersion } from "@tauri-apps/api/app";

const FONT_FAMILY_OPTIONS: { label: string; value: string }[] = [
  {
    label: "System Sans",
    value:
      'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  },
  {
    label: "Poppins",
    value: '"Poppins", ui-sans-serif, system-ui, sans-serif',
  },
  {
    label: "JetBrains Mono",
    value: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
  },
  {
    label: "Fira Code",
    value: '"Fira Code", ui-monospace, "SF Mono", Menlo, monospace',
  },
  {
    label: "System Mono",
    value: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
  vaultPath: string | null;
  onChangeVault: () => void;
};

export function SettingsModal({ open, onClose, vaultPath, onChangeVault }: Props) {
  const theme = useSettings((s) => s.theme);
  const cycleTheme = useSettings((s) => s.cycleTheme);
  const editorFontFamily = useSettings((s) => s.editorFontFamily);
  const editorFontSize = useSettings((s) => s.editorFontSize);
  const keymap = useSettings((s) => s.keymap);
  const update = useSettings((s) => s.update);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    getVersion().then(setAppVersion).catch(() => {});
  }, []);

  const handleCheckForUpdates = async () => {
    setCheckingUpdate(true);
    setUpdateStatus(null);
    try {
      const available = await check();
      if (available) {
        setUpdateStatus(`Update available: v${available.version}`);
      } else {
        setUpdateStatus("You're on the latest version.");
      }
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : String(e);
      setUpdateStatus(`Error checking for updates: ${msg}`);
    } finally {
      setCheckingUpdate(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  // If the configured font family isn't one of the presets, surface it as a
  // "Custom" option so the select doesn't appear blank.
  const presetValues = FONT_FAMILY_OPTIONS.map((o) => o.value);
  const familyOptions = presetValues.includes(editorFontFamily)
    ? FONT_FAMILY_OPTIONS
    : [
        ...FONT_FAMILY_OPTIONS,
        { label: "Custom", value: editorFontFamily },
      ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-[var(--tippani-border)] bg-[var(--tippani-bg)] p-5 text-sm shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="rounded px-2 py-1 text-[var(--tippani-muted)] hover:bg-[var(--tippani-hover)]"
          >
            ✕
          </button>
        </div>

        <Section title="Vault">
          <div className="flex items-center gap-2">
            <span
              className="flex-1 truncate rounded border border-[var(--tippani-border)] bg-[var(--tippani-sidebar)] px-2 py-1 text-xs"
              title={vaultPath ?? "No vault open"}
            >
              {vaultPath ?? "No vault open"}
            </span>
            <button
              type="button"
              onClick={onChangeVault}
              className="rounded border border-[var(--tippani-border)] px-2 py-1 text-xs hover:bg-[var(--tippani-hover)]"
            >
              Change…
            </button>
          </div>
        </Section>

        <Section title="Appearance">
          <Row label="Theme">
            <button
              type="button"
              onClick={cycleTheme}
              className="rounded border border-[var(--tippani-border)] px-2 py-1 text-xs hover:bg-[var(--tippani-hover)]"
            >
              {theme === "system" ? "Auto" : theme === "light" ? "Light" : "Dark"} (click to cycle)
            </button>
          </Row>
        </Section>

        <Section title="Editor">
          <Row label="Font family">
            <select
              value={editorFontFamily}
              onChange={(e) => update("editorFontFamily", e.target.value)}
              className="rounded border border-[var(--tippani-border)] bg-[var(--tippani-bg)] px-2 py-1 text-xs"
            >
              {familyOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Font size">
            <input
              type="number"
              min={FONT_SIZE_MIN}
              max={FONT_SIZE_MAX}
              value={editorFontSize}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (Number.isFinite(n)) update("editorFontSize", n);
              }}
              className="w-20 rounded border border-[var(--tippani-border)] bg-[var(--tippani-bg)] px-2 py-1 text-xs"
            />
          </Row>
          <Row label="Keymap">
            <select
              value={keymap}
              onChange={(e) => update("keymap", e.target.value as typeof keymap)}
              className="rounded border border-[var(--tippani-border)] bg-[var(--tippani-bg)] px-2 py-1 text-xs"
            >
              <option value="default">Default</option>
              <option value="vim" disabled>
                Vim (coming soon)
              </option>
            </select>
          </Row>
        </Section>

        <Section title="App">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--tippani-muted)]">Version {appVersion ?? "…"}</span>
              <button
                type="button"
                onClick={handleCheckForUpdates}
                disabled={checkingUpdate}
                className="rounded border border-[var(--tippani-border)] px-2 py-1 text-xs hover:bg-[var(--tippani-hover)] disabled:opacity-50"
              >
                {checkingUpdate ? "Checking…" : "Check for updates"}
              </button>
            </div>
            {updateStatus && (
              <div className="text-[10px] text-[var(--tippani-muted)] mt-1">
                {updateStatus}
              </div>
            )}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--tippani-muted)]">
        {title}
      </h3>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-[var(--tippani-muted)]">{label}</span>
      {children}
    </div>
  );
}
