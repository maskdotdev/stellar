use sqlx::{sqlite::SqlitePool, Row};
use chrono::{DateTime, Utc};
use base64::{engine::general_purpose, Engine as _};

pub struct Database {
    pub pool: SqlitePool,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        let pool = SqlitePool::connect(database_url).await?;
        
        // Check if content_hash column exists, add if missing (for existing databases)
        let add_content_hash_result = sqlx::query(
            "ALTER TABLE documents ADD COLUMN content_hash TEXT"
        ).execute(&pool).await;
        
        match add_content_hash_result {
            Ok(_) => println!("✅ Added content_hash column to documents table"),
            Err(e) => {
                // Column might already exist, check the error
                if e.to_string().contains("duplicate column") {
                    println!("ℹ️ content_hash column already exists in documents table");
                } else {
                    eprintln!("⚠️ Failed to add content_hash column: {}", e);
                }
            }
        }
        
        // Create tables if they don't exist
        
        // Categories table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL UNIQUE,
                description TEXT,
                color TEXT,
                icon TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            "#,
        )
        .execute(&pool)
        .await?;

        // Documents table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                file_path TEXT,
                doc_type TEXT NOT NULL,
                tags TEXT NOT NULL, -- JSON array
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'draft',
                category_id TEXT,
                FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
            )
            "#,
        )
        .execute(&pool)
        .await?;

        // Create API keys table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS api_keys (
                provider_id TEXT PRIMARY KEY,
                encrypted_key TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            "#,
        )
        .execute(&pool)
        .await?;

        // Student Pro - Create study sessions table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS study_sessions (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                session_type TEXT NOT NULL DEFAULT 'mixed',
                total_duration INTEGER NOT NULL DEFAULT 0,
                documents_accessed TEXT NOT NULL DEFAULT '[]', -- JSON array
                categories_accessed TEXT NOT NULL DEFAULT '[]', -- JSON array
                conversation_ids TEXT NOT NULL DEFAULT '[]', -- JSON array
                metadata TEXT -- JSON metadata
            )
            "#,
        )
        .execute(&pool)
        .await?;

        // Student Pro - Create user actions table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS user_actions (
                id TEXT PRIMARY KEY,
                action_type TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                session_id TEXT NOT NULL,
                data TEXT NOT NULL, -- JSON data
                document_ids TEXT, -- JSON array
                category_ids TEXT, -- JSON array
                duration INTEGER, -- Duration in seconds
                metadata TEXT, -- JSON metadata
                FOREIGN KEY (session_id) REFERENCES study_sessions (id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(&pool)
        .await?;

        // Create indexes for better query performance
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_actions_session_id ON user_actions(session_id)")
            .execute(&pool)
            .await?;
        
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_actions_timestamp ON user_actions(timestamp)")
            .execute(&pool)
            .await?;
        
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_actions_type ON user_actions(action_type)")
            .execute(&pool)
            .await?;
        
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON study_sessions(start_time)")
            .execute(&pool)
            .await?;

        // 🧠 PHASE 2: Flashcard System Tables

        // Create flashcard decks table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS flashcard_decks (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                color TEXT,
                icon TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                category_id TEXT,
                is_shared BOOLEAN NOT NULL DEFAULT FALSE,
                tags TEXT NOT NULL DEFAULT '[]', -- JSON array
                metadata TEXT, -- JSON metadata
                FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
            )
            "#,
        )
        .execute(&pool)
        .await?;

        // Create flashcards table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS flashcards (
                id TEXT PRIMARY KEY,
                front TEXT NOT NULL,
                back TEXT NOT NULL,
                source_document_id TEXT,
                source_text TEXT,
                difficulty TEXT NOT NULL DEFAULT 'medium',
                created_at TEXT NOT NULL,
                last_reviewed TEXT,
                next_review TEXT,
                review_count INTEGER NOT NULL DEFAULT 0,
                success_rate REAL NOT NULL DEFAULT 0.0,
                tags TEXT NOT NULL DEFAULT '[]', -- JSON array
                category_id TEXT,
                card_type TEXT NOT NULL DEFAULT 'basic',
                deck_id TEXT,
                ef_factor REAL NOT NULL DEFAULT 2.5, -- Ease Factor for SM-2
                interval INTEGER NOT NULL DEFAULT 1, -- Review interval in days
                repetitions INTEGER NOT NULL DEFAULT 0, -- Consecutive successful reviews
                metadata TEXT, -- JSON metadata
                FOREIGN KEY (source_document_id) REFERENCES documents (id) ON DELETE SET NULL,
                FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL,
                FOREIGN KEY (deck_id) REFERENCES flashcard_decks (id) ON DELETE SET NULL
            )
            "#,
        )
        .execute(&pool)
        .await?;

        // Create flashcard reviews table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS flashcard_reviews (
                id TEXT PRIMARY KEY,
                flashcard_id TEXT NOT NULL,
                session_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                response TEXT NOT NULL, -- 'correct', 'incorrect', 'partial'
                time_spent INTEGER NOT NULL DEFAULT 0, -- Time in seconds
                confidence INTEGER NOT NULL DEFAULT 3, -- 1-5 scale
                quality INTEGER NOT NULL DEFAULT 3, -- 0-5 scale for SM-2
                previous_ef REAL NOT NULL DEFAULT 2.5,
                new_ef REAL NOT NULL DEFAULT 2.5,
                previous_interval INTEGER NOT NULL DEFAULT 1,
                new_interval INTEGER NOT NULL DEFAULT 1,
                metadata TEXT, -- JSON metadata
                FOREIGN KEY (flashcard_id) REFERENCES flashcards (id) ON DELETE CASCADE,
                FOREIGN KEY (session_id) REFERENCES study_sessions (id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(&pool)
        .await?;

        // Create indexes for flashcard tables
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id ON flashcards(deck_id)")
            .execute(&pool)
            .await?;
        
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_flashcards_category_id ON flashcards(category_id)")
            .execute(&pool)
            .await?;
        
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards(next_review)")
            .execute(&pool)
            .await?;
        
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_flashcards_source_document ON flashcards(source_document_id)")
            .execute(&pool)
            .await?;
        
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_flashcard_id ON flashcard_reviews(flashcard_id)")
            .execute(&pool)
            .await?;
        
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_session_id ON flashcard_reviews(session_id)")
            .execute(&pool)
            .await?;
        
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_timestamp ON flashcard_reviews(timestamp)")
            .execute(&pool)
            .await?;

        // Migration: Add category_id column to documents table if it doesn't exist
        let columns = sqlx::query("PRAGMA table_info(documents)")
            .fetch_all(&pool)
            .await?;
        
        let has_category_id = columns.iter().any(|row| {
            let column_name: String = row.get("name");
            column_name == "category_id"
        });

        if !has_category_id {
            println!("Migrating database: Adding category_id column to documents table");
            sqlx::query("ALTER TABLE documents ADD COLUMN category_id TEXT")
                .execute(&pool)
                .await?;
        }

        Ok(Database { pool })
    }

    /// Simple XOR encryption for API keys (not production-grade, but better than plaintext)
    pub fn encrypt_api_key(&self, api_key: &str) -> String {
        let key = b"stellar_api_key_encryption_2024"; // 32-byte key
        let encrypted: Vec<u8> = api_key
            .bytes()
            .enumerate()
            .map(|(i, b)| b ^ key[i % key.len()])
            .collect();
        general_purpose::STANDARD.encode(encrypted)
    }

    /// Decrypt API key
    pub fn decrypt_api_key(&self, encrypted_key: &str) -> Result<String, String> {
        let key = b"stellar_api_key_encryption_2024"; // 32-byte key
        match general_purpose::STANDARD.decode(encrypted_key) {
            Ok(encrypted_bytes) => {
                let decrypted: Vec<u8> = encrypted_bytes
                    .iter()
                    .enumerate()
                    .map(|(i, &b)| b ^ key[i % key.len()])
                    .collect();
                String::from_utf8(decrypted).map_err(|e| format!("Failed to decrypt API key: {}", e))
            }
            Err(e) => Err(format!("Failed to decode API key: {}", e))
        }
    }

    // Helper function to convert database row to StudySession
    pub fn row_to_session(&self, row: sqlx::sqlite::SqliteRow) -> Result<super::types::StudySession, sqlx::Error> {
        let start_time: String = row.get("start_time");
        let end_time: Option<String> = row.get("end_time");
        let documents_accessed: String = row.get("documents_accessed");
        let categories_accessed: String = row.get("categories_accessed");
        let conversation_ids: String = row.get("conversation_ids");
        let metadata: Option<String> = row.get("metadata");

        Ok(super::types::StudySession {
            id: row.get("id"),
            title: row.get("title"),
            start_time: DateTime::parse_from_rfc3339(&start_time)
                .unwrap_or_else(|_| Utc::now().into())
                .with_timezone(&Utc),
            end_time: end_time.and_then(|t| DateTime::parse_from_rfc3339(&t).ok())
                .map(|t| t.with_timezone(&Utc)),
            is_active: row.get("is_active"),
            session_type: row.get("session_type"),
            total_duration: row.get("total_duration"),
            documents_accessed: serde_json::from_str(&documents_accessed).unwrap_or_default(),
            categories_accessed: serde_json::from_str(&categories_accessed).unwrap_or_default(),
            conversation_ids: serde_json::from_str(&conversation_ids).unwrap_or_default(),
            metadata: metadata.and_then(|m| serde_json::from_str(&m).ok()),
        })
    }

    // Helper function to convert database row to UserAction
    pub fn row_to_action(&self, row: sqlx::sqlite::SqliteRow) -> Result<super::types::UserAction, sqlx::Error> {
        let timestamp: String = row.get("timestamp");
        let data: String = row.get("data");
        let document_ids: Option<String> = row.get("document_ids");
        let category_ids: Option<String> = row.get("category_ids");
        let metadata: Option<String> = row.get("metadata");

        Ok(super::types::UserAction {
            id: row.get("id"),
            action_type: row.get("action_type"),
            timestamp: DateTime::parse_from_rfc3339(&timestamp)
                .unwrap_or_else(|_| Utc::now().into())
                .with_timezone(&Utc),
            session_id: row.get("session_id"),
            data: serde_json::from_str(&data).unwrap_or_else(|_| serde_json::json!({})),
            document_ids: document_ids.and_then(|ids| serde_json::from_str(&ids).ok()),
            category_ids: category_ids.and_then(|ids| serde_json::from_str(&ids).ok()),
            duration: row.get("duration"),
            metadata: metadata.and_then(|m| serde_json::from_str(&m).ok()),
        })
    }

    // 🧠 PHASE 2: Flashcard System Helper Methods

    // Helper function to convert database row to Flashcard
    pub fn row_to_flashcard(&self, row: sqlx::sqlite::SqliteRow) -> Result<super::types::Flashcard, sqlx::Error> {
        let created_at: String = row.get("created_at");
        let last_reviewed: Option<String> = row.get("last_reviewed");
        let next_review: Option<String> = row.get("next_review");
        let tags: String = row.get("tags");
        let metadata: Option<String> = row.get("metadata");

        Ok(super::types::Flashcard {
            id: row.get("id"),
            front: row.get("front"),
            back: row.get("back"),
            source_document_id: row.get("source_document_id"),
            source_text: row.get("source_text"),
            difficulty: row.get("difficulty"),
            created_at: DateTime::parse_from_rfc3339(&created_at)
                .unwrap_or_else(|_| Utc::now().into())
                .with_timezone(&Utc),
            last_reviewed: last_reviewed.and_then(|t| DateTime::parse_from_rfc3339(&t).ok())
                .map(|t| t.with_timezone(&Utc)),
            next_review: next_review.and_then(|t| DateTime::parse_from_rfc3339(&t).ok())
                .map(|t| t.with_timezone(&Utc)),
            review_count: row.get("review_count"),
            success_rate: row.get("success_rate"),
            tags: serde_json::from_str(&tags).unwrap_or_default(),
            category_id: row.get("category_id"),
            card_type: row.get("card_type"),
            deck_id: row.get("deck_id"),
            ef_factor: row.get("ef_factor"),
            interval: row.get("interval"),
            repetitions: row.get("repetitions"),
            metadata: metadata.and_then(|m| serde_json::from_str(&m).ok()),
        })
    }

    // Helper function to convert database row to FlashcardDeck
    pub fn row_to_flashcard_deck(&self, row: sqlx::sqlite::SqliteRow) -> Result<super::types::FlashcardDeck, sqlx::Error> {
        let created_at: String = row.get("created_at");
        let updated_at: String = row.get("updated_at");
        let tags: String = row.get("tags");
        let metadata: Option<String> = row.get("metadata");

        Ok(super::types::FlashcardDeck {
            id: row.get("id"),
            name: row.get("name"),
            description: row.get("description"),
            color: row.get("color"),
            icon: row.get("icon"),
            created_at: DateTime::parse_from_rfc3339(&created_at)
                .unwrap_or_else(|_| Utc::now().into())
                .with_timezone(&Utc),
            updated_at: DateTime::parse_from_rfc3339(&updated_at)
                .unwrap_or_else(|_| Utc::now().into())
                .with_timezone(&Utc),
            category_id: row.get("category_id"),
            is_shared: row.get("is_shared"),
            tags: serde_json::from_str(&tags).unwrap_or_default(),
            card_count: 0, // Will be populated by queries that join with flashcards
            due_count: 0, // Will be populated by queries that join with flashcards
            metadata: metadata.and_then(|m| serde_json::from_str(&m).ok()),
        })
    }

    // Helper function to convert database row to FlashcardReview
    pub fn row_to_flashcard_review(&self, row: sqlx::sqlite::SqliteRow) -> Result<super::types::FlashcardReview, sqlx::Error> {
        let timestamp: String = row.get("timestamp");
        let metadata: Option<String> = row.get("metadata");

        Ok(super::types::FlashcardReview {
            id: row.get("id"),
            flashcard_id: row.get("flashcard_id"),
            session_id: row.get("session_id"),
            timestamp: DateTime::parse_from_rfc3339(&timestamp)
                .unwrap_or_else(|_| Utc::now().into())
                .with_timezone(&Utc),
            response: row.get("response"),
            time_spent: row.get("time_spent"),
            confidence: row.get("confidence"),
            quality: row.get("quality"),
            previous_ef: row.get("previous_ef"),
            new_ef: row.get("new_ef"),
            previous_interval: row.get("previous_interval"),
            new_interval: row.get("new_interval"),
            metadata: metadata.and_then(|m| serde_json::from_str(&m).ok()),
        })
    }
} 