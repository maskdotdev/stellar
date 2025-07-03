use tauri::State;
use crate::database::{
    Database, 
    Flashcard, FlashcardDeck, FlashcardReview, FlashcardStats, FlashcardReviewSession,
    CreateFlashcardRequest, CreateFlashcardDeckRequest, CreateFlashcardReviewRequest
};
use tokio::sync::Mutex;
use std::sync::Arc;

// Use the same DatabaseState pattern as other commands
type DatabaseState = Arc<Mutex<Option<Database>>>;

// 🧠 PHASE 2: Flashcard System - Tauri Commands

// === FLASHCARD CRUD COMMANDS ===

#[tauri::command]
pub async fn create_flashcard(
    state: State<'_, DatabaseState>,
    request: CreateFlashcardRequest,
) -> Result<Flashcard, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.create_flashcard(request)
        .await
        .map_err(|e| format!("Failed to create flashcard: {}", e))
}

#[tauri::command]
pub async fn get_flashcard(
    state: State<'_, DatabaseState>,
    id: String,
) -> Result<Option<Flashcard>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.get_flashcard(&id)
        .await
        .map_err(|e| format!("Failed to get flashcard: {}", e))
}

#[tauri::command]
pub async fn get_flashcards(
    state: State<'_, DatabaseState>,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<Vec<Flashcard>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.get_flashcards(limit, offset)
        .await
        .map_err(|e| format!("Failed to get flashcards: {}", e))
}

#[tauri::command]
pub async fn get_flashcards_by_deck(
    state: State<'_, DatabaseState>,
    deck_id: String,
) -> Result<Vec<Flashcard>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.get_flashcards_by_deck(&deck_id)
        .await
        .map_err(|e| format!("Failed to get flashcards by deck: {}", e))
}

#[tauri::command]
pub async fn get_flashcards_by_category(
    state: State<'_, DatabaseState>,
    category_id: String,
) -> Result<Vec<Flashcard>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.get_flashcards_by_category(&category_id)
        .await
        .map_err(|e| format!("Failed to get flashcards by category: {}", e))
}

#[tauri::command]
pub async fn get_flashcards_by_document(
    state: State<'_, DatabaseState>,
    document_id: String,
) -> Result<Vec<Flashcard>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.get_flashcards_by_document(&document_id)
        .await
        .map_err(|e| format!("Failed to get flashcards by document: {}", e))
}

#[tauri::command]
pub async fn update_flashcard(
    state: State<'_, DatabaseState>,
    id: String,
    request: CreateFlashcardRequest,
) -> Result<Option<Flashcard>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.update_flashcard(&id, request)
        .await
        .map_err(|e| format!("Failed to update flashcard: {}", e))
}

#[tauri::command]
pub async fn delete_flashcard(
    state: State<'_, DatabaseState>,
    id: String,
) -> Result<bool, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.delete_flashcard(&id)
        .await
        .map_err(|e| format!("Failed to delete flashcard: {}", e))
}

// === FLASHCARD DECK COMMANDS ===

#[tauri::command]
pub async fn create_flashcard_deck(
    state: State<'_, DatabaseState>,
    request: CreateFlashcardDeckRequest,
) -> Result<FlashcardDeck, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.create_flashcard_deck(request)
        .await
        .map_err(|e| format!("Failed to create flashcard deck: {}", e))
}

#[tauri::command]
pub async fn get_flashcard_deck(
    state: State<'_, DatabaseState>,
    id: String,
) -> Result<Option<FlashcardDeck>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.get_flashcard_deck(&id)
        .await
        .map_err(|e| format!("Failed to get flashcard deck: {}", e))
}

#[tauri::command]
pub async fn get_flashcard_decks(
    state: State<'_, DatabaseState>
) -> Result<Vec<FlashcardDeck>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.get_flashcard_decks()
        .await
        .map_err(|e| format!("Failed to get flashcard decks: {}", e))
}

#[tauri::command]
pub async fn update_flashcard_deck(
    state: State<'_, DatabaseState>,
    id: String,
    request: CreateFlashcardDeckRequest,
) -> Result<Option<FlashcardDeck>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.update_flashcard_deck(&id, request)
        .await
        .map_err(|e| format!("Failed to update flashcard deck: {}", e))
}

#[tauri::command]
pub async fn delete_flashcard_deck(
    state: State<'_, DatabaseState>,
    id: String,
) -> Result<bool, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.delete_flashcard_deck(&id)
        .await
        .map_err(|e| format!("Failed to delete flashcard deck: {}", e))
}

// === FLASHCARD REVIEW COMMANDS ===

#[tauri::command]
pub async fn record_flashcard_review(
    state: State<'_, DatabaseState>,
    request: CreateFlashcardReviewRequest,
) -> Result<FlashcardReview, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.record_flashcard_review(request)
        .await
        .map_err(|e| format!("Failed to record flashcard review: {}", e))
}

#[tauri::command]
pub async fn get_due_flashcards(
    state: State<'_, DatabaseState>,
    limit: Option<i32>,
) -> Result<Vec<Flashcard>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.get_due_flashcards(limit)
        .await
        .map_err(|e| format!("Failed to get due flashcards: {}", e))
}

#[tauri::command]
pub async fn get_new_flashcards(
    state: State<'_, DatabaseState>,
    limit: Option<i32>,
) -> Result<Vec<Flashcard>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.get_new_flashcards(limit)
        .await
        .map_err(|e| format!("Failed to get new flashcards: {}", e))
}

#[tauri::command]
pub async fn get_flashcard_review_session(
    state: State<'_, DatabaseState>,
    session_limit: i32,
    mix_strategy: String,
) -> Result<FlashcardReviewSession, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.get_flashcard_review_session(session_limit, &mix_strategy)
        .await
        .map_err(|e| format!("Failed to get flashcard review session: {}", e))
}

#[tauri::command]
pub async fn get_flashcard_stats(
    state: State<'_, DatabaseState>
) -> Result<FlashcardStats, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.get_flashcard_stats()
        .await
        .map_err(|e| format!("Failed to get flashcard stats: {}", e))
}

#[tauri::command]
pub async fn get_flashcard_reviews(
    state: State<'_, DatabaseState>,
    flashcard_id: String,
) -> Result<Vec<FlashcardReview>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.get_flashcard_reviews(&flashcard_id)
        .await
        .map_err(|e| format!("Failed to get flashcard reviews: {}", e))
}

#[tauri::command]
pub async fn get_flashcard_reviews_by_session(
    state: State<'_, DatabaseState>,
    session_id: String,
) -> Result<Vec<FlashcardReview>, String> {
    let db_state = state.lock().await;
    let database = db_state.as_ref().ok_or("Database not initialized")?;
    
    database.get_flashcard_reviews_by_session(&session_id)
        .await
        .map_err(|e| format!("Failed to get flashcard reviews by session: {}", e))
} 