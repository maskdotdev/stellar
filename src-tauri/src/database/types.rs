use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Document {
    pub id: String,
    pub title: String,
    pub content: String,
    pub file_path: Option<String>,
    pub doc_type: String, // "pdf", "markdown", "note", etc.
    pub tags: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub status: String, // "draft", "reading", "completed"
    pub category_id: Option<String>, // Link to category
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>, // Hex color for UI theming
    pub icon: Option<String>, // Icon name/emoji
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub document_count: i64, // Virtual field for UI
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDocumentRequest {
    pub title: String,
    pub content: String,
    pub file_path: Option<String>,
    pub doc_type: String,
    pub tags: Vec<String>,
    pub status: Option<String>,
    pub category_id: Option<String>, // Category assignment
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCategoryRequest {
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
}

// Student Pro - Actions & Sessions structures
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserAction {
    pub id: String,
    pub action_type: String, // Using string instead of enum for simplicity
    pub timestamp: DateTime<Utc>,
    pub session_id: String,
    pub data: serde_json::Value, // Flexible JSON data
    pub document_ids: Option<Vec<String>>,
    pub category_ids: Option<Vec<String>>,
    pub duration: Option<i64>, // Duration in seconds
    pub metadata: Option<serde_json::Value>, // Flexible metadata
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StudySession {
    pub id: String,
    pub title: String,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub is_active: bool,
    pub session_type: String, // 'focused', 'exploratory', 'review', 'mixed'
    pub total_duration: i64, // Duration in seconds
    pub documents_accessed: Vec<String>,
    pub categories_accessed: Vec<String>,
    pub conversation_ids: Vec<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateActionRequest {
    pub action_type: String,
    pub session_id: String,
    pub data: serde_json::Value,
    pub document_ids: Option<Vec<String>>,
    pub category_ids: Option<Vec<String>>,
    pub duration: Option<i64>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSessionRequest {
    pub title: String,
    pub session_type: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ActionStats {
    pub total_actions: i64,
    pub actions_by_type: HashMap<String, i64>,
    pub sessions_count: i64,
    pub documents_accessed: i64,
    pub average_session_duration: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StudyInsights {
    pub total_study_time: i64,
    pub most_active_hours: Vec<i32>,
    pub documents_studied: Vec<String>,
    pub top_categories: Vec<String>,
    pub study_streak: i64,
    pub average_session_length: f64,
} 