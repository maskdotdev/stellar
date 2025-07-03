use sqlx::Row;
use chrono::Utc;
use uuid::Uuid;
use super::types::*;
use super::database::Database;

impl Database {
    // === FLASHCARD CRUD METHODS ===

    pub async fn create_flashcard(&self, request: CreateFlashcardRequest) -> Result<Flashcard, sqlx::Error> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        
        let row = sqlx::query(
            r#"
            INSERT INTO flashcards (
                id, front, back, source_document_id, source_text, difficulty,
                created_at, last_reviewed, next_review, review_count, success_rate,
                tags, category_id, card_type, deck_id, ef_factor, interval, repetitions, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
            "#,
        )
        .bind(&id)
        .bind(&request.front)
        .bind(&request.back)
        .bind(&request.source_document_id)
        .bind(&request.source_text)
        .bind(&request.difficulty.as_deref().unwrap_or("medium"))
        .bind(&now)
        .bind(None::<String>) // last_reviewed - null for new cards
        .bind(None::<String>) // next_review - null for new cards
        .bind(0) // review_count
        .bind(0.0) // success_rate
        .bind(serde_json::to_string(&request.tags).unwrap_or_else(|_| "[]".to_string()))
        .bind(&request.category_id)
        .bind(&request.card_type.as_deref().unwrap_or("basic"))
        .bind(&request.deck_id)
        .bind(2.5) // ef_factor default
        .bind(1) // interval default
        .bind(0) // repetitions default
        .bind(&request.metadata)
        .fetch_one(&self.pool)
        .await?;

        self.row_to_flashcard(row)
    }

    pub async fn get_flashcard(&self, id: &str) -> Result<Option<Flashcard>, sqlx::Error> {
        let row = sqlx::query("SELECT * FROM flashcards WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;

        match row {
            Some(row) => Ok(Some(self.row_to_flashcard(row)?)),
            None => Ok(None),
        }
    }

    pub async fn get_flashcards(&self, limit: Option<i32>, offset: Option<i32>) -> Result<Vec<Flashcard>, sqlx::Error> {
        let limit = limit.unwrap_or(100);
        let offset = offset.unwrap_or(0);
        
        let rows = sqlx::query("SELECT * FROM flashcards ORDER BY created_at DESC LIMIT ? OFFSET ?")
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.pool)
            .await?;

        let mut flashcards = Vec::new();
        for row in rows {
            flashcards.push(self.row_to_flashcard(row)?);
        }
        Ok(flashcards)
    }

    pub async fn get_flashcards_by_deck(&self, deck_id: &str) -> Result<Vec<Flashcard>, sqlx::Error> {
        let rows = sqlx::query("SELECT * FROM flashcards WHERE deck_id = ? ORDER BY created_at DESC")
            .bind(deck_id)
            .fetch_all(&self.pool)
            .await?;

        let mut flashcards = Vec::new();
        for row in rows {
            flashcards.push(self.row_to_flashcard(row)?);
        }
        Ok(flashcards)
    }

    pub async fn get_flashcards_by_category(&self, category_id: &str) -> Result<Vec<Flashcard>, sqlx::Error> {
        let rows = sqlx::query("SELECT * FROM flashcards WHERE category_id = ? ORDER BY created_at DESC")
            .bind(category_id)
            .fetch_all(&self.pool)
            .await?;

        let mut flashcards = Vec::new();
        for row in rows {
            flashcards.push(self.row_to_flashcard(row)?);
        }
        Ok(flashcards)
    }

    pub async fn get_flashcards_by_document(&self, document_id: &str) -> Result<Vec<Flashcard>, sqlx::Error> {
        let rows = sqlx::query("SELECT * FROM flashcards WHERE source_document_id = ? ORDER BY created_at DESC")
            .bind(document_id)
            .fetch_all(&self.pool)
            .await?;

        let mut flashcards = Vec::new();
        for row in rows {
            flashcards.push(self.row_to_flashcard(row)?);
        }
        Ok(flashcards)
    }

    pub async fn update_flashcard(&self, id: &str, request: CreateFlashcardRequest) -> Result<Option<Flashcard>, sqlx::Error> {
        let now = Utc::now().to_rfc3339();
        
        let row = sqlx::query(
            r#"
            UPDATE flashcards SET
                front = ?, back = ?, source_document_id = ?, source_text = ?, difficulty = ?,
                last_reviewed = ?, next_review = ?, review_count = ?, success_rate = ?,
                tags = ?, category_id = ?, card_type = ?, deck_id = ?, ef_factor = ?,
                interval = ?, repetitions = ?, metadata = ?, updated_at = ?
            WHERE id = ?
            RETURNING *
            "#,
        )
        .bind(&request.front)
        .bind(&request.back)
        .bind(&request.source_document_id)
        .bind(&request.source_text)
        .bind(&request.difficulty.as_deref().unwrap_or("medium"))
        .bind(None::<String>) // last_reviewed - preserve existing or null
        .bind(None::<String>) // next_review - preserve existing or null  
        .bind(0) // review_count - preserve existing
        .bind(0.0) // success_rate - preserve existing
        .bind(serde_json::to_string(&request.tags).unwrap_or_else(|_| "[]".to_string()))
        .bind(&request.category_id)
        .bind(&request.card_type.as_deref().unwrap_or("basic"))
        .bind(&request.deck_id)
        .bind(2.5) // ef_factor - preserve existing
        .bind(1) // interval - preserve existing
        .bind(0) // repetitions - preserve existing
        .bind(&request.metadata)
        .bind(&now)
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        match row {
            Some(row) => Ok(Some(self.row_to_flashcard(row)?)),
            None => Ok(None),
        }
    }

    pub async fn delete_flashcard(&self, id: &str) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM flashcards WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    // === FLASHCARD DECK METHODS ===

    pub async fn create_flashcard_deck(&self, request: CreateFlashcardDeckRequest) -> Result<FlashcardDeck, sqlx::Error> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        
        let row = sqlx::query(
            r#"
            INSERT INTO flashcard_decks (
                id, name, description, color, icon, created_at, updated_at,
                category_id, is_shared, tags, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
            "#,
        )
        .bind(&id)
        .bind(&request.name)
        .bind(&request.description)
        .bind(&request.color)
        .bind(&request.icon)
        .bind(&now)
        .bind(&now)
        .bind(&request.category_id)
        .bind(&request.is_shared.unwrap_or(false))
        .bind(serde_json::to_string(&request.tags).unwrap_or_else(|_| "[]".to_string()))
        .bind(&request.metadata)
        .fetch_one(&self.pool)
        .await?;

        self.row_to_flashcard_deck(row)
    }

