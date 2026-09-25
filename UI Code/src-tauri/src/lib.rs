/// Ustad's native side. The page reaches it only through these commands and the `book:` scheme:
/// books from disk, the local teacher model (llama-server on 127.0.0.1), disk space and learning
/// packs. No plugins are loaded, and nothing here opens a connection beyond the loopback teacher.
mod content;
mod packs;
mod tutor;

use content::{BookData, BookSummary, Library};
use serde::Serialize;
use std::sync::Arc;
use tauri::ipc::{Channel, InvokeBody, Request};
use tauri::{Manager, RunEvent, State};
use tutor::{ChatEvent, ChatMessage, Tutor, TutorStatus};

#[tauri::command]
fn list_books(library: State<'_, Arc<Library>>) -> Vec<BookSummary> {
    library.scan()
}

#[tauri::command]
async fn load_book(library: State<'_, Arc<Library>>, id: String) -> Result<BookData, String> {
    let library = library.inner().clone();
    tauri::async_runtime::spawn_blocking(move || library.load(&id)).await.map_err(|e| e.to_string())?
}

#[tauri::command]
fn tutor_status(tutor: State<'_, Arc<Tutor>>) -> TutorStatus {
    tutor.status()
}

#[tauri::command]
async fn tutor_chat(tutor: State<'_, Arc<Tutor>>, id: u32, messages: Vec<ChatMessage>, on_event: Channel<ChatEvent>) -> Result<(), String> {
    let tutor = tutor.inner().clone();
    tauri::async_runtime::spawn_blocking(move || tutor.chat(id, messages, &on_event)).await.map_err(|e| e.to_string())?
}

#[tauri::command]
fn tutor_cancel(tutor: State<'_, Arc<Tutor>>, id: u32) {
    tutor.cancel(id);
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StorageInfo {
    content_bytes: u64,
    free_bytes: Option<u64>,
}

#[tauri::command]
async fn storage(library: State<'_, Arc<Library>>) -> Result<StorageInfo, String> {
    let library = library.inner().clone();
    tauri::async_runtime::spawn_blocking(move || StorageInfo {
        content_bytes: library.scan().iter().map(|b| b.size_bytes).sum(),
        free_bytes: library.free_bytes(),
    })
    .await
    .map_err(|e| e.to_string())
}

#[derive(Serialize)]
struct Exported {
    path: String,
    bytes: u64,
}

#[tauri::command]
async fn export_pack(app: tauri::AppHandle, library: State<'_, Arc<Library>>, grade: i64) -> Result<Exported, String> {
    let library = library.inner().clone();
    let out = app.path().download_dir().or_else(|_| app.path().document_dir()).map_err(|e| e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || packs::export(&library, grade, &out))
        .await
        .map_err(|e| e.to_string())?
        .map(|(path, bytes)| Exported { path: path.display().to_string(), bytes })
}

#[tauri::command]
async fn import_pack(library: State<'_, Arc<Library>>, request: Request<'_>) -> Result<Vec<String>, String> {
    let InvokeBody::Raw(bytes) = request.body() else { return Err("expected the pack file".into()) };
    let bytes = bytes.clone();
    let library = library.inner().clone();
    tauri::async_runtime::spawn_blocking(move || packs::import(&library, bytes)).await.map_err(|e| e.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .register_uri_scheme_protocol("book", |ctx, request| {
            let library = ctx.app_handle().state::<Arc<Library>>();
            content::serve_page(&library, request.uri().path())
        })
        .setup(|app| {
            let library = Arc::new(Library::new(app.handle()));
            library.scan();
            app.manage(library);
            let tutor = Arc::new(Tutor::new(app.path().resource_dir().ok()));
            tutor.clone().supervise();
            app.manage(tutor);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![list_books, load_book, tutor_status, tutor_chat, tutor_cancel, storage, export_pack, import_pack])
        .build(tauri::generate_context!())
        .expect("error while building ustad");

    app.run(|handle, event| {
        if let RunEvent::Exit = event {
            handle.state::<Arc<Tutor>>().stop();
        }
    });
}
