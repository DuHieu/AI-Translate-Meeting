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

use std::fs::OpenOptions;
use std::io::Write;

fn log_file(msg: &str) {
    let temp_dir = std::env::temp_dir();
    let log_path = temp_dir.join("layameet_run.log");
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(log_path) {
        let _ = writeln!(file, "[{}] {}", chrono::Local::now().format("%Y-%m-%d %H:%M:%S"), msg);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    std::panic::set_hook(Box::new(|info| {
        let msg = if let Some(s) = info.payload().downcast_ref::<&str>() {
            (*s).to_string()
        } else if let Some(s) = info.payload().downcast_ref::<String>() {
            s.clone()
        } else {
            format!("{:?}", info)
        };
        log_file(&format!("FATAL PANIC: {} at {:?}", msg, info.location()));
    }));

    log_file("1. LayaMeet Companion Starting");
    let audio_engine = Arc::new(AudioEngine::new());
    log_file("2. AudioEngine created");
    let app_state = AppState { audio_engine };
    log_file("3. AppState created");

    let builder = tauri::Builder::default();
    log_file("4. Builder created");

    let builder = builder.plugin(tauri_plugin_shell::init());
    log_file("5. Shell plugin initialized");

    let builder = builder.manage(app_state);
    log_file("6. AppState managed");

    let builder = builder.setup(|app| {
        log_file("7. Inside setup hook");
        let windows = app.webview_windows();
        log_file(&format!("7a. Webview windows count: {}", windows.len()));
        for (label, win) in &windows {
            log_file(&format!("7b. Window: {}, is_visible: {:?}, hwnd: {:?}", label, win.is_visible(), win.hwnd()));
            let _ = win.show();
            let _ = win.set_focus();
        }
        log_file("7c. Setup hook finished successfully");
        Ok(())
    });
    log_file("8. Setup attached, generating context...");

    let context = tauri::generate_context!();
    log_file("9. Context generated. Invoking builder.run()...");

    let app = builder
        .invoke_handler(tauri::generate_handler![
            get_audio_devices,
            start_audio_capture,
            stop_audio_capture,
            set_click_through,
            save_meeting_minutes
        ])
        .build(context)
        .expect("error while building LayaMeet Desktop Companion application");

    log_file("Tauri app built successfully. Starting event loop...");

    app.run(|_app_handle, event| {
        match &event {
            tauri::RunEvent::ExitRequested { .. } => {
                log_file("RunEvent::ExitRequested received. Exiting cleanly.");
            }
            tauri::RunEvent::WindowEvent { label, event: win_event, .. } => {
                log_file(&format!("WindowEvent [{}]: {:?}", label, win_event));
            }
            tauri::RunEvent::WebviewEvent { label, event: web_event, .. } => {
                log_file(&format!("WebviewEvent [{}]: {:?}", label, web_event));
            }
            tauri::RunEvent::Ready => {
                log_file("RunEvent::Ready!");
            }
            tauri::RunEvent::Resumed => {
                log_file("RunEvent::Resumed!");
            }
            _ => {}
        }
    });
}
