use sqlx::{sqlite::SqlitePool, Row};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use base64::{engine::general_purpose, Engine as _};

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

pub struct Database {
    pool: SqlitePool,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        let pool = SqlitePool::connect(database_url).await?;
        
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

    pub async fn create_document(&self, req: CreateDocumentRequest) -> Result<Document, sqlx::Error> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let tags_json = serde_json::to_string(&req.tags).unwrap_or_else(|_| "[]".to_string());
        let status = req.status.unwrap_or_else(|| "draft".to_string());

        let document = Document {
            id: id.clone(),
            title: req.title.clone(),
            content: req.content.clone(),
            file_path: req.file_path.clone(),
            doc_type: req.doc_type.clone(),
            tags: req.tags.clone(),
            created_at: now,
            updated_at: now,
            status: status.clone(),
            category_id: req.category_id.clone(),
        };

        sqlx::query(
            r#"
            INSERT INTO documents (id, title, content, file_path, doc_type, tags, created_at, updated_at, status, category_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&req.title)
        .bind(&req.content)
        .bind(&req.file_path)
        .bind(&req.doc_type)
        .bind(&tags_json)
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .bind(&status)
        .bind(&req.category_id)
        .execute(&self.pool)
        .await?;

        Ok(document)
    }

    pub async fn get_all_documents(&self) -> Result<Vec<Document>, sqlx::Error> {
        let rows = sqlx::query("SELECT * FROM documents ORDER BY updated_at DESC")
            .fetch_all(&self.pool)
            .await?;

        let mut documents = Vec::new();
        for row in rows {
            let tags_json: String = row.get("tags");
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
            
            let created_at: String = row.get("created_at");
            let updated_at: String = row.get("updated_at");

            documents.push(Document {
                id: row.get("id"),
                title: row.get("title"),
                content: row.get("content"),
                file_path: row.get("file_path"),
                doc_type: row.get("doc_type"),
                tags,
                created_at: DateTime::parse_from_rfc3339(&created_at)
                    .unwrap_or_else(|_| Utc::now().into())
                    .with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&updated_at)
                    .unwrap_or_else(|_| Utc::now().into())
                    .with_timezone(&Utc),
                status: row.get("status"),
                category_id: row.get("category_id"),
            });
        }

        Ok(documents)
    }

    pub async fn get_document(&self, id: &str) -> Result<Option<Document>, sqlx::Error> {
        let row = sqlx::query("SELECT * FROM documents WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;

        if let Some(row) = row {
            let tags_json: String = row.get("tags");
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
            
            let created_at: String = row.get("created_at");
            let updated_at: String = row.get("updated_at");

            Ok(Some(Document {
                id: row.get("id"),
                title: row.get("title"),
                content: row.get("content"),
                file_path: row.get("file_path"),
                doc_type: row.get("doc_type"),
                tags,
                created_at: DateTime::parse_from_rfc3339(&created_at)
                    .unwrap_or_else(|_| Utc::now().into())
                    .with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&updated_at)
                    .unwrap_or_else(|_| Utc::now().into())
                    .with_timezone(&Utc),
                status: row.get("status"),
                category_id: row.get("category_id"),
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn update_document(&self, id: &str, req: CreateDocumentRequest) -> Result<Option<Document>, sqlx::Error> {
        let now = Utc::now();
        let tags_json = serde_json::to_string(&req.tags).unwrap_or_else(|_| "[]".to_string());
        let status = req.status.unwrap_or_else(|| "draft".to_string());

        let result = sqlx::query(
            r#"
            UPDATE documents 
            SET title = ?, content = ?, file_path = ?, doc_type = ?, tags = ?, updated_at = ?, status = ?, category_id = ?
            WHERE id = ?
            "#,
        )
        .bind(&req.title)
        .bind(&req.content)
        .bind(&req.file_path)
        .bind(&req.doc_type)
        .bind(&tags_json)
        .bind(now.to_rfc3339())
        .bind(&status)
        .bind(&req.category_id)
        .bind(id)
        .execute(&self.pool)
        .await?;

        if result.rows_affected() > 0 {
            self.get_document(id).await
        } else {
            Ok(None)
        }
    }

    pub async fn delete_document(&self, id: &str) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM documents WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    // Category management methods

    pub async fn create_category(&self, req: CreateCategoryRequest) -> Result<Category, sqlx::Error> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();

        let category = Category {
            id: id.clone(),
            name: req.name.clone(),
            description: req.description.clone(),
            color: req.color.clone(),
            icon: req.icon.clone(),
            created_at: now,
            updated_at: now,
            document_count: 0,
        };

        sqlx::query(
            r#"
            INSERT INTO categories (id, name, description, color, icon, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&req.name)
        .bind(&req.description)
        .bind(&req.color)
        .bind(&req.icon)
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .execute(&self.pool)
        .await?;

        Ok(category)
    }

    pub async fn get_all_categories(&self) -> Result<Vec<Category>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            SELECT c.*, COUNT(d.id) as document_count 
            FROM categories c 
            LEFT JOIN documents d ON c.id = d.category_id 
            GROUP BY c.id 
            ORDER BY c.name ASC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        let mut categories = Vec::new();
        for row in rows {
            let created_at: String = row.get("created_at");
            let updated_at: String = row.get("updated_at");
            let document_count: i64 = row.get("document_count");

            categories.push(Category {
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
                document_count,
            });
        }

        Ok(categories)
    }

    pub async fn get_category(&self, id: &str) -> Result<Option<Category>, sqlx::Error> {
        let row = sqlx::query(
            r#"
            SELECT c.*, COUNT(d.id) as document_count 
            FROM categories c 
            LEFT JOIN documents d ON c.id = d.category_id 
            WHERE c.id = ? 
            GROUP BY c.id
            "#
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            let created_at: String = row.get("created_at");
            let updated_at: String = row.get("updated_at");
            let document_count: i64 = row.get("document_count");

            Ok(Some(Category {
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
                document_count,
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn update_category(&self, id: &str, req: CreateCategoryRequest) -> Result<Option<Category>, sqlx::Error> {
        let now = Utc::now();

        let result = sqlx::query(
            r#"
            UPDATE categories 
            SET name = ?, description = ?, color = ?, icon = ?, updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(&req.name)
        .bind(&req.description)
        .bind(&req.color)
        .bind(&req.icon)
        .bind(now.to_rfc3339())
        .bind(id)
        .execute(&self.pool)
        .await?;

        if result.rows_affected() > 0 {
            self.get_category(id).await
        } else {
            Ok(None)
        }
    }

    pub async fn delete_category(&self, id: &str) -> Result<bool, sqlx::Error> {
        // First, set category_id to NULL for all documents in this category
        sqlx::query("UPDATE documents SET category_id = NULL WHERE category_id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        // Then delete the category
        let result = sqlx::query("DELETE FROM categories WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn get_documents_by_category(&self, category_id: &str) -> Result<Vec<Document>, sqlx::Error> {
        let rows = sqlx::query("SELECT * FROM documents WHERE category_id = ? ORDER BY updated_at DESC")
            .bind(category_id)
            .fetch_all(&self.pool)
            .await?;

        let mut documents = Vec::new();
        for row in rows {
            let tags_json: String = row.get("tags");
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
            
            let created_at: String = row.get("created_at");
            let updated_at: String = row.get("updated_at");

            documents.push(Document {
                id: row.get("id"),
                title: row.get("title"),
                content: row.get("content"),
                file_path: row.get("file_path"),
                doc_type: row.get("doc_type"),
                tags,
                created_at: DateTime::parse_from_rfc3339(&created_at)
                    .unwrap_or_else(|_| Utc::now().into())
                    .with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&updated_at)
                    .unwrap_or_else(|_| Utc::now().into())
                    .with_timezone(&Utc),
                status: row.get("status"),
                category_id: row.get("category_id"),
            });
        }

        Ok(documents)
    }

    pub async fn get_uncategorized_documents(&self) -> Result<Vec<Document>, sqlx::Error> {
        let rows = sqlx::query("SELECT * FROM documents WHERE category_id IS NULL ORDER BY updated_at DESC")
            .fetch_all(&self.pool)
            .await?;

        let mut documents = Vec::new();
        for row in rows {
            let tags_json: String = row.get("tags");
            let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
            
            let created_at: String = row.get("created_at");
            let updated_at: String = row.get("updated_at");

            documents.push(Document {
                id: row.get("id"),
                title: row.get("title"),
                content: row.get("content"),
                file_path: row.get("file_path"),
                doc_type: row.get("doc_type"),
                tags,
                created_at: DateTime::parse_from_rfc3339(&created_at)
                    .unwrap_or_else(|_| Utc::now().into())
                    .with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&updated_at)
                    .unwrap_or_else(|_| Utc::now().into())
                    .with_timezone(&Utc),
                status: row.get("status"),
                category_id: row.get("category_id"),
            });
        }

        Ok(documents)
    }

    // API Key management methods
    
    /// Simple XOR encryption for API keys (not production-grade, but better than plaintext)
    fn encrypt_api_key(&self, api_key: &str) -> String {
        let key = b"stellar_api_key_encryption_2024"; // 32-byte key
        let encrypted: Vec<u8> = api_key
            .bytes()
            .enumerate()
            .map(|(i, b)| b ^ key[i % key.len()])
            .collect();
        general_purpose::STANDARD.encode(encrypted)
    }

    /// Decrypt API key
    fn decrypt_api_key(&self, encrypted_key: &str) -> Result<String, String> {
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

    /// Store an encrypted API key
    pub async fn store_api_key(&self, provider_id: &str, api_key: &str) -> Result<(), sqlx::Error> {
        let now = Utc::now().to_rfc3339();
        let encrypted_key = self.encrypt_api_key(api_key);

        sqlx::query(
            r#"
            INSERT OR REPLACE INTO api_keys (provider_id, encrypted_key, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            "#,
        )
        .bind(provider_id)
        .bind(&encrypted_key)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Retrieve and decrypt an API key
    pub async fn get_api_key(&self, provider_id: &str) -> Result<Option<String>, sqlx::Error> {
        let row = sqlx::query("SELECT encrypted_key FROM api_keys WHERE provider_id = ?")
            .bind(provider_id)
            .fetch_optional(&self.pool)
            .await?;

        if let Some(row) = row {
            let encrypted_key: String = row.get("encrypted_key");
            match self.decrypt_api_key(&encrypted_key) {
                Ok(api_key) => Ok(Some(api_key)),
                Err(_) => Ok(None), // Return None if decryption fails
            }
        } else {
            Ok(None)
        }
    }

    /// Delete an API key
    pub async fn delete_api_key(&self, provider_id: &str) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM api_keys WHERE provider_id = ?")
            .bind(provider_id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    /// List all stored provider IDs (for debugging/management)
    pub async fn list_api_key_providers(&self) -> Result<Vec<String>, sqlx::Error> {
        let rows = sqlx::query("SELECT provider_id FROM api_keys ORDER BY updated_at DESC")
            .fetch_all(&self.pool)
            .await?;

        Ok(rows.into_iter().map(|row| row.get("provider_id")).collect())
    }
} 