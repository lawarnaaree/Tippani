import type { MouseEvent } from "react";
import type { Tab } from "../../stores/tabs";

type Props = {
  tabs: Tab[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
};

export function TabBar({ tabs, activeId, onSelect, onClose }: Props) {
  if (tabs.length === 0) return null;
  return (
    <div
      role="tablist"
      aria-label="Open notes"
      className="flex h-9 shrink-0 items-stretch overflow-x-auto border-b border-[var(--tippani-border)] bg-[var(--tippani-tabbar)]"
    >
      {tabs.map((tab) => (
        <TabItem
          key={tab.id}
          tab={tab}
          active={tab.id === activeId}
          onSelect={onSelect}
          onClose={onClose}
        />
      ))}
    </div>
  );
}

function TabItem({
  tab,
  active,
  onSelect,
  onClose,
}: {
  tab: Tab;
  active: boolean;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}) {
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.button === 1) {
      e.preventDefault();
      onClose(tab.id);
    }
  };
  return (
    <div
      role="tab"
      aria-selected={active}
      data-active={active}
      onMouseDown={handleMouseDown}
      className={`group flex max-w-[180px] shrink-0 items-center gap-1 border-r border-[var(--tippani-border)] pl-3 pr-1 text-xs transition-colors ${
        active
          ? "bg-[var(--tippani-tab-active)] text-[var(--tippani-fg)]"
          : "text-[var(--tippani-muted)] hover:bg-[var(--tippani-hover)]"
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(tab.id)}
        title={tab.path}
        className="min-w-0 flex-1 truncate py-1.5 text-left"
      >
        {tab.title || "Untitled"}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose(tab.id);
        }}
        aria-label={`Close ${tab.title}`}
        className="flex h-5 w-5 items-center justify-center rounded text-[var(--tippani-muted)] opacity-0 hover:bg-[var(--tippani-active)] hover:text-[var(--tippani-fg)] focus:opacity-100 group-hover:opacity-100 data-[active=true]:opacity-100"
        data-active={active}
      >
        <span aria-hidden>×</span>
      </button>
    </div>
  );
}
