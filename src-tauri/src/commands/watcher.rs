//! Vault file watcher.
//!
//! Watches the active vault root recursively and emits Tauri events for
//! external file changes. A previous watcher (if any) is dropped when
//! `watch()` is called again — RAII releases the OS handles, the dispatcher
//! thread exits when its channel disconnects.

use notify::event::ModifyKind;
use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::{mpsc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

const DEBOUNCE: Duration = Duration::from_millis(250);

#[derive(Default)]
pub struct VaultWatcher {
    inner: Mutex<Option<RecommendedWatcher>>,
}

impl VaultWatcher {
    pub fn watch(&self, app: &AppHandle, root: &Path) -> Result<(), String> {
        let mut slot = self.inner.lock().map_err(|e| e.to_string())?;
        // Drop previous watcher first so its OS handles + dispatcher thread go away.
        *slot = None;

        let (tx, rx) = mpsc::channel::<notify::Result<Event>>();
        let mut watcher = notify::recommended_watcher(move |res| {
            let _ = tx.send(res);
        })
        .map_err(|e| format!("watcher init failed: {}", e))?;

        watcher
            .watch(root, RecursiveMode::Recursive)
            .map_err(|e| format!("watch failed: {}", e))?;

        let app_handle = app.clone();
        std::thread::spawn(move || dispatcher_loop(rx, app_handle));

        *slot = Some(watcher);
        Ok(())
    }
}

#[derive(Serialize, Clone)]
struct VaultChangedPayload {
    paths: Vec<String>,
}

#[derive(Serialize, Clone)]
struct NoteUpdatedPayload {
    path: String,
}

fn is_hidden_path(p: &Path) -> bool {
    p.components()
        .any(|c| c.as_os_str().to_string_lossy().starts_with('.'))
}

fn is_md_path(p: &Path) -> bool {
    p.extension()
        .map(|e| e.eq_ignore_ascii_case("md"))
        .unwrap_or(false)
}

fn dispatcher_loop(rx: mpsc::Receiver<notify::Result<Event>>, app: AppHandle) {
    loop {
        // Block until first event or channel close (watcher dropped).
        let first = match rx.recv() {
            Ok(Ok(ev)) => ev,
            Ok(Err(_)) => continue,
            Err(_) => return,
        };
        let mut events: Vec<Event> = vec![first];
        let deadline = Instant::now() + DEBOUNCE;
        // Coalesce events arriving within the debounce window into a single batch.
        loop {
            let timeout = deadline
                .checked_duration_since(Instant::now())
                .unwrap_or(Duration::ZERO);
            match rx.recv_timeout(timeout) {
                Ok(Ok(ev)) => events.push(ev),
                Ok(Err(_)) => continue,
                Err(mpsc::RecvTimeoutError::Timeout) => break,
                Err(mpsc::RecvTimeoutError::Disconnected) => return,
            }
        }
        process_events(events, &app);
    }
}

fn process_events(events: Vec<Event>, app: &AppHandle) {
    let mut tree_paths: HashSet<PathBuf> = HashSet::new();
    let mut updated_md: HashSet<PathBuf> = HashSet::new();

    for ev in events {
        let kind = ev.kind;
        for path in ev.paths {
            if is_hidden_path(&path) {
                continue;
            }
            match kind {
                EventKind::Create(_) | EventKind::Remove(_) => {
                    tree_paths.insert(path);
                }
                EventKind::Modify(ModifyKind::Name(_)) => {
                    tree_paths.insert(path);
                }
                EventKind::Modify(ModifyKind::Data(_)) | EventKind::Modify(ModifyKind::Any)
                    if is_md_path(&path) =>
                {
                    updated_md.insert(path);
                }
                _ => {}
            }
        }
    }

    if !tree_paths.is_empty() {
        let paths: Vec<String> = tree_paths
            .into_iter()
            .map(|p| p.to_string_lossy().to_string())
            .collect();
        let _ = app.emit("vault://changed", VaultChangedPayload { paths });
    }
    for p in updated_md {
        let _ = app.emit(
            "vault://note-updated",
            NoteUpdatedPayload {
                path: p.to_string_lossy().to_string(),
            },
        );
    }
}

#[tauri::command]
pub fn vault_watch(
    app: AppHandle,
    state: tauri::State<VaultWatcher>,
    path: String,
) -> Result<(), String> {
    state.watch(&app, Path::new(&path))
}
