use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum EntryKind {
    File,
    Folder,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct VaultEntry {
    pub path: String,
    pub name: String,
    pub kind: EntryKind,
    pub children: Option<Vec<VaultEntry>>,
}

const CONFIG_FILE: &str = "config.json";
const NOTE_EXT: &str = "md";

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Config {
    last_vault_path: Option<String>,
}

pub fn list_dir_recursive(root: &Path) -> Result<Vec<VaultEntry>, String> {
    if !root.exists() {
        return Err(format!("Path does not exist: {}", root.display()));
    }
    if !root.is_dir() {
        return Err(format!("Not a directory: {}", root.display()));
    }
    let read = fs::read_dir(root).map_err(|e| e.to_string())?;
    let mut entries: Vec<VaultEntry> = Vec::new();
    for item in read {
        let entry = item.map_err(|e| e.to_string())?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue;
        }
        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        if metadata.is_dir() {
            let children = list_dir_recursive(&path)?;
            entries.push(VaultEntry {
                path: path.to_string_lossy().to_string(),
                name,
                kind: EntryKind::Folder,
                children: Some(children),
            });
        } else if metadata.is_file() {
            let is_md = path
                .extension()
                .map(|s| s.eq_ignore_ascii_case(NOTE_EXT))
                .unwrap_or(false);
            if !is_md {
                continue;
            }
            entries.push(VaultEntry {
                path: path.to_string_lossy().to_string(),
                name,
                kind: EntryKind::File,
                children: None,
            });
        }
    }
    entries.sort_by(|a, b| match (a.kind, b.kind) {
        (EntryKind::Folder, EntryKind::File) => std::cmp::Ordering::Less,
        (EntryKind::File, EntryKind::Folder) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });
    Ok(entries)
}

#[tauri::command]
pub fn vault_list(path: String) -> Result<Vec<VaultEntry>, String> {
    list_dir_recursive(&PathBuf::from(path))
}

#[tauri::command]
pub fn note_read(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("read failed: {}", e))
}

#[tauri::command]
pub fn note_write(path: String, content: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if let Some(parent) = p.parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("mkdir failed: {}", e))?;
        }
    }
    fs::write(&p, content).map_err(|e| format!("write failed: {}", e))
}

#[tauri::command]
pub fn note_create(path: String) -> Result<(), String> {
    let p = PathBuf::from(&path);
    if p.exists() {
        return Err(format!("File already exists: {}", path));
    }
    if let Some(parent) = p.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }
    fs::write(&p, "").map_err(|e| e.to_string())
}

#[tauri::command]
pub fn note_rename(from: String, to: String) -> Result<(), String> {
    let to_path = PathBuf::from(&to);
    if let Some(parent) = to_path.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }
    fs::rename(&from, &to).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn note_delete(path: String) -> Result<(), String> {
    fs::remove_file(&path).map_err(|e| e.to_string())
}

fn config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(CONFIG_FILE))
}

fn read_config_at(path: &Path) -> Result<Config, String> {
    if !path.exists() {
        return Ok(Config::default());
    }
    let raw = fs::read_to_string(path).map_err(|e| e.to_string())?;
    if raw.trim().is_empty() {
        return Ok(Config::default());
    }
    serde_json::from_str(&raw).map_err(|e| e.to_string())
}

fn write_config_at(path: &Path, config: &Config) -> Result<(), String> {
    let raw = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(path, raw).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn config_get_last_vault(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = config_path(&app)?;
    let config = read_config_at(&path)?;
    Ok(config.last_vault_path)
}

#[tauri::command]
pub fn config_set_last_vault(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let cfg_path = config_path(&app)?;
    let mut config = read_config_at(&cfg_path)?;
    config.last_vault_path = Some(path);
    write_config_at(&cfg_path, &config)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn write_at(path: &Path, content: &str) {
        if let Some(p) = path.parent() {
            fs::create_dir_all(p).unwrap();
        }
        fs::write(path, content).unwrap();
    }

    #[test]
    fn list_returns_md_and_folders_only_sorted() {
        let dir = TempDir::new().unwrap();
        let root = dir.path();
        write_at(&root.join("alpha.md"), "a");
        write_at(&root.join("ignored.txt"), "x");
        write_at(&root.join("notes").join("beta.md"), "b");
        write_at(&root.join("notes").join("gamma.txt"), "x");
        write_at(&root.join(".tippani").join("state.json"), "{}");

        let entries = list_dir_recursive(root).unwrap();
        let names: Vec<_> = entries.iter().map(|e| e.name.clone()).collect();
        assert_eq!(names, vec!["notes", "alpha.md"]);

        let notes = entries.iter().find(|e| e.name == "notes").unwrap();
        let children = notes.children.as_ref().unwrap();
        let child_names: Vec<_> = children.iter().map(|e| e.name.clone()).collect();
        assert_eq!(child_names, vec!["beta.md"]);
    }

    #[test]
    fn read_after_write_round_trips() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("note.md");
        note_write(path.to_string_lossy().to_string(), "hello".into()).unwrap();
        let content = note_read(path.to_string_lossy().to_string()).unwrap();
        assert_eq!(content, "hello");
    }

    #[test]
    fn write_creates_missing_parents() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("nested").join("deeper").join("note.md");
        note_write(path.to_string_lossy().to_string(), "x".into()).unwrap();
        assert!(path.exists());
    }

    #[test]
    fn create_errors_on_existing() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("foo.md");
        note_create(path.to_string_lossy().to_string()).unwrap();
        let err = note_create(path.to_string_lossy().to_string()).unwrap_err();
        assert!(err.contains("already exists"));
    }

    #[test]
    fn rename_moves_file() {
        let dir = TempDir::new().unwrap();
        let from = dir.path().join("a.md");
        let to = dir.path().join("nested").join("b.md");
        note_write(from.to_string_lossy().to_string(), "x".into()).unwrap();
        note_rename(
            from.to_string_lossy().to_string(),
            to.to_string_lossy().to_string(),
        )
        .unwrap();
        assert!(!from.exists());
        assert!(to.exists());
        assert_eq!(fs::read_to_string(&to).unwrap(), "x");
    }

    #[test]
    fn delete_removes_file() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("x.md");
        note_write(path.to_string_lossy().to_string(), "x".into()).unwrap();
        note_delete(path.to_string_lossy().to_string()).unwrap();
        assert!(!path.exists());
    }

    #[test]
    fn config_round_trips() {
        let dir = TempDir::new().unwrap();
        let cfg = dir.path().join("config.json");
        let c0 = read_config_at(&cfg).unwrap();
        assert_eq!(c0.last_vault_path, None);

        let mut c = c0;
        c.last_vault_path = Some("/some/path".to_string());
        write_config_at(&cfg, &c).unwrap();

        let c2 = read_config_at(&cfg).unwrap();
        assert_eq!(c2.last_vault_path, Some("/some/path".to_string()));
    }

    #[test]
    fn list_errors_when_path_missing() {
        let err =
            list_dir_recursive(Path::new("definitely-does-not-exist-tippani-test")).unwrap_err();
        assert!(err.contains("does not exist"));
    }
}
