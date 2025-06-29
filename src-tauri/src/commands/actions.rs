use tauri::State;
use crate::database::{
    Database, CreateActionRequest, CreateSessionRequest, UserAction, StudySession, ActionStats
};

// ======================== Sessions Commands ========================

#[tauri::command]
pub async fn create_study_session(
    db: State<'_, Database>,
    req: CreateSessionRequest
) -> Result<StudySession, String> {
    db.create_session(req).await
        .map_err(|e| format!("Failed to create session: {}", e))
}

#[tauri::command]
pub async fn get_active_session(
    db: State<'_, Database>
) -> Result<Option<StudySession>, String> {
    db.get_active_session().await
        .map_err(|e| format!("Failed to get active session: {}", e))
}

#[tauri::command]
pub async fn end_study_session(
    db: State<'_, Database>,
    session_id: String
) -> Result<bool, String> {
    db.end_session(&session_id).await
        .map_err(|e| format!("Failed to end session: {}", e))
}

#[tauri::command]
pub async fn get_study_session(
    db: State<'_, Database>,
    session_id: String
) -> Result<Option<StudySession>, String> {
    db.get_session(&session_id).await
        .map_err(|e| format!("Failed to get session: {}", e))
}

#[tauri::command]
pub async fn get_study_sessions(
    db: State<'_, Database>,
    limit: Option<i64>,
    offset: Option<i64>
) -> Result<Vec<StudySession>, String> {
    db.get_sessions(limit, offset).await
        .map_err(|e| format!("Failed to get sessions: {}", e))
}

// ======================== Actions Commands ========================

#[tauri::command]
pub async fn record_user_action(
    db: State<'_, Database>,
    req: CreateActionRequest
) -> Result<UserAction, String> {
    db.record_action(req).await
        .map_err(|e| format!("Failed to record action: {}", e))
}

#[tauri::command]
pub async fn get_actions_by_session(
    db: State<'_, Database>,
    session_id: String
) -> Result<Vec<UserAction>, String> {
    db.get_actions_by_session(&session_id).await
        .map_err(|e| format!("Failed to get actions by session: {}", e))
}

#[tauri::command]
pub async fn get_actions_by_document(
    db: State<'_, Database>,
    document_id: String
) -> Result<Vec<UserAction>, String> {
    db.get_actions_by_document(&document_id).await
        .map_err(|e| format!("Failed to get actions by document: {}", e))
}

#[tauri::command]
pub async fn get_recent_actions(
    db: State<'_, Database>,
    limit: i64
) -> Result<Vec<UserAction>, String> {
    db.get_recent_actions(limit).await
        .map_err(|e| format!("Failed to get recent actions: {}", e))
}

// ======================== Analytics Commands ========================

#[tauri::command]
pub async fn get_action_statistics(
    db: State<'_, Database>
) -> Result<ActionStats, String> {
    db.get_action_stats().await
        .map_err(|e| format!("Failed to get action statistics: {}", e))
}

// ======================== Convenience Commands ========================

#[tauri::command]
pub async fn start_new_session(
    db: State<'_, Database>,
    title: String,
    session_type: Option<String>
) -> Result<StudySession, String> {
    // End any active session first
    if let Ok(Some(active_session)) = db.get_active_session().await {
        let _ = db.end_session(&active_session.id).await;
    }

    // Create new session
    let req = CreateSessionRequest {
        title,
        session_type,
        metadata: None,
    };

    db.create_session(req).await
        .map_err(|e| format!("Failed to start new session: {}", e))
}

#[tauri::command]
pub async fn record_simple_action(
    db: State<'_, Database>,
    action_type: String,
    document_id: Option<String>,
    data: Option<serde_json::Value>
) -> Result<UserAction, String> {
    // Get or create active session
    let session_id = match db.get_active_session().await {
        Ok(Some(session)) => session.id,
        Ok(None) => {
            // Create a default session
            let req = CreateSessionRequest {
                title: "Study Session".to_string(),
                session_type: Some("mixed".to_string()),
                metadata: None,
            };
            db.create_session(req).await
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

    db.record_action(req).await
        .map_err(|e| format!("Failed to record simple action: {}", e))
} 