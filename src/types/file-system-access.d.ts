// Minimal ambient declarations for the File System Access API.
// TypeScript's lib.dom does not yet ship these, and we deliberately
// keep this trimmed to the subset Tippani actually uses.

export {};

declare global {
  type FileSystemPermissionMode = "read" | "readwrite";

  interface FileSystemPermissionDescriptor {
    mode?: FileSystemPermissionMode;
  }

  type PermissionState = "granted" | "denied" | "prompt";

  interface FileSystemHandle {
    readonly kind: "file" | "directory";
    readonly name: string;
    isSameEntry(other: FileSystemHandle): Promise<boolean>;
    queryPermission(
      desc?: FileSystemPermissionDescriptor,
    ): Promise<PermissionState>;
    requestPermission(
      desc?: FileSystemPermissionDescriptor,
    ): Promise<PermissionState>;
  }

  interface FileSystemFileHandle extends FileSystemHandle {
    readonly kind: "file";
    getFile(): Promise<File>;
    createWritable(opts?: {
      keepExistingData?: boolean;
    }): Promise<FileSystemWritableFileStream>;
  }

  interface FileSystemDirectoryHandle extends FileSystemHandle {
    readonly kind: "directory";
    getFileHandle(
      name: string,
      opts?: { create?: boolean },
    ): Promise<FileSystemFileHandle>;
    getDirectoryHandle(
      name: string,
      opts?: { create?: boolean },
    ): Promise<FileSystemDirectoryHandle>;
    removeEntry(
      name: string,
      opts?: { recursive?: boolean },
    ): Promise<void>;
    resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null>;
    keys(): AsyncIterableIterator<string>;
    values(): AsyncIterableIterator<
      FileSystemFileHandle | FileSystemDirectoryHandle
    >;
    entries(): AsyncIterableIterator<
      [string, FileSystemFileHandle | FileSystemDirectoryHandle]
    >;
  }

  interface FileSystemWritableFileStream extends WritableStream {
    write(
      data: BufferSource | Blob | string | { type: "write"; data: unknown },
    ): Promise<void>;
    seek(position: number): Promise<void>;
    truncate(size: number): Promise<void>;
  }

  interface DirectoryPickerOptions {
    id?: string;
    mode?: FileSystemPermissionMode;
    startIn?:
      | "desktop"
      | "documents"
      | "downloads"
      | "music"
      | "pictures"
      | "videos"
      | FileSystemHandle;
  }

  interface SaveFilePickerAcceptType {
    description?: string;
    accept: Record<string, string | string[]>;
  }

  interface SaveFilePickerOptions {
    excludeAcceptAllOption?: boolean;
    suggestedName?: string;
    types?: SaveFilePickerAcceptType[];
    id?: string;
    startIn?: DirectoryPickerOptions["startIn"];
  }

  interface Window {
    showDirectoryPicker?: (
      opts?: DirectoryPickerOptions,
    ) => Promise<FileSystemDirectoryHandle>;
    showSaveFilePicker?: (
      opts?: SaveFilePickerOptions,
    ) => Promise<FileSystemFileHandle>;
    __TAURI_INTERNALS__?: unknown;
  }
}