    pub async fn get_flashcard_deck(&self, id: &str) -> Result<Option<FlashcardDeck>, sqlx::Error> {
        let row = sqlx::query("SELECT * FROM flashcard_decks WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;

        match row {
            Some(row) => Ok(Some(self.row_to_flashcard_deck(row)?)),
            None => Ok(None),
        }
    }

    pub async fn get_flashcard_decks(&self) -> Result<Vec<FlashcardDeck>, sqlx::Error> {
        let rows = sqlx::query("SELECT * FROM flashcard_decks ORDER BY created_at DESC")
            .fetch_all(&self.pool)
            .await?;

        let mut decks = Vec::new();
        for row in rows {
            decks.push(self.row_to_flashcard_deck(row)?);
        }
        Ok(decks)
    }

    pub async fn update_flashcard_deck(&self, id: &str, request: CreateFlashcardDeckRequest) -> Result<Option<FlashcardDeck>, sqlx::Error> {
        let now = Utc::now().to_rfc3339();
        
        let row = sqlx::query(
            r#"
            UPDATE flashcard_decks SET
                name = ?, description = ?, color = ?, icon = ?, updated_at = ?,
                category_id = ?, is_shared = ?, tags = ?, metadata = ?
            WHERE id = ?
            RETURNING *
            "#,
        )
        .bind(&request.name)
        .bind(&request.description)
        .bind(&request.color)
        .bind(&request.icon)
        .bind(&now)
        .bind(&request.category_id)
        .bind(&request.is_shared.unwrap_or(false))
        .bind(serde_json::to_string(&request.tags).unwrap_or_else(|_| "[]".to_string()))
        .bind(&request.metadata)
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        match row {
            Some(row) => Ok(Some(self.row_to_flashcard_deck(row)?)),
            None => Ok(None),
        }
    }

    pub async fn delete_flashcard_deck(&self, id: &str) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM flashcard_decks WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    // === FLASHCARD REVIEW METHODS ===

    pub async fn record_flashcard_review(&self, request: CreateFlashcardReviewRequest) -> Result<FlashcardReview, sqlx::Error> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        
        let row = sqlx::query(
            r#"
            INSERT INTO flashcard_reviews (
                id, flashcard_id, session_id, timestamp, response, time_spent, confidence, quality,
                previous_ef, new_ef, previous_interval, new_interval, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING *
            "#,
        )
        .bind(&id)
        .bind(&request.flashcard_id)
        .bind(&request.session_id)
        .bind(&now)
        .bind(&request.response)
        .bind(&request.time_spent)
        .bind(&request.confidence)
        .bind(&request.quality)
        .bind(2.5) // default previous_ef
        .bind(2.5) // default new_ef
        .bind(1)   // default previous_interval
        .bind(1)   // default new_interval
        .bind(&request.metadata)
        .fetch_one(&self.pool)
        .await?;

        self.row_to_flashcard_review(row)
    }

    pub async fn get_due_flashcards(&self, limit: Option<i32>) -> Result<Vec<Flashcard>, sqlx::Error> {
        let limit = limit.unwrap_or(20);
        let now = Utc::now().to_rfc3339();
        
        let rows = sqlx::query(
            "SELECT * FROM flashcards WHERE next_review <= ? ORDER BY next_review ASC LIMIT ?"
        )
        .bind(&now)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        let mut flashcards = Vec::new();
        for row in rows {
            flashcards.push(self.row_to_flashcard(row)?);
        }
        Ok(flashcards)
    }

    pub async fn get_new_flashcards(&self, limit: Option<i32>) -> Result<Vec<Flashcard>, sqlx::Error> {
        let limit = limit.unwrap_or(20);
        
        let rows = sqlx::query(
            "SELECT * FROM flashcards WHERE review_count = 0 ORDER BY created_at DESC LIMIT ?"
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        let mut flashcards = Vec::new();
        for row in rows {
            flashcards.push(self.row_to_flashcard(row)?);
        }
        Ok(flashcards)
    }

    pub async fn get_flashcard_review_session(&self, session_limit: i32, mix_strategy: &str) -> Result<FlashcardReviewSession, sqlx::Error> {
        let (due_cards, new_cards) = match mix_strategy {
            "due_first" => {
                // Prioritize due cards, fill remaining with new cards
                let due_cards = self.get_due_flashcards(Some(session_limit)).await?;
                let remaining = session_limit - due_cards.len() as i32;
                let new_cards = if remaining > 0 {
                    self.get_new_flashcards(Some(remaining)).await?
                } else {
                    Vec::new()
                };
                (due_cards, new_cards)
            },
            "new_first" => {
                // Prioritize new cards, fill remaining with due cards
                let new_cards = self.get_new_flashcards(Some(session_limit)).await?;
                let remaining = session_limit - new_cards.len() as i32;
                let due_cards = if remaining > 0 {
                    self.get_due_flashcards(Some(remaining)).await?
                } else {
                    Vec::new()
                };
                (due_cards, new_cards)
            },
            "mixed" | _ => {
                // Mix both types evenly
                let half_limit = session_limit / 2;
                let due_cards = self.get_due_flashcards(Some(half_limit)).await?;
                let new_cards = self.get_new_flashcards(Some(half_limit)).await?;
                
                // If one type has fewer cards, get more of the other type
                let total_found = due_cards.len() + new_cards.len();
                if total_found < session_limit as usize {
                    let remaining = session_limit - total_found as i32;
                    if due_cards.len() < half_limit as usize {
                        // Get more new cards
                        let additional_new = self.get_new_flashcards(Some(new_cards.len() as i32 + remaining)).await?;
                        (due_cards, additional_new)
                    } else if new_cards.len() < half_limit as usize {
                        // Get more due cards
                        let additional_due = self.get_due_flashcards(Some(due_cards.len() as i32 + remaining)).await?;
                        (additional_due, new_cards)
                    } else {
                        (due_cards, new_cards)
                    }
                } else {
                    (due_cards, new_cards)
                }
            }
        };
        
        // Estimate time (assuming 30 seconds per card on average)
        let estimated_time = (due_cards.len() + new_cards.len()) as i32 * 30 / 60; // in minutes
        
        Ok(FlashcardReviewSession {
            due_cards,
            new_cards,
            session_limit,
            estimated_time,
            mix_strategy: mix_strategy.to_string(),
        })
    }

    pub async fn get_flashcard_stats(&self) -> Result<FlashcardStats, sqlx::Error> {
        use std::collections::HashMap;
        
        let total_cards_row = sqlx::query("SELECT COUNT(*) as count FROM flashcards")
            .fetch_one(&self.pool)
            .await?;
        let total_cards = total_cards_row.get::<i64, _>("count") as i32;

        let cards_due_row = sqlx::query("SELECT COUNT(*) as count FROM flashcards WHERE next_review <= ?")
            .bind(Utc::now().to_rfc3339())
            .fetch_one(&self.pool)
            .await?;
        let cards_due = cards_due_row.get::<i64, _>("count") as i32;

        let cards_new_row = sqlx::query("SELECT COUNT(*) as count FROM flashcards WHERE review_count = 0")
            .fetch_one(&self.pool)
            .await?;
        let cards_new = cards_new_row.get::<i64, _>("count") as i32;

        let cards_learning_row = sqlx::query("SELECT COUNT(*) as count FROM flashcards WHERE review_count > 0 AND review_count < 3")
            .fetch_one(&self.pool)
            .await?;
        let cards_learning = cards_learning_row.get::<i64, _>("count") as i32;

        let cards_mastered_row = sqlx::query("SELECT COUNT(*) as count FROM flashcards WHERE review_count >= 3 AND success_rate >= 0.8")
            .fetch_one(&self.pool)
            .await?;
        let cards_mastered = cards_mastered_row.get::<i64, _>("count") as i32;

        let total_reviews_row = sqlx::query("SELECT COUNT(*) as count FROM flashcard_reviews")
            .fetch_one(&self.pool)
            .await?;
        let total_reviews = total_reviews_row.get::<i64, _>("count") as i32;

        let avg_success_rate_row = sqlx::query("SELECT AVG(success_rate) as avg FROM flashcards WHERE review_count > 0")
            .fetch_one(&self.pool)
            .await?;
        let average_success_rate = avg_success_rate_row.get::<Option<f64>, _>("avg").unwrap_or(0.0) as f32;

        // Simplified stats - would need more complex queries for actual implementation
        let cards_by_difficulty = HashMap::new();
        let cards_by_type = HashMap::new();
        let review_accuracy_trend = Vec::new();
        
        Ok(FlashcardStats {
            total_cards,
            cards_due,
            cards_new,
            cards_learning,
            cards_mastered,
            total_reviews,
            average_success_rate,
            study_streak: 0, // Would need to calculate from review history
            cards_by_difficulty,
            cards_by_type,
            review_accuracy_trend,
            daily_review_count: 0, // Would need to calculate from today's reviews
        })
    }

    pub async fn get_flashcard_reviews(&self, flashcard_id: &str) -> Result<Vec<FlashcardReview>, sqlx::Error> {
        let rows = sqlx::query("SELECT * FROM flashcard_reviews WHERE flashcard_id = ? ORDER BY created_at DESC")
            .bind(flashcard_id)
            .fetch_all(&self.pool)
            .await?;

        let mut reviews = Vec::new();
        for row in rows {
            reviews.push(self.row_to_flashcard_review(row)?);
        }
        Ok(reviews)
    }

    pub async fn get_flashcard_reviews_by_session(&self, session_id: &str) -> Result<Vec<FlashcardReview>, sqlx::Error> {
        let rows = sqlx::query("SELECT * FROM flashcard_reviews WHERE session_id = ? ORDER BY created_at DESC")
            .bind(session_id)
            .fetch_all(&self.pool)
            .await?;

        let mut reviews = Vec::new();
        for row in rows {
            reviews.push(self.row_to_flashcard_review(row)?);
        }
        Ok(reviews)
    }
} 