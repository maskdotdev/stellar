use sqlx::Row;
use chrono::{DateTime, Utc};
use uuid::Uuid;
use std::collections::HashMap;
use super::{Database, types::{StudySession, UserAction, CreateSessionRequest, CreateActionRequest, ActionStats}};

impl Database {
    // Create a new study session
    pub async fn create_session(&self, req: CreateSessionRequest) -> Result<StudySession, sqlx::Error> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let session_type = req.session_type.unwrap_or_else(|| "mixed".to_string());
        let metadata_json = req.metadata.as_ref().map(|m| serde_json::to_string(m).unwrap_or_else(|_| "{}".to_string()));

        let session = StudySession {
            id: id.clone(),
            title: req.title.clone(),
            start_time: now,
            end_time: None,
            is_active: true,
            session_type: session_type.clone(),
            total_duration: 0,
            documents_accessed: Vec::new(),
            categories_accessed: Vec::new(),
            conversation_ids: Vec::new(),
            metadata: req.metadata.clone(),
        };

        sqlx::query(
            r#"
            INSERT INTO study_sessions (id, title, start_time, end_time, is_active, session_type, total_duration, documents_accessed, categories_accessed, conversation_ids, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&req.title)
        .bind(now.to_rfc3339())
        .bind(None::<String>)
        .bind(true)
        .bind(&session_type)
        .bind(0)
        .bind("[]")
        .bind("[]")
        .bind("[]")
        .bind(metadata_json)
        .execute(&self.pool)
        .await?;

        Ok(session)
    }

    // Get current active session
    pub async fn get_active_session(&self) -> Result<Option<StudySession>, sqlx::Error> {
        let row = sqlx::query("SELECT * FROM study_sessions WHERE is_active = TRUE ORDER BY start_time DESC LIMIT 1")
            .fetch_optional(&self.pool)
            .await?;

        if let Some(row) = row {
            Ok(Some(self.row_to_session(row)?))
        } else {
            Ok(None)
        }
    }

    // End a study session
    pub async fn end_session(&self, session_id: &str) -> Result<bool, sqlx::Error> {
        let now = Utc::now();
        
        // Calculate total duration
        let session = self.get_session(session_id).await?;
        let total_duration = if let Some(session) = session {
            (now - session.start_time).num_seconds()
        } else {
            0
        };

        let result = sqlx::query(
            "UPDATE study_sessions SET is_active = FALSE, end_time = ?, total_duration = ? WHERE id = ?"
        )
        .bind(now.to_rfc3339())
        .bind(total_duration)
        .bind(session_id)
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    // Get a specific session
    pub async fn get_session(&self, session_id: &str) -> Result<Option<StudySession>, sqlx::Error> {
        let row = sqlx::query("SELECT * FROM study_sessions WHERE id = ?")
            .bind(session_id)
            .fetch_optional(&self.pool)
            .await?;

        if let Some(row) = row {
            Ok(Some(self.row_to_session(row)?))
        } else {
            Ok(None)
        }
    }

    // Get all sessions with pagination
    pub async fn get_sessions(&self, limit: Option<i64>, offset: Option<i64>) -> Result<Vec<StudySession>, sqlx::Error> {
        let limit = limit.unwrap_or(50);
        let offset = offset.unwrap_or(0);

        let rows = sqlx::query("SELECT * FROM study_sessions ORDER BY start_time DESC LIMIT ? OFFSET ?")
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.pool)
            .await?;

        let mut sessions = Vec::new();
        for row in rows {
            sessions.push(self.row_to_session(row)?);
        }

        Ok(sessions)
    }

    // Record a user action
    pub async fn record_action(&self, req: CreateActionRequest) -> Result<UserAction, sqlx::Error> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let data_json = serde_json::to_string(&req.data).unwrap_or_else(|_| "{}".to_string());
        let document_ids_json = req.document_ids.as_ref().map(|ids| serde_json::to_string(ids).unwrap_or_else(|_| "[]".to_string()));
        let category_ids_json = req.category_ids.as_ref().map(|ids| serde_json::to_string(ids).unwrap_or_else(|_| "[]".to_string()));
        let metadata_json = req.metadata.as_ref().map(|m| serde_json::to_string(m).unwrap_or_else(|_| "{}".to_string()));

        let action = UserAction {
            id: id.clone(),
            action_type: req.action_type.clone(),
            timestamp: now,
            session_id: req.session_id.clone(),
            data: req.data.clone(),
            document_ids: req.document_ids.clone(),
            category_ids: req.category_ids.clone(),
            duration: req.duration,
            metadata: req.metadata.clone(),
        };

