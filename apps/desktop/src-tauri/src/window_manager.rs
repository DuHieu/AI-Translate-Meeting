use std::fs;
use std::path::PathBuf;
use tauri::WebviewWindow;

#[cfg(target_os = "windows")]
use windows::Win32::Foundation::HWND;
#[cfg(target_os = "windows")]
use windows::Win32::UI::WindowsAndMessaging::{
    GetWindowLongPtrW, SetWindowLongPtrW, GWL_EXSTYLE, WS_EX_LAYERED, WS_EX_TRANSPARENT,
};

/// Sets whether the window allows mouse clicks to pass through to the application below (e.g., Zoom/Meet)
pub fn set_click_through(window: &WebviewWindow, enabled: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let hwnd_val = window.hwnd().map_err(|e| e.to_string())?;
        let hwnd = HWND(hwnd_val.0 as _);

        unsafe {
            let cur_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
            let transparent_mask = (WS_EX_TRANSPARENT.0 | WS_EX_LAYERED.0) as isize;

            let new_style = if enabled {
                cur_style | transparent_mask
            } else {
                cur_style & !(WS_EX_TRANSPARENT.0 as isize)
            };

            SetWindowLongPtrW(hwnd, GWL_EXSTYLE, new_style);
        }
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = (window, enabled);
        Ok(())
    }
}

/// Saves meeting minutes and transcripts to the user's Documents/LayaMeet folder
pub fn save_minutes_file(filename: &str, content: &str) -> Result<String, String> {
    let doc_dir = dirs::document_dir().unwrap_or_else(|| PathBuf::from("."));
    let target_dir = doc_dir.join("LayaMeet");

    if !target_dir.exists() {
        fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;
    }

    let file_path = target_dir.join(filename);
    fs::write(&file_path, content).map_err(|e| e.to_string())?;

    Ok(file_path.to_string_lossy().to_string())
}
