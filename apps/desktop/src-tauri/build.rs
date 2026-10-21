use std::path::{Path, PathBuf};
use std::{env, fs};

/// sherpa-onnx is linked as shared libs on Windows. Its build script drops the runtime DLLs
/// next to the cargo output; copy them into `libs/` so `bundle.resources` can ship them beside
/// the exe (otherwise Windows loads the older System32 onnxruntime.dll and crashes).
fn stage_runtime_dlls() {
    println!("cargo:rerun-if-changed=build.rs");
    let manifest = PathBuf::from(env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR"));
    let libs = manifest.join("libs");
    fs::create_dir_all(&libs).expect("create libs dir");

    if env::var("CARGO_CFG_TARGET_OS").as_deref() != Ok("windows") {
        return;
    }
    // OUT_DIR = <target>/<profile>/build/<crate>-<hash>/out
    let out = PathBuf::from(env::var("OUT_DIR").expect("OUT_DIR"));
    let profile_dir: &Path = out.ancestors().nth(3).expect("profile dir");
    for name in [
        "onnxruntime.dll",
        "onnxruntime_providers_shared.dll",
        "sherpa-onnx-c-api.dll",
        "sherpa-onnx-cxx-api.dll",
    ] {
        let src = profile_dir.join(name);
        if src.exists() {
            fs::copy(&src, libs.join(name)).unwrap_or_else(|e| panic!("copy {name}: {e}"));
        } else {
            println!("cargo:warning=runtime DLL {name} not found in {}", profile_dir.display());
        }
    }
}

fn main() {
    stage_runtime_dlls();
    tauri_build::build()
}
