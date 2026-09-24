/// Ustad's native shell: a window around the offline web bundle, nothing else.
/// No commands are exposed and no plugins are loaded, so the page has no way
/// to reach a network through the shell either.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running ustad");
}
