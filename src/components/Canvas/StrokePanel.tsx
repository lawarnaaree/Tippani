import { useEffect, useState } from "react";

type Props = {
  // Excalidraw imperative API. Typed loosely on purpose — Excalidraw's exported
  // types vary across versions and we only call a small subset here.
  api: any;
};

const SWATCHES = [
  "#1e1e1e", // black / default ink
  "#dc2626", // red
  "#ea580c", // orange
  "#ca8a04", // yellow
  "#16a34a", // green
  "#0284c7", // blue
  "#7c3aed", // purple
  "#db2777", // pink
  "#ffffff", // white (visible on dark canvas)
];

const MIN_WIDTH = 1;
const MAX_WIDTH = 20;

export function StrokePanel({ api }: Props) {
  const [width, setWidth] = useState<number>(2);
  const [color, setColor] = useState<string>("#1e1e1e");

  // Keep panel state in sync with whatever Excalidraw's selection / tool
  // defaults currently say. Polled on a microtask via onChange events would be
  // ideal, but Excalidraw doesn't surface a selection-changed callback; for now
  // we sync once per render of the panel (cheap), and also when api becomes
  // available.
  useEffect(() => {
    if (!api) return;
    try {
      const appState = api.getAppState?.();
      if (!appState) return;
      const elements = api.getSceneElements?.() ?? [];
      const selected = appState.selectedElementIds ?? {};
      const selectedEls = elements.filter((el: any) => selected[el.id]);
      if (selectedEls.length > 0 && selectedEls[0].strokeWidth != null) {
        setWidth(selectedEls[0].strokeWidth);
        if (selectedEls[0].strokeColor) setColor(selectedEls[0].strokeColor);
      } else {
        if (typeof appState.currentItemStrokeWidth === "number") {
          setWidth(appState.currentItemStrokeWidth);
        }
        if (typeof appState.currentItemStrokeColor === "string") {
          setColor(appState.currentItemStrokeColor);
        }
      }
    } catch {
      // ignore — Excalidraw not ready yet
    }
  }, [api]);

  const applyWidth = (next: number) => {
    setWidth(next);
    if (!api) return;
    const elements = api.getSceneElements?.() ?? [];
    const appState = api.getAppState?.() ?? {};
    const selected = appState.selectedElementIds ?? {};
    const hasSelection = Object.values(selected).some(Boolean);
    if (hasSelection) {
      const updated = elements.map((el: any) =>
        selected[el.id] && "strokeWidth" in el
          ? { ...el, strokeWidth: next }
          : el,
      );
      api.updateScene({
        elements: updated,
        appState: { ...appState, currentItemStrokeWidth: next },
      });
    } else {
      api.updateScene({
        appState: { ...appState, currentItemStrokeWidth: next },
      });
    }
  };

  const applyColor = (next: string) => {
    setColor(next);
    if (!api) return;
    const elements = api.getSceneElements?.() ?? [];
    const appState = api.getAppState?.() ?? {};
    const selected = appState.selectedElementIds ?? {};
    const hasSelection = Object.values(selected).some(Boolean);
    if (hasSelection) {
      const updated = elements.map((el: any) =>
        selected[el.id] && "strokeColor" in el
          ? { ...el, strokeColor: next }
          : el,
      );
      api.updateScene({
        elements: updated,
        appState: { ...appState, currentItemStrokeColor: next },
      });
    } else {
      api.updateScene({
        appState: { ...appState, currentItemStrokeColor: next },
      });
    }
  };

  return (
    <div className="tippani-stroke-panel" data-tippani-stroke-panel>
      <div className="tippani-stroke-row">
        <label className="tippani-stroke-label" htmlFor="tippani-stroke-width">
          Width
        </label>
        <input
          id="tippani-stroke-width"
          type="range"
          min={MIN_WIDTH}
          max={MAX_WIDTH}
          step={0.5}
          value={width}
          onChange={(e) => applyWidth(parseFloat(e.target.value))}
        />
        <span className="tippani-stroke-value">{width.toFixed(1)}</span>
      </div>
      <div className="tippani-stroke-row">
        <span className="tippani-stroke-label">Color</span>
        <div className="tippani-stroke-swatches">
          {SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Stroke color ${c}`}
              title={c}
              onClick={() => applyColor(c)}
              className={
                "tippani-stroke-swatch" +
                (color.toLowerCase() === c.toLowerCase()
                  ? " tippani-stroke-swatch-active"
                  : "")
              }
              style={{ background: c }}
            />
          ))}
          <input
            type="color"
            aria-label="Custom stroke color"
            value={isHex(color) ? color : "#000000"}
            onChange={(e) => applyColor(e.target.value)}
            className="tippani-stroke-custom"
          />
        </div>
      </div>
    </div>
  );
}

function isHex(s: string): boolean {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(s);
}

export default StrokePanel;
