use sqlx::{sqlite::SqlitePool, Row};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

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
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDocumentRequest {
    pub title: String,
    pub content: String,
    pub file_path: Option<String>,
    pub doc_type: String,
    pub tags: Vec<String>,
    pub status: Option<String>,
}

pub struct Database {
    pool: SqlitePool,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        let pool = SqlitePool::connect(database_url).await?;
        
        // Create tables if they don't exist
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
                status TEXT NOT NULL DEFAULT 'draft'
            )
            "#,
        )
        .execute(&pool)
        .await?;

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
        };

        sqlx::query(
            r#"
            INSERT INTO documents (id, title, content, file_path, doc_type, tags, created_at, updated_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            SET title = ?, content = ?, file_path = ?, doc_type = ?, tags = ?, updated_at = ?, status = ?
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
} 