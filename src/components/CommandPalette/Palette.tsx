import { Command } from "cmdk";
import { useCallback } from "react";
import { type Command as TippaniCommand, modKey } from "../../lib/commands";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: TippaniCommand[];
};

export function Palette({ open, onOpenChange, commands }: Props) {
  const notes = commands.filter((c) => c.section === "notes");
  const actions = commands.filter((c) => c.section === "actions");

  const handleSelect = useCallback(
    (id: string) => {
      const cmd = commands.find((c) => c.id === id);
      if (cmd) {
        cmd.run();
      }
      onOpenChange(false);
    },
    [commands, onOpenChange],
  );

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command palette"
      overlayClassName="tippani-palette-backdrop"
      contentClassName="tippani-palette"
      loop
      vimBindings={false}
    >
      <div className="tippani-palette-header">
        <Command.Input
          placeholder={`Search notes & actions… (${modKey()}+K)`}
          className="tippani-palette-input"
        />
      </div>

      <Command.List className="tippani-palette-list">
        <Command.Empty className="tippani-palette-empty">
          No results found.
        </Command.Empty>

        {notes.length > 0 && (
          <Command.Group
            heading="Notes"
            className="tippani-palette-group"
          >
            {notes.map((cmd) => (
              <PaletteItem key={cmd.id} command={cmd} onSelect={handleSelect} />
            ))}
          </Command.Group>
        )}

        <Command.Group
          heading="Actions"
          className="tippani-palette-group"
        >
          {actions.map((cmd) => (
            <PaletteItem key={cmd.id} command={cmd} onSelect={handleSelect} />
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}

// ---------------------------------------------------------------------------
// Individual item
// ---------------------------------------------------------------------------

function PaletteItem({
  command,
  onSelect,
}: {
  command: TippaniCommand;
  onSelect: (id: string) => void;
}) {
  return (
    <Command.Item
      value={command.id}
      keywords={command.keywords}
      onSelect={() => onSelect(command.id)}
      className="tippani-palette-item"
    >
      <span className="tippani-palette-item-label">{command.label}</span>
      {command.shortcut && (
        <kbd className="tippani-palette-item-shortcut">{command.shortcut}</kbd>
      )}
    </Command.Item>
  );
}