        sqlx::query(
            r#"
            INSERT INTO user_actions (id, action_type, timestamp, session_id, data, document_ids, category_ids, duration, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&req.action_type)
        .bind(now.to_rfc3339())
        .bind(&req.session_id)
        .bind(data_json)
        .bind(document_ids_json)
        .bind(category_ids_json)
        .bind(req.duration)
        .bind(metadata_json)
        .execute(&self.pool)
        .await?;

        Ok(action)
    }

    // Get actions by session
    pub async fn get_actions_by_session(&self, session_id: &str) -> Result<Vec<UserAction>, sqlx::Error> {
        let rows = sqlx::query("SELECT * FROM user_actions WHERE session_id = ? ORDER BY timestamp ASC")
            .bind(session_id)
            .fetch_all(&self.pool)
            .await?;

        let mut actions = Vec::new();
        for row in rows {
            actions.push(self.row_to_action(row)?);
        }

        Ok(actions)
    }

    // Get actions by document
    pub async fn get_actions_by_document(&self, document_id: &str) -> Result<Vec<UserAction>, sqlx::Error> {
        let rows = sqlx::query("SELECT * FROM user_actions WHERE document_ids LIKE ? ORDER BY timestamp DESC")
            .bind(format!("%\"{}\",%", document_id))
            .fetch_all(&self.pool)
            .await?;

        let mut actions = Vec::new();
        for row in rows {
            let action = self.row_to_action(row)?;
            // Double-check that the document ID is actually in the array
            if let Some(doc_ids) = &action.document_ids {
                if doc_ids.contains(&document_id.to_string()) {
                    actions.push(action);
                }
            }
        }

        Ok(actions)
    }

    // Get actions in time range
    pub async fn get_actions_by_time_range(&self, start_time: DateTime<Utc>, end_time: DateTime<Utc>) -> Result<Vec<UserAction>, sqlx::Error> {
        let rows = sqlx::query("SELECT * FROM user_actions WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp ASC")
            .bind(start_time.to_rfc3339())
            .bind(end_time.to_rfc3339())
            .fetch_all(&self.pool)
            .await?;

        let mut actions = Vec::new();
        for row in rows {
            actions.push(self.row_to_action(row)?);
        }

        Ok(actions)
    }

    // Get recent actions
    pub async fn get_recent_actions(&self, limit: i64) -> Result<Vec<UserAction>, sqlx::Error> {
        let rows = sqlx::query("SELECT * FROM user_actions ORDER BY timestamp DESC LIMIT ?")
            .bind(limit)
            .fetch_all(&self.pool)
            .await?;

        let mut actions = Vec::new();
        for row in rows {
            actions.push(self.row_to_action(row)?);
        }

        Ok(actions)
    }

    // Get action statistics
    pub async fn get_action_stats(&self) -> Result<ActionStats, sqlx::Error> {
        // Total actions
        let total_actions: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM user_actions")
            .fetch_one(&self.pool)
            .await?;

        // Actions by type
        let rows = sqlx::query("SELECT action_type, COUNT(*) as count FROM user_actions GROUP BY action_type")
            .fetch_all(&self.pool)
            .await?;
        
        let mut actions_by_type = HashMap::new();
        for row in rows {
            let action_type: String = row.get("action_type");
            let count: i64 = row.get("count");
            actions_by_type.insert(action_type, count);
        }

        // Sessions count
        let sessions_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM study_sessions")
            .fetch_one(&self.pool)
            .await?;

        // Documents accessed - handle NULL and empty JSON arrays properly
        let documents_accessed: i64 = match sqlx::query_scalar(
            "SELECT COUNT(DISTINCT json_extract(value, '$')) FROM user_actions, json_each(user_actions.document_ids) WHERE user_actions.document_ids IS NOT NULL AND user_actions.document_ids != 'null' AND json_valid(user_actions.document_ids) = 1"
        )
        .fetch_one(&self.pool)
        .await {
            Ok(count) => count,
            Err(_) => 0, // If there's an error (e.g., no valid JSON), default to 0
        };

        // Average session duration
        let avg_duration: Option<f64> = sqlx::query_scalar("SELECT AVG(total_duration) FROM study_sessions WHERE total_duration > 0")
            .fetch_one(&self.pool)
            .await?;

        Ok(ActionStats {
            total_actions,
            actions_by_type,
            sessions_count,
            documents_accessed,
            average_session_duration: avg_duration.unwrap_or(0.0),
        })
    }
} 