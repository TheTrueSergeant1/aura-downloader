// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::os::windows::process::CommandExt;
use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::{Manager, WindowEvent};

const CREATE_NO_WINDOW: u32 = 0x08000000;

struct SidecarState(Mutex<Option<Child>>);

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Locate bundled aura-engine sidecar next to the main executable
            let exe_dir = std::env::current_exe()
                .ok()
                .and_then(|p| p.parent().map(|p| p.to_path_buf()));

            let mut child_proc: Option<Child> = None;

            if let Some(dir) = exe_dir {
                // Tauri strips the target triple when bundling next to the main .exe,
                // so check both names so it works in `tauri dev` and `tauri build`
                let prod_bin = dir.join("aura-engine.exe");
                let dev_bin = dir.join("bin").join("aura-engine-x86_64-pc-windows-msvc.exe");

                let target_bin = if prod_bin.exists() { prod_bin } else { dev_bin };

                if target_bin.exists() {
                    if let Ok(child) = Command::new(target_bin)
                        .creation_flags(CREATE_NO_WINDOW)
                        .spawn()
                    {
                        child_proc = Some(child);
                    }
                }
            }

            app.manage(SidecarState(Mutex::new(child_proc)));
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::Destroyed = event {
                let state = window.state::<SidecarState>();
                let mut guard = state.0.lock().unwrap();
                if let Some(mut child) = guard.take() {
                    let _ = child.kill();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}