//! Books on this device. A book is a folder laid out by the pipeline (pipeline/render_pages.py):
//! `book.json`, `pages/NNNN.jpg`, `packages/NNNN.json` (the teacher's notes for each page),
//! optional `practice/*.json`, `titles_en.json` and `glossary.json`. Books ship with the app (resources), live in
//! the repo's `content/` folder during development, or arrive later as learning packs.

use serde::Serialize;
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BookSummary {
    pub id: String,
    pub grade: i64,
    pub subject: String,
    pub title_fa: String,
    pub subject_fa: String,
    pub page_count: i64,
    pub size_bytes: u64,
    pub received: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BookData {
    pub book: Value,
    pub packages: Vec<Value>,
    pub practice: Vec<Value>,
    pub titles_en: Option<Value>,
    pub glossary: Option<Value>,
}

pub struct Library {
    /// Folders that may hold books, in priority order. Received packs come last.
    roots: Vec<PathBuf>,
    pub received: PathBuf,
    books: Mutex<HashMap<String, PathBuf>>,
}

impl Library {
    pub fn new(app: &AppHandle) -> Self {
        let mut roots = Vec::new();
        if let Ok(dir) = std::env::var("SCHOOL_CONTENT_DIR") {
            roots.push(PathBuf::from(dir));
        }
        if let Ok(res) = app.path().resource_dir() {
            roots.push(res.join("content"));
        }
        if let Some(exe_dir) = std::env::current_exe().ok().and_then(|e| e.parent().map(Path::to_path_buf)) {
            roots.push(exe_dir.join("content"));
        }
        if cfg!(debug_assertions) {
            // Development: the repository's content folder, next to "UI Code".
            roots.push(Path::new(env!("CARGO_MANIFEST_DIR")).join("..").join("..").join("content"));
        }
        let received = app
            .path()
            .app_data_dir()
            .map(|d| d.join("content"))
            .unwrap_or_else(|_| PathBuf::from("received-content"));
        let _ = fs::create_dir_all(&received);
        roots.push(received.clone());
        Library { roots, received, books: Mutex::new(HashMap::new()) }
    }

    /// Books that are ready to study: book.json has a grade, a title and chapters. Books still
    /// being prepared (e.g. only rendered pages) are skipped.
    pub fn scan(&self) -> Vec<BookSummary> {
        let mut found: Vec<BookSummary> = Vec::new();
        let mut dirs: HashMap<String, PathBuf> = HashMap::new();
        for root in &self.roots {
            let Ok(entries) = fs::read_dir(root) else { continue };
            for entry in entries.flatten() {
                let dir = entry.path();
                let Some(j) = read_json(&dir.join("book.json")) else { continue };
                let (Some(id), Some(grade), Some(title)) = (j["book_id"].as_str(), j["grade"].as_i64(), j["title_fa"].as_str()) else { continue };
                if j["chapters"].as_array().map_or(true, |c| c.is_empty()) || dirs.contains_key(id) || !valid_id(id) {
                    continue;
                }
                dirs.insert(id.to_string(), dir.clone());
                found.push(BookSummary {
                    id: id.to_string(),
                    grade,
                    subject: j["subject"].as_str().unwrap_or("").to_string(),
                    title_fa: title.to_string(),
                    subject_fa: j["subject_fa"].as_str().unwrap_or(title).to_string(),
                    page_count: j["page_count"].as_i64().unwrap_or(0),
                    size_bytes: dir_size(&dir),
                    received: root == &self.received,
                });
            }
        }
        found.sort_by(|a, b| a.grade.cmp(&b.grade).then(a.subject.cmp(&b.subject)));
        *self.books.lock().unwrap() = dirs;
        found
    }

    pub fn dir_of(&self, id: &str) -> Option<PathBuf> {
        if let Some(d) = self.books.lock().unwrap().get(id) {
            return Some(d.clone());
        }
        self.scan();
        self.books.lock().unwrap().get(id).cloned()
    }

    pub fn load(&self, id: &str) -> Result<BookData, String> {
        let dir = self.dir_of(id).ok_or_else(|| format!("no book {id}"))?;
        let book = read_json(&dir.join("book.json")).ok_or("book.json unreadable")?;
        let count = book["page_count"].as_u64().unwrap_or(0).min(5000) as usize;
        let packages = (1..=count)
            .map(|p| read_json(&dir.join("packages").join(format!("{p:04}.json"))).unwrap_or(Value::Null))
            .collect();
        let mut practice: Vec<(String, Value)> = fs::read_dir(dir.join("practice"))
            .map(|entries| {
                entries
                    .flatten()
                    .filter(|e| e.path().extension().is_some_and(|x| x == "json"))
                    .filter_map(|e| Some((e.file_name().to_string_lossy().to_string(), read_json(&e.path())?)))
                    .collect()
            })
            .unwrap_or_default();
        practice.sort_by(|a, b| a.0.cmp(&b.0));
        Ok(BookData {
            book,
            packages,
            practice: practice.into_iter().map(|(_, v)| v).collect(),
            titles_en: read_json(&dir.join("titles_en.json")),
            glossary: read_json(&dir.join("glossary.json")),
        })
    }

    pub fn free_bytes(&self) -> Option<u64> {
        fs2::available_space(&self.received).ok()
    }
}

pub fn valid_id(id: &str) -> bool {
    !id.is_empty() && id.len() <= 64 && id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

fn read_json(path: &Path) -> Option<Value> {
    serde_json::from_slice(&fs::read(path).ok()?).ok()
}

pub fn dir_size(dir: &Path) -> u64 {
    let Ok(entries) = fs::read_dir(dir) else { return 0 };
    entries
        .flatten()
        .map(|e| match e.metadata() {
            Ok(m) if m.is_dir() => dir_size(&e.path()),
            Ok(m) => m.len(),
            Err(_) => 0,
        })
        .sum()
}

/// Serves `book://localhost/<book_id>/pages/<NNNN>.jpg` (http://book.localhost/... on Windows).
/// Only page images of known books: nothing else on the disk is reachable.
pub fn serve_page(library: &Library, uri_path: &str) -> tauri::http::Response<Vec<u8>> {
    let respond = |status: u16, kind: &str, body: Vec<u8>| {
        tauri::http::Response::builder()
            .status(status)
            .header("Content-Type", kind)
            .header("Cache-Control", "max-age=31536000, immutable")
            .body(body)
            .unwrap()
    };
    let path = percent_decode(uri_path);
    let parts: Vec<&str> = path.trim_start_matches('/').split('/').collect();
    let [id, "pages", file] = parts.as_slice() else { return respond(404, "text/plain", b"not found".to_vec()) };
    let (stem, ext) = file.rsplit_once('.').unwrap_or((file, ""));
    let kind = match ext.to_ascii_lowercase().as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "webp" => "image/webp",
        _ => return respond(404, "text/plain", b"not found".to_vec()),
    };
    if !valid_id(id) || stem.is_empty() || stem.len() > 6 || !stem.chars().all(|c| c.is_ascii_digit()) {
        return respond(404, "text/plain", b"not found".to_vec());
    }
    match library.dir_of(id).and_then(|d| fs::read(d.join("pages").join(file)).ok()) {
        Some(bytes) => respond(200, kind, bytes),
        None => respond(404, "text/plain", b"not found".to_vec()),
    }
}

fn percent_decode(s: &str) -> String {
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            let hex = |c: u8| (c as char).to_digit(16);
            if let (Some(h), Some(l)) = (hex(bytes[i + 1]), hex(bytes[i + 2])) {
                out.push((h * 16 + l) as u8);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).to_string()
}
