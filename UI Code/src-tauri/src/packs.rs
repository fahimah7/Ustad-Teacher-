//! Learning packs: every book of a grade in one file, moved phone to phone (share sheet,
//! Bluetooth, memory card) with no internet. A pack is a zip:
//!   ustad-pack.json            {"kind": "ustad-pack", "version": 2, "grade": 12, "books": ["g12-math"]}
//!   <book_id>/book.json, titles_en.json, glossary.json, packages/NNNN.json, practice/*.json, pages/NNNN.jpg
//! Received files are checked entry by entry: only those paths, only known book ids, bounded
//! sizes. Nothing in a pack is ever executed.

use crate::content::{valid_id, Library};
use std::fs;
use std::io::{Cursor, Read, Write};
use std::path::{Path, PathBuf};
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipArchive, ZipWriter};

const MAX_ENTRY: u64 = 30 * 1024 * 1024;
const MAX_TOTAL: u64 = 3 * 1024 * 1024 * 1024;

pub fn export(library: &Library, grade: i64, out_dir: &Path) -> Result<(PathBuf, u64), String> {
    let books: Vec<_> = library.scan().into_iter().filter(|b| b.grade == grade).collect();
    if books.is_empty() {
        return Err(format!("no books for grade {grade} on this device"));
    }
    fs::create_dir_all(out_dir).map_err(|e| e.to_string())?;
    let path = out_dir.join(format!("ustad-grade-{grade}.ustadpack"));
    let file = fs::File::create(&path).map_err(|e| e.to_string())?;
    let mut zip = ZipWriter::new(file);
    let json = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);
    let stored = SimpleFileOptions::default().compression_method(CompressionMethod::Stored); // images are already compressed

    let manifest = serde_json::json!({ "kind": "ustad-pack", "version": 2, "grade": grade, "books": books.iter().map(|b| &b.id).collect::<Vec<_>>() });
    zip.start_file("ustad-pack.json", json).map_err(|e| e.to_string())?;
    zip.write_all(manifest.to_string().as_bytes()).map_err(|e| e.to_string())?;

    for b in &books {
        let dir = library.dir_of(&b.id).ok_or("book vanished")?;
        for rel in book_files(&dir) {
            let bytes = fs::read(dir.join(&rel)).map_err(|e| e.to_string())?;
            let opts = if rel.ends_with(".json") { json } else { stored };
            zip.start_file(format!("{}/{}", b.id, rel), opts).map_err(|e| e.to_string())?;
            zip.write_all(&bytes).map_err(|e| e.to_string())?;
        }
    }
    zip.finish().map_err(|e| e.to_string())?;
    let size = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
    Ok((path, size))
}

/// The files of a book that travel in a pack (relative paths with forward slashes).
fn book_files(dir: &Path) -> Vec<String> {
    let mut out = vec!["book.json".to_string()];
    for extra in ["titles_en.json", "glossary.json"] {
        if dir.join(extra).exists() {
            out.push(extra.into());
        }
    }
    for sub in ["packages", "practice", "pages"] {
        if let Ok(entries) = fs::read_dir(dir.join(sub)) {
            let mut names: Vec<String> = entries.flatten().map(|e| e.file_name().to_string_lossy().to_string()).collect();
            names.sort();
            out.extend(names.into_iter().map(|n| format!("{sub}/{n}")).filter(|p| allowed(p)));
        }
    }
    out
}

/// Paths a pack may contain inside a book folder.
fn allowed(rel: &str) -> bool {
    let parts: Vec<&str> = rel.split('/').collect();
    let ok_name = |n: &str, exts: &[&str]| {
        let Some((stem, ext)) = n.rsplit_once('.') else { return false };
        !stem.is_empty()
            && stem.len() <= 40
            && stem.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
            && exts.contains(&ext.to_ascii_lowercase().as_str())
    };
    match parts.as_slice() {
        ["book.json"] | ["titles_en.json"] | ["glossary.json"] => true,
        ["packages", n] | ["practice", n] => ok_name(n, &["json"]),
        ["pages", n] => ok_name(n, &["jpg", "jpeg", "png", "webp"]),
        _ => false,
    }
}

pub fn import(library: &Library, bytes: Vec<u8>) -> Result<Vec<String>, String> {
    let mut zip = ZipArchive::new(Cursor::new(bytes)).map_err(|_| "That file isn't a learning pack.".to_string())?;
    let manifest: serde_json::Value = {
        let mut f = zip.by_name("ustad-pack.json").map_err(|_| "That file isn't a learning pack.".to_string())?;
        let mut s = String::new();
        f.by_ref().take(64 * 1024).read_to_string(&mut s).map_err(|e| e.to_string())?;
        serde_json::from_str(&s).map_err(|_| "That file isn't a learning pack.".to_string())?
    };
    if manifest["kind"] != "ustad-pack" {
        return Err("That file isn't a learning pack.".into());
    }
    let ids: Vec<String> = manifest["books"]
        .as_array()
        .ok_or("pack lists no books")?
        .iter()
        .filter_map(|v| v.as_str())
        .filter(|id| valid_id(id))
        .map(String::from)
        .collect();
    if ids.is_empty() {
        return Err("pack lists no books".into());
    }

    let staging = library.received.join(".incoming");
    let _ = fs::remove_dir_all(&staging);
    fs::create_dir_all(&staging).map_err(|e| e.to_string())?;
    let mut total = 0u64;
    for i in 0..zip.len() {
        let mut entry = zip.by_index(i).map_err(|e| e.to_string())?;
        if entry.is_dir() || entry.name() == "ustad-pack.json" {
            continue;
        }
        let name = entry.name().replace('\\', "/");
        let Some((id, rel)) = name.split_once('/') else { continue };
        if !ids.iter().any(|x| x == id) || !allowed(rel) || entry.size() > MAX_ENTRY {
            continue; // anything unexpected is skipped, never written
        }
        total += entry.size();
        if total > MAX_TOTAL {
            let _ = fs::remove_dir_all(&staging);
            return Err("pack is too large".into());
        }
        let target = staging.join(id).join(rel);
        fs::create_dir_all(target.parent().unwrap()).map_err(|e| e.to_string())?;
        let mut data = Vec::with_capacity(entry.size() as usize);
        entry.by_ref().take(MAX_ENTRY).read_to_end(&mut data).map_err(|e| e.to_string())?;
        fs::write(&target, data).map_err(|e| e.to_string())?;
    }

    let mut installed = Vec::new();
    for id in &ids {
        let from = staging.join(id);
        let ok = fs::read(from.join("book.json"))
            .ok()
            .and_then(|b| serde_json::from_slice::<serde_json::Value>(&b).ok())
            .is_some_and(|j| j["book_id"] == id.as_str() && j["grade"].is_i64() && j["title_fa"].is_string() && j["chapters"].as_array().is_some_and(|c| !c.is_empty()));
        if !ok {
            continue;
        }
        let to = library.received.join(id);
        let _ = fs::remove_dir_all(&to);
        fs::rename(&from, &to).map_err(|e| e.to_string())?;
        installed.push(id.clone());
    }
    let _ = fs::remove_dir_all(&staging);
    library.scan();
    if installed.is_empty() {
        return Err("That file isn't a learning pack.".into());
    }
    Ok(installed)
}
