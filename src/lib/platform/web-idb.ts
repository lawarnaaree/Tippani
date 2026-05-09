// Single-purpose IndexedDB wrapper: persists the user's vault directory
// handle so the same vault can be re-opened (after a permission re-grant)
// across browser sessions.

const DB_NAME = "tippani-handles";
const STORE = "vault";
const KEY = "root";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export async function saveDirHandle(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  await withStore("readwrite", (s) => s.put(handle, KEY));
}

export async function loadDirHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const v = await withStore<unknown>("readonly", (s) => s.get(KEY));
    if (!v) return null;
    return v as FileSystemDirectoryHandle;
  } catch {
    return null;
  }
}

export async function clearDirHandle(): Promise<void> {
  try {
    await withStore("readwrite", (s) => s.delete(KEY));
  } catch {
    // ignore — best-effort cleanup
  }
}
