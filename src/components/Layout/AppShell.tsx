import type { ReactNode } from "react";
import {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
} from "react-resizable-panels";

const PANEL_IDS = ["sidebar", "main"];

type Props = {
  topBar: ReactNode;
  sidebar: ReactNode;
  tabBar: ReactNode;
  main: ReactNode;
};

export function AppShell({ topBar, sidebar, tabBar, main }: Props) {
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "tippani-main",
    panelIds: PANEL_IDS,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  });

  return (
    <div className="flex h-full flex-col bg-[var(--tippani-bg)] text-[var(--tippani-fg)]">
      {topBar}
      <Group
        orientation="horizontal"
        defaultLayout={defaultLayout}
        onLayoutChanged={onLayoutChanged}
        className="flex min-h-0 flex-1"
      >
        <Panel
          id="sidebar"
          defaultSize="22%"
          minSize="14%"
          maxSize="40%"
          collapsible
          collapsedSize={0}
          className="flex flex-col overflow-hidden border-r border-[var(--tippani-border)] bg-[var(--tippani-sidebar)]"
        >
          {sidebar}
        </Panel>
        <Separator className="tippani-resize-handle" />
        <Panel id="main" className="flex min-w-0 flex-col">
          {tabBar}
          <div className="flex min-h-0 flex-1">{main}</div>
        </Panel>
      </Group>
    </div>
  );
}
