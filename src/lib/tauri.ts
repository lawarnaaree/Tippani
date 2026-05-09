// This file used to hold the Tauri-specific implementation. The platform
// layer at src/lib/platform/* now selects between Tauri and a web (File
// System Access API) backend at runtime. Existing imports of "../lib/tauri"
// continue to work via this re-export.

export * from "./platform";
