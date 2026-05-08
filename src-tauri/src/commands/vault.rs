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

fn is_hidden_name(name: &str) -> bool {
    name.starts_with('.')
}

fn is_md_path(p: &Path) -> bool {
    p.extension()
        .map(|s| s.eq_ignore_ascii_case(NOTE_EXT))
        .unwrap_or(false)
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
        if is_hidden_name(&name) {
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
            if !is_md_path(&path) {
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

/// Flat walk of a vault root. Skips dotfile dirs/files and returns only `.md` files.
pub fn walk_md_files(root: &Path) -> Result<Vec<PathBuf>, String> {
    if !root.exists() {
        return Err(format!("Path does not exist: {}", root.display()));
    }
    if !root.is_dir() {
        return Err(format!("Not a directory: {}", root.display()));
    }
    let mut out = Vec::new();
    walk_md_files_into(root, &mut out)?;
    Ok(out)
}

fn walk_md_files_into(dir: &Path, out: &mut Vec<PathBuf>) -> Result<(), String> {
    let read = fs::read_dir(dir).map_err(|e| e.to_string())?;
    for item in read {
        let entry = item.map_err(|e| e.to_string())?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();
        if is_hidden_name(&name) {
            continue;
        }
        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        if metadata.is_dir() {
            walk_md_files_into(&path, out)?;
        } else if metadata.is_file() && is_md_path(&path) {
            out.push(path);
        }
    }
    Ok(())
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
pub fn note_write_bytes(path: String, base64: String) -> Result<(), String> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};
    let bytes = STANDARD
        .decode(base64.as_bytes())
        .map_err(|e| format!("base64 decode failed: {}", e))?;
    let p = PathBuf::from(&path);
    if let Some(parent) = p.parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("mkdir failed: {}", e))?;
        }
    }
    fs::write(&p, bytes).map_err(|e| format!("write failed: {}", e))
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

// ---------------------------------------------------------------------------
// Vault search
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SearchHit {
    pub path: String,
    pub line: u32,
    pub preview: String,
    /// Char offset into `preview` where the match starts.
    pub match_start: u32,
    /// Char offset into `preview` where the match ends (exclusive).
    pub match_end: u32,
}

const SEARCH_PREVIEW_HALF: usize = 60;

/// Case-insensitive char-by-char substring search. Returns the char index in
/// `line` where the first match begins.
///
/// Operates on chars (not bytes) so it's safe across UTF-8 multi-byte
/// boundaries. `qlow_chars` must already be lowercased.
fn find_substring_ci(line_chars: &[char], qlow_chars: &[char]) -> Option<usize> {
    if qlow_chars.is_empty() || qlow_chars.len() > line_chars.len() {
        return None;
    }
    'outer: for i in 0..=(line_chars.len() - qlow_chars.len()) {
        for (j, qc) in qlow_chars.iter().enumerate() {
            let lc = line_chars[i + j]
                .to_lowercase()
                .next()
                .unwrap_or(line_chars[i + j]);
            if lc != *qc {
                continue 'outer;
            }
        }
        return Some(i);
    }
    None
}

/// Trim a line to a window of ~2*half chars centered on the match, returning
/// the preview text and char offsets of the match within it.
fn make_preview(
    line_chars: &[char],
    char_start: usize,
    query_char_len: usize,
    half: usize,
) -> (String, u32, u32) {
    let total = line_chars.len();
    let char_end = (char_start + query_char_len).min(total);
    let start = char_start.saturating_sub(half);
    let end = (char_end + half).min(total);
    let text: String = line_chars[start..end].iter().collect();
    let ms = (char_start - start) as u32;
    let me = (char_end - start) as u32;
    (text, ms, me)
}

