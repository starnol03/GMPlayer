// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use app::algorithms::chunk::{chunk, ChunkedArray};
use app::algorithms;
use tauri::command;

fn main() {
  tauri::Builder::default()
  .invoke_handler(tauri::generate_handler![
    get_chunk,
    format_number
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

#[command]
fn detect_os() -> Option<&'static str> {
  match std::env::consts::OS {
      "android" => Some("Android"),
      "linux" => Some("Linux"),
      "windows" => Some("Windows"),
      _ => None,
  }
}

#[command]
fn get_chunk<T>(input: &[T], size: usize) -> ChunkedArray<T> 
where
    T: Clone,
{
  chunk(input, size)
}

#[command]
fn format_number(num: f64, language_data: &str) {
  algorithms::format_number::format_number(num, language_data);
}