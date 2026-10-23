pub mod audio_engine;
pub mod local_stt;
pub mod window_manager;

use std::sync::{Arc, Mutex};
use serde::Serialize;
use sherpa_onnx::OnlineRecognizer;
use tauri::{AppHandle, Emitter, Manager, State, WebviewWindow};
use audio_engine::{AudioDeviceInfo, AudioEngine};
use local_stt::LocalStt;

struct AppState {
    audio_engine: Arc<AudioEngine>,
    recognizer: Mutex<Option<Arc<OnlineRecognizer>>>,
    /// Worker fed by the webview's own VAD-gated mic audio (`push_local_audio`).
    webview_stt: Mutex<Option<LocalStt>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LocalSttStatus {
    model_downloaded: bool,
    loaded: bool,
}

#[tauri::command]
fn local_stt_status(app: AppHandle, state: State<AppState>) -> Result<LocalSttStatus, String> {
    let dir = local_stt::model_dir(&app.path().app_local_data_dir().map_err(|e| e.to_string())?);
    let loaded = state.recognizer.lock().map_err(|e| e.to_string())?.is_some();
    Ok(LocalSttStatus { model_downloaded: local_stt::is_model_ready(&dir), loaded })
}

/// Downloads the model on first use (emits `local-stt-download`) and loads the recognizer.
#[tauri::command]
async fn prepare_local_stt(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    if state.recognizer.lock().map_err(|e| e.to_string())?.is_some() {
        return Ok(());
    }
    let dir = local_stt::model_dir(&app.path().app_local_data_dir().map_err(|e| e.to_string())?);
    let progress_app = app.clone();
    local_stt::download_model(&dir, move |p| {
        let _ = progress_app.emit("local-stt-download", p);
    })
    .await?;
    let threads = std::thread::available_parallelism().map(|n| (n.get() / 2).clamp(1, 4)).unwrap_or(2) as i32;
    let recognizer = tauri::async_runtime::spawn_blocking(move || local_stt::load_recognizer(&dir, threads))
        .await
        .map_err(|e| e.to_string())??;
    *state.recognizer.lock().map_err(|e| e.to_string())? = Some(recognizer);
    Ok(())
}

/// Starts the on-device STT session for audio pushed from the webview (LiveKit mic track).
#[tauri::command]
fn start_local_stt(app: AppHandle, state: State<AppState>) -> Result<(), String> {
    let recognizer = state
        .recognizer
        .lock()
        .map_err(|e| e.to_string())?
        .clone()
        .ok_or("Local STT is not prepared; call prepare_local_stt first")?;
    let stt = LocalStt::start(recognizer, move |t| {
        let _ = app.emit("local-transcript", t);
    });
    *state.webview_stt.lock().map_err(|e| e.to_string())? = Some(stt);
    Ok(())
}

#[tauri::command]
fn stop_local_stt(state: State<AppState>) -> Result<(), String> {
    *state.webview_stt.lock().map_err(|e| e.to_string())? = None;
    Ok(())
}

/// Raw body: little-endian PCM16 mono @ 16 kHz, already gated by the webview VAD.
#[tauri::command]
fn push_local_audio(request: tauri::ipc::Request, state: State<AppState>) -> Result<(), String> {
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else {
        return Err("push_local_audio expects a raw binary body".into());
    };
    let samples: Vec<f32> = bytes
        .chunks_exact(2)
        .map(|b| i16::from_le_bytes([b[0], b[1]]) as f32 / 32768.0)
        .collect();
    if let Some(stt) = state.webview_stt.lock().map_err(|e| e.to_string())?.as_ref() {
        stt.push("mic", samples, true);
    }
    Ok(())
}

#[tauri::command]
fn flush_local_audio(state: State<AppState>) -> Result<(), String> {
    if let Some(stt) = state.webview_stt.lock().map_err(|e| e.to_string())?.as_ref() {
        stt.flush("mic");
    }
    Ok(())
}

#[tauri::command]
fn get_audio_devices(state: State<AppState>) -> Vec<AudioDeviceInfo> {
    state.audio_engine.get_devices()
}

#[tauri::command]
fn start_audio_capture(app: AppHandle, state: State<AppState>, local_stt: Option<bool>) -> Result<(), String> {
    let app_handle = app.clone();
    if local_stt.unwrap_or(false) {
        // On-device STT: audio never leaves the machine, only `local-transcript` text events do.
        let recognizer = state
            .recognizer
            .lock()
            .map_err(|e| e.to_string())?
            .clone()
            .ok_or("Local STT is not prepared; call prepare_local_stt first")?;
        let emit_app = app.clone();
        // The capture closure owns the worker; it is dropped (worker stops) when capture stops.
        let stt = LocalStt::start(recognizer, move |t| {
            let _ = emit_app.emit("local-transcript", t);
        });
        return state.audio_engine.start_capture(move |chunk| {
            stt.push(&chunk.channel_type, chunk.samples, chunk.is_speech);
        });
    }
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

#[tauri::command]
fn set_window_mode(window: WebviewWindow, mode: String) -> Result<(), String> {
    window_manager::set_window_mode(&window, &mode)
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct DesktopUpdateProgress {
    downloaded: u64,
    total: u64,
    percent: u8,
}

#[tauri::command]
fn get_desktop_app_version(app: AppHandle) -> String {
    app.package_info().version.to_string()
}

/// Downloads the NSIS installer from `installer_url` to `%TEMP%`, emits progress,
/// launches the installer (silent upgrade `/S` by default) and exits the current app.
#[tauri::command]
async fn install_desktop_update(
    app: AppHandle,
    installer_url: String,
    silent: Option<bool>,
) -> Result<(), String> {
    if !installer_url.starts_with("https://") && !installer_url.starts_with("http://") {
        return Err("URL bộ cài đặt không hợp lệ (chỉ chấp nhận http/https)".into());
    }

    let temp_dir = std::env::temp_dir();
    let part_path = temp_dir.join("LayaMeet-Desktop-Update-Setup.exe.part");
    let final_path = temp_dir.join("LayaMeet-Desktop-Update-Setup.exe");

    let client = reqwest::Client::new();
    let mut resp = client
        .get(&installer_url)
        .send()
        .await
        .and_then(|r| r.error_for_status())
        .map_err(|e| format!("Không thể tải bản cập nhật: {e}"))?;

    let total = resp.content_length().unwrap_or(0);
    let mut file = std::fs::File::create(&part_path).map_err(|e| e.to_string())?;
    let mut downloaded = 0u64;

    while let Some(chunk) = resp.chunk().await.map_err(|e| e.to_string())? {
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;
        let percent = if total > 0 {
            ((downloaded.saturating_mul(100)) / total).min(100) as u8
        } else {
            50
        };
        let _ = app.emit(
            "desktop-update-progress",
            DesktopUpdateProgress {
                downloaded,
                total,
                percent,
            },
        );
    }
    drop(file);

    if downloaded < 512_000 {
        let _ = std::fs::remove_file(&part_path);
        return Err("Tệp cài đặt tải về không hợp lệ hoặc bị hỏng.".into());
    }

    let _ = std::fs::remove_file(&final_path);
    std::fs::rename(&part_path, &final_path).map_err(|e| e.to_string())?;

    if silent.unwrap_or(false) {
        let exe_to_relaunch = std::env::current_exe()
            .ok()
            .and_then(|p| p.to_str().map(|s| s.to_string()))
            .unwrap_or_default();
        let ps_script = format!(
            "Start-Sleep -Milliseconds 600; Start-Process -FilePath '{}' -ArgumentList '/S' -Wait; if ('{}' -ne '' -and (Test-Path '{}')) {{ Start-Process -FilePath '{}' }}",
            final_path.to_string_lossy().replace('\'', "''"),
            exe_to_relaunch.replace('\'', "''"),
            exe_to_relaunch.replace('\'', "''"),
            exe_to_relaunch.replace('\'', "''")
        );
        std::process::Command::new("powershell")
            .args(["-NoProfile", "-WindowStyle", "Hidden", "-Command", &ps_script])
            .spawn()
            .map_err(|e| format!("Không thể khởi chạy trình cập nhật tự động: {e}"))?;
    } else {
        std::process::Command::new(&final_path)
            .spawn()
            .map_err(|e| format!("Không thể khởi chạy trình cài đặt: {e}"))?;
    }

    app.exit(0);
    Ok(())
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
    let app_state = AppState { audio_engine, recognizer: Mutex::new(None), webview_stt: Mutex::new(None) };
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
            local_stt_status,
            prepare_local_stt,
            start_local_stt,
            stop_local_stt,
            push_local_audio,
            flush_local_audio,
            start_audio_capture,
            stop_audio_capture,
            set_click_through,
            save_meeting_minutes,
            set_window_mode,
            get_desktop_app_version,
            install_desktop_update
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
