use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Document {
    pub id: String,
    pub title: String,
    pub content: String,
    pub content_hash: Option<String>, // SHA-256 hash of content for duplicate detection
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
    pub content_hash: Option<String>, // SHA-256 hash for duplicate detection
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

// 🧠 PHASE 2: Flashcard System Data Models

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Flashcard {
    pub id: String,
    pub front: String,
    pub back: String,
    pub source_document_id: Option<String>,
    pub source_text: Option<String>, // Original text that generated the card
    pub difficulty: String, // 'easy', 'medium', 'hard'
    pub created_at: DateTime<Utc>,
    pub last_reviewed: Option<DateTime<Utc>>,
    pub next_review: Option<DateTime<Utc>>, // For spaced repetition
    pub review_count: i32,
    pub success_rate: f32, // 0.0 to 1.0
    pub tags: Vec<String>,
    pub category_id: Option<String>,
    pub card_type: String, // 'basic', 'cloze', 'image', 'definition'
    pub deck_id: Option<String>,
    pub ef_factor: f32, // Ease Factor for SM-2 algorithm (default: 2.5)
    pub interval: i32, // Review interval in days
    pub repetitions: i32, // Number of consecutive successful reviews
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FlashcardReview {
    pub id: String,
    pub flashcard_id: String,
    pub session_id: String,
    pub timestamp: DateTime<Utc>,
    pub response: String, // 'correct', 'incorrect', 'partial'
    pub time_spent: i32, // Time spent in seconds
    pub confidence: i32, // 1-5 scale
    pub quality: i32, // 0-5 scale for SM-2 algorithm
    pub previous_ef: f32,
    pub new_ef: f32,
    pub previous_interval: i32,
    pub new_interval: i32,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FlashcardDeck {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub category_id: Option<String>,
    pub is_shared: bool,
    pub tags: Vec<String>,
    pub card_count: i32, // Virtual field for UI
    pub due_count: i32, // Virtual field for UI
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateFlashcardRequest {
    pub front: String,
    pub back: String,
    pub source_document_id: Option<String>,
    pub source_text: Option<String>,
    pub difficulty: Option<String>,
    pub tags: Vec<String>,
    pub category_id: Option<String>,
    pub card_type: Option<String>,
    pub deck_id: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateFlashcardDeckRequest {
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub category_id: Option<String>,
    pub tags: Vec<String>,
    pub is_shared: Option<bool>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateFlashcardReviewRequest {
    pub flashcard_id: String,
    pub session_id: String,
    pub response: String,
    pub time_spent: i32,
    pub confidence: i32,
    pub quality: i32, // 0-5 for SM-2 algorithm
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FlashcardStats {
    pub total_cards: i32,
    pub cards_due: i32,
    pub cards_new: i32,
    pub cards_learning: i32,
    pub cards_mastered: i32,
    pub total_reviews: i32,
    pub average_success_rate: f32,
    pub study_streak: i32,
    pub cards_by_difficulty: HashMap<String, i32>,
    pub cards_by_type: HashMap<String, i32>,
    pub review_accuracy_trend: Vec<f32>, // Last 30 days
    pub daily_review_count: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FlashcardReviewSession {
    #[serde(rename = "dueCards")]
    pub due_cards: Vec<Flashcard>,
    #[serde(rename = "newCards")]
    pub new_cards: Vec<Flashcard>,
    #[serde(rename = "sessionLimit")]
    pub session_limit: i32,
    #[serde(rename = "estimatedTime")]
    pub estimated_time: i32, // in minutes
    #[serde(rename = "mixStrategy")]
    pub mix_strategy: String, // 'due_first', 'mixed', 'new_first'
}

// Background Processing Job Types
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProcessingJob {
    pub id: String,
    pub job_type: String, // 'pdf_processing', 'embedding_generation', etc.
    pub status: String,   // 'pending', 'processing', 'completed', 'failed'
    pub source_type: String, // 'file', 'url', 'data'
    pub source_path: Option<String>, // File path or URL
    pub original_filename: String,
    pub title: Option<String>,
    pub tags: Vec<String>,
    pub category_id: Option<String>,
    pub progress: i32, // 0-100
    pub error_message: Option<String>,
    pub result_document_id: Option<String>, // ID of created document when completed
    pub processing_options: Option<serde_json::Value>, // JSON serialized processing options
    pub created_at: DateTime<Utc>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateProcessingJobRequest {
    pub job_type: String,
    pub source_type: String,
    pub source_path: Option<String>,
    pub original_filename: String,
    pub title: Option<String>,
    pub tags: Vec<String>,
    pub category_id: Option<String>,
    pub processing_options: Option<serde_json::Value>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessingJobUpdate {
    pub id: String,
    pub status: Option<String>,
    pub progress: Option<i32>,
    pub error_message: Option<String>,
    pub result_document_id: Option<String>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessingJobStats {
    pub total_jobs: i64,
    pub pending_jobs: i64,
    pub processing_jobs: i64,
    pub completed_jobs: i64,
    pub failed_jobs: i64,
    pub average_processing_time: f64, // in seconds
} 