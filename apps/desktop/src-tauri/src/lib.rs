pub mod audio_engine;
pub mod window_manager;

use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, State, WebviewWindow};
use audio_engine::{AudioDeviceInfo, AudioEngine};

struct AppState {
    audio_engine: Arc<AudioEngine>,
}

#[tauri::command]
fn get_audio_devices(state: State<AppState>) -> Vec<AudioDeviceInfo> {
    state.audio_engine.get_devices()
}

#[tauri::command]
fn start_audio_capture(app: AppHandle, state: State<AppState>) -> Result<(), String> {
    let app_handle = app.clone();
    state.audio_engine.start_capture(move |chunk| {
        let _ = app_handle.emit("audio-chunk", chunk);
    })
}

#[tauri::command]
fn stop_audio_capture(state: State<AppState>) -> Result<(), String> {
    state.audio_engine.stop_capture();
    Ok(())
}

#[tauri::command]
fn set_click_through(window: WebviewWindow, enabled: bool) -> Result<(), String> {
    window_manager::set_click_through(&window, enabled)
}

#[tauri::command]
fn save_meeting_minutes(filename: String, content: String) -> Result<String, String> {
    window_manager::save_minutes_file(&filename, &content)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let audio_engine = Arc::new(AudioEngine::new());
    let app_state = AppState { audio_engine };

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            get_audio_devices,
            start_audio_capture,
            stop_audio_capture,
            set_click_through,
            save_meeting_minutes
        ])
        .run(tauri::generate_context!())
        .expect("error while running LayaMeet Desktop Companion application");
}