#[tauri::command]
pub fn search_vault(root: String, query: String, limit: u32) -> Result<Vec<SearchHit>, String> {
    if query.is_empty() {
        return Ok(Vec::new());
    }
    let qlow_chars: Vec<char> = query.chars().flat_map(|c| c.to_lowercase()).collect();
    if qlow_chars.is_empty() {
        return Ok(Vec::new());
    }
    let limit_us = limit.max(1) as usize;
    let files = walk_md_files(&PathBuf::from(&root))?;
    let mut hits: Vec<SearchHit> = Vec::with_capacity(64);
    'outer: for file in files {
        let content = match fs::read_to_string(&file) {
            Ok(c) => c,
            Err(_) => continue,
        };
        for (i, line) in content.lines().enumerate() {
            let line_chars: Vec<char> = line.chars().collect();
            if let Some(cs) = find_substring_ci(&line_chars, &qlow_chars) {
                let (preview, ms, me) =
                    make_preview(&line_chars, cs, qlow_chars.len(), SEARCH_PREVIEW_HALF);
                hits.push(SearchHit {
                    path: file.to_string_lossy().to_string(),
                    line: (i as u32) + 1,
                    preview,
                    match_start: ms,
                    match_end: me,
                });
                if hits.len() >= limit_us {
                    break 'outer;
                }
            }
        }
    }
    Ok(hits)
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
    fn write_bytes_decodes_base64_and_writes_binary() {
        use base64::{engine::general_purpose::STANDARD, Engine as _};
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("img.png");
        let payload: &[u8] = &[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        let b64 = STANDARD.encode(payload);
        note_write_bytes(path.to_string_lossy().to_string(), b64).unwrap();
        let read_back = fs::read(&path).unwrap();
        assert_eq!(read_back, payload);
    }

    #[test]
    fn write_bytes_errors_on_bad_base64() {
        let dir = TempDir::new().unwrap();
        let path = dir.path().join("bad.bin");
        let err = note_write_bytes(
            path.to_string_lossy().to_string(),
            "!!!not-base64!!!".to_string(),
        )
        .unwrap_err();
        assert!(err.contains("base64 decode failed"));
        assert!(!path.exists());
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

    #[test]
    fn walk_md_files_skips_dotfiles_and_non_md() {
        let dir = TempDir::new().unwrap();
        let root = dir.path();
        write_at(&root.join("a.md"), "x");
        write_at(&root.join("notes.txt"), "x");
        write_at(&root.join(".hidden.md"), "x");
        write_at(&root.join(".tippani").join("state.json"), "{}");
        write_at(&root.join("nested").join("b.md"), "x");
        write_at(&root.join("nested").join(".dot.md"), "x");

        let files = walk_md_files(root).unwrap();
        let names: Vec<_> = files
            .iter()
            .map(|p| p.file_name().unwrap().to_string_lossy().to_string())
            .collect();
        let mut sorted = names.clone();
        sorted.sort();
        assert_eq!(sorted, vec!["a.md", "b.md"]);
    }

    #[test]
    fn search_finds_match_in_nested_md() {
        let dir = TempDir::new().unwrap();
        let root = dir.path();
        write_at(&root.join("a.md"), "alpha\nbeta TODO here\ngamma");
        write_at(
            &root.join("nested").join("b.md"),
            "no match\nanother TODO line\n",
        );

        let hits =
            search_vault(root.to_string_lossy().to_string(), "todo".to_string(), 100).unwrap();
        assert_eq!(hits.len(), 2);
        let lines: Vec<_> = hits.iter().map(|h| h.line).collect();
        // a.md matches on line 2; b.md on line 2 — order is FS-dependent so just assert both 2.
        assert!(lines.iter().all(|l| *l == 2));
        for h in &hits {
            let slice = &h.preview[h.match_start as usize..h.match_end as usize];
            assert_eq!(slice.to_lowercase(), "todo");
        }
    }

    #[test]
    fn search_skips_non_md_and_dotfiles() {
        let dir = TempDir::new().unwrap();
        let root = dir.path();
        write_at(&root.join("ignored.txt"), "TODO not here");
        write_at(&root.join(".hidden.md"), "TODO hidden");
        let hits =
            search_vault(root.to_string_lossy().to_string(), "todo".to_string(), 100).unwrap();
        assert!(hits.is_empty());
    }

    #[test]
    fn search_respects_limit() {
        let dir = TempDir::new().unwrap();
        let root = dir.path();
        let lines: Vec<&str> = (0..10).map(|_| "TODO match").collect();
        write_at(&root.join("a.md"), &lines.join("\n"));
        let hits = search_vault(root.to_string_lossy().to_string(), "todo".to_string(), 3).unwrap();
        assert_eq!(hits.len(), 3);
    }

    #[test]
    fn search_preview_centers_on_match() {
        let dir = TempDir::new().unwrap();
        let root = dir.path();
        let prefix = "x".repeat(200);
        let suffix = "y".repeat(200);
        let line = format!("{}MATCH{}", prefix, suffix);
        write_at(&root.join("a.md"), &line);
        let hits =
            search_vault(root.to_string_lossy().to_string(), "match".to_string(), 10).unwrap();
        assert_eq!(hits.len(), 1);
        let h = &hits[0];
        // Preview should be roughly 2*60 + 5 chars and should contain MATCH.
        assert!(h.preview.len() < 200);
        assert!(h.preview.to_lowercase().contains("match"));
        let slice = &h.preview[h.match_start as usize..h.match_end as usize];
        assert_eq!(slice, "MATCH");
    }

    #[test]
    fn search_empty_query_returns_empty() {
        let dir = TempDir::new().unwrap();
        write_at(&dir.path().join("a.md"), "anything");
        let hits = search_vault(dir.path().to_string_lossy().to_string(), "".into(), 10).unwrap();
        assert!(hits.is_empty());
    }

    #[test]
    fn search_is_case_insensitive() {
        let dir = TempDir::new().unwrap();
        write_at(&dir.path().join("a.md"), "Hello WORLD");
        let hits =
            search_vault(dir.path().to_string_lossy().to_string(), "world".into(), 10).unwrap();
        assert_eq!(hits.len(), 1);
        let h = &hits[0];
        let slice = &h.preview[h.match_start as usize..h.match_end as usize];
        assert_eq!(slice, "WORLD");
    }
}
