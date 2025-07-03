use tauri::State;
use crate::database::{
    Database, CreateActionRequest, CreateSessionRequest, UserAction, StudySession, ActionStats
};
use tokio::sync::Mutex;
use std::sync::Arc;

pub type DatabaseState = Arc<Mutex<Option<Database>>>;

// ======================== Sessions Commands ========================

#[tauri::command]
pub async fn create_study_session(
    state: State<'_, DatabaseState>,
    req: CreateSessionRequest
) -> Result<StudySession, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.create_session(req).await
        .map_err(|e| format!("Failed to create session: {}", e))
}

#[tauri::command]
pub async fn get_active_session(
    state: State<'_, DatabaseState>
) -> Result<Option<StudySession>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.get_active_session().await
        .map_err(|e| format!("Failed to get active session: {}", e))
}

#[tauri::command]
pub async fn end_study_session(
    state: State<'_, DatabaseState>,
    session_id: String
) -> Result<bool, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.end_session(&session_id).await
        .map_err(|e| format!("Failed to end session: {}", e))
}

#[tauri::command]
pub async fn get_study_session(
    state: State<'_, DatabaseState>,
    session_id: String
) -> Result<Option<StudySession>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.get_session(&session_id).await
        .map_err(|e| format!("Failed to get session: {}", e))
}

#[tauri::command]
pub async fn get_study_sessions(
    state: State<'_, DatabaseState>,
    limit: Option<i64>,
    offset: Option<i64>
) -> Result<Vec<StudySession>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.get_sessions(limit, offset).await
        .map_err(|e| format!("Failed to get sessions: {}", e))
}

// ======================== Actions Commands ========================

#[tauri::command]
pub async fn record_user_action(
    state: State<'_, DatabaseState>,
    req: CreateActionRequest
) -> Result<UserAction, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.record_action(req).await
        .map_err(|e| format!("Failed to record action: {}", e))
}

#[tauri::command]
pub async fn get_actions_by_session(
    state: State<'_, DatabaseState>,
    session_id: String
) -> Result<Vec<UserAction>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.get_actions_by_session(&session_id).await
        .map_err(|e| format!("Failed to get actions by session: {}", e))
}

#[tauri::command]
pub async fn get_actions_by_document(
    state: State<'_, DatabaseState>,
    document_id: String
) -> Result<Vec<UserAction>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.get_actions_by_document(&document_id).await
        .map_err(|e| format!("Failed to get actions by document: {}", e))
}

#[tauri::command]
pub async fn get_recent_actions(
    state: State<'_, DatabaseState>,
    limit: i64
) -> Result<Vec<UserAction>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.get_recent_actions(limit).await
        .map_err(|e| format!("Failed to get recent actions: {}", e))
}

// ======================== Analytics Commands ========================

#[tauri::command]
pub async fn get_action_statistics(
    state: State<'_, DatabaseState>
) -> Result<ActionStats, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.get_action_stats().await
        .map_err(|e| format!("Failed to get action statistics: {}", e))
}

// ======================== Convenience Commands ========================

#[tauri::command]
pub async fn start_new_session(
    state: State<'_, DatabaseState>,
    title: String,
    session_type: Option<String>
) -> Result<StudySession, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    // End any active session first
    if let Ok(Some(active_session)) = database.get_active_session().await {
        let _ = database.end_session(&active_session.id).await;
    }

    // Create new session
    let req = CreateSessionRequest {
        title,
        session_type,
        metadata: None,
    };

    database.create_session(req).await
        .map_err(|e| format!("Failed to start new session: {}", e))
}

#[tauri::command]
pub async fn record_simple_action(
    state: State<'_, DatabaseState>,
    action_type: String,
    document_id: Option<String>,
    data: Option<serde_json::Value>
) -> Result<UserAction, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    // Get or create active session
    let session_id = match database.get_active_session().await {
        Ok(Some(session)) => session.id,
        Ok(None) => {
            // Create a default session
            let req = CreateSessionRequest {
                title: "Study Session".to_string(),
                session_type: Some("mixed".to_string()),
                metadata: None,
            };
            database.create_session(req).await
                .map_err(|e| format!("Failed to create default session: {}", e))?
                .id
        }
        Err(e) => return Err(format!("Failed to get active session: {}", e)),
    };

    let req = CreateActionRequest {
        action_type,
        session_id,
        data: data.unwrap_or_else(|| serde_json::json!({})),
        document_ids: document_id.map(|id| vec![id]),
        category_ids: None,
        duration: None,
        metadata: None,
    };

    database.record_action(req).await
        .map_err(|e| format!("Failed to record simple action: {}", e))
} 