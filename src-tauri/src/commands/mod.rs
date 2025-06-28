pub mod ai;
pub mod database;
pub mod pdf;

pub use ai::*;
pub use database::*;
pub use pdf::*;

// Re-export the simple commands here
#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// Models.dev API command - temporary debug version
#[tauri::command]
pub async fn fetch_models_dev_data() -> Result<serde_json::Value, String> {
    println!("DEBUG: Fetching models.dev data from Rust backend...");
    
    let client = reqwest::Client::new();
    let response = client
        .get("https://models.dev/api.json")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch models.dev data: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("API request failed with status: {}", response.status()));
    }
    
    let text = response.text().await
        .map_err(|e| format!("Failed to get response text: {}", e))?;
    
    println!("DEBUG: Raw response length: {} characters", text.len());
    println!("DEBUG: First 500 chars: {}", &text[..text.len().min(500)]);
    
    let data: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| format!("Failed to parse JSON response: {}", e))?;
    
    println!("DEBUG: Successfully parsed JSON response");
    if let Some(obj) = data.as_object() {
        println!("DEBUG: Top-level keys: {:?}", obj.keys().collect::<Vec<_>>());
    }
    
    Ok(data)
} 