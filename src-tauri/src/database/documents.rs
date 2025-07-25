use sqlx::Row;
use chrono::{DateTime, Utc};
use uuid::Uuid;
use sha2::{Sha256, Digest};
use super::{Database, types::{Document, CreateDocumentRequest}};

impl Database {
    pub async fn create_document(&self, req: CreateDocumentRequest) -> Result<Document, sqlx::Error> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let tags_json = serde_json::to_string(&req.tags).unwrap_or_else(|_| "[]".to_string());
        let status = req.status.unwrap_or_else(|| "draft".to_string());
        
        // Calculate content hash if not provided
        let content_hash = req.content_hash.unwrap_or_else(|| Self::calculate_content_hash(&req.content));

        let document = Document {
            id: id.clone(),
            title: req.title.clone(),
            content: req.content.clone(),
            content_hash: Some(content_hash.clone()),
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
            INSERT INTO documents (id, title, content, content_hash, file_path, doc_type, tags, created_at, updated_at, status, category_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&req.title)
        .bind(&req.content)
        .bind(&content_hash)
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
                content_hash: row.get("content_hash"),
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
                content_hash: row.get("content_hash"),
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
        
        // Calculate content hash if not provided
        let content_hash = req.content_hash.unwrap_or_else(|| Self::calculate_content_hash(&req.content));

        let result = sqlx::query(
            r#"
            UPDATE documents 
            SET title = ?, content = ?, content_hash = ?, file_path = ?, doc_type = ?, tags = ?, updated_at = ?, status = ?, category_id = ?
            WHERE id = ?
            "#,
        )
        .bind(&req.title)
        .bind(&req.content)
        .bind(&content_hash)
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
                content_hash: row.get("content_hash"),
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
                content_hash: row.get("content_hash"),
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

    /// Calculate SHA-256 hash of content for duplicate detection
    pub fn calculate_content_hash(content: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(content.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    /// Find existing document with the same content hash
    pub async fn find_document_by_hash(&self, content_hash: &str) -> Result<Option<Document>, sqlx::Error> {
        let row = sqlx::query("SELECT * FROM documents WHERE content_hash = ? LIMIT 1")
            .bind(content_hash)
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
                content_hash: row.get("content_hash"),
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

    /// Check if a document with this content already exists
    pub async fn check_for_duplicate(&self, content: &str) -> Result<Option<Document>, sqlx::Error> {
        let content_hash = Self::calculate_content_hash(content);
        self.find_document_by_hash(&content_hash).await
    }
} 