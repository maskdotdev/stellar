use super::{EmbeddingGenerator, EmbeddingConfig, create_embedding_generator, DocumentChunk, EmbeddingSearchResult};
use rusqlite::{Connection, Result as SqliteResult, params};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::collections::HashMap;
use sqlite_vec::sqlite3_vec_init;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub document_id: String,
    pub content: String,
    pub metadata: serde_json::Value,
    pub score: f64,
    pub chunk_index: usize,
}

pub struct VectorService {
    conn: Connection,
    embedding_generator: Box<dyn EmbeddingGenerator>,
    dimensions: usize,
}

impl VectorService {
    pub async fn new(db_path: &str, embedding_config: EmbeddingConfig) -> Result<Self, Box<dyn std::error::Error>> {
        // Initialize sqlite-vec extension
        unsafe {
            rusqlite::ffi::sqlite3_auto_extension(Some(std::mem::transmute(
                sqlite3_vec_init as *const ()
            )));
        }
        
        let conn = Connection::open(db_path)?;
        
        // Test that sqlite-vec is working
        match conn.query_row("SELECT vec_version()", [], |row| {
            let version: String = row.get(0)?;
            Ok(version)
        }) {
            Ok(version) => println!("sqlite-vec extension loaded successfully! Version: {}", version),
            Err(e) => {
                println!("Warning: sqlite-vec extension not available: {}. Using fallback.", e);
            }
        }
        
        let embedding_generator = create_embedding_generator(&embedding_config)?;
        let dimensions = embedding_generator.dimensions();
        
        // Create vector table - using a compatible structure
        // If sqlite-vec is available, this will be enhanced
        conn.execute(
            "CREATE TABLE IF NOT EXISTS document_embeddings (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                chunk_text TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                metadata TEXT NOT NULL,
                embedding BLOB NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;
        
        // Create index for faster lookups
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_document_embeddings_document_id ON document_embeddings(document_id)",
            [],
        )?;
        
        Ok(Self {
            conn,
            embedding_generator,
            dimensions,
        })
    }
    
    pub async fn add_document_chunks(&mut self, chunks: &[DocumentChunk]) -> Result<(), Box<dyn std::error::Error>> {
        if chunks.is_empty() {
            return Ok(());
        }
        
        let texts: Vec<String> = chunks.iter().map(|c| c.content.clone()).collect();
        let embeddings = self.embedding_generator.generate_embeddings(&texts).await?;
        
        let mut stmt = self.conn.prepare(
            "INSERT OR REPLACE INTO document_embeddings (id, document_id, chunk_text, chunk_index, metadata, embedding) 
             VALUES (?, ?, ?, ?, ?, ?)"
        )?;
        
        for (chunk, embedding) in chunks.iter().zip(embeddings.iter()) {
            // Convert embedding to bytes for storage
            let embedding_bytes = bincode::serialize(embedding)?;
            
            stmt.execute(params![
                &chunk.id,
                &chunk.document_id,
                &chunk.content,
                &chunk.chunk_index,
                &serde_json::to_string(&chunk.metadata)?,
                &embedding_bytes,
            ])?;
        }
        
        println!("Added {} document chunks to vector database", chunks.len());
        Ok(())
    }
    
    pub async fn search_similar(&mut self, query: &str, limit: usize, document_ids: Option<&[String]>) -> Result<Vec<EmbeddingSearchResult>, Box<dyn std::error::Error>> {
        let query_embeddings = self.embedding_generator.generate_embeddings(&[query.to_string()]).await?;
        let query_embedding = &query_embeddings[0];
        
        // Build the SQL query
        let (sql, params_vec): (String, Vec<Box<dyn rusqlite::ToSql>>) = if let Some(doc_ids) = document_ids {
            let placeholders = doc_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            let mut query_params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
            for doc_id in doc_ids {
                query_params.push(Box::new(doc_id.to_string()));
            }
            query_params.push(Box::new(limit as i64));
            
            (format!(
                "SELECT id, document_id, chunk_text, chunk_index, metadata, embedding 
                 FROM document_embeddings 
                 WHERE document_id IN ({})
                 LIMIT ?",
                placeholders
            ), query_params)
        } else {
            (format!(
                "SELECT id, document_id, chunk_text, chunk_index, metadata, embedding 
                 FROM document_embeddings 
                 LIMIT ?"
            ), vec![Box::new(limit as i64)])
        };
        
        let mut stmt = self.conn.prepare(&sql)?;
        
        // Convert parameters to the expected format
        let param_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        
        let rows = stmt.query_map(param_refs.as_slice(), |row| {
            let embedding_bytes: Vec<u8> = row.get(5)?;
            let stored_embedding: Vec<f32> = bincode::deserialize(&embedding_bytes)
                .map_err(|e| rusqlite::Error::FromSqlConversionFailure(5, rusqlite::types::Type::Blob, Box::new(e)))?;
            
            // Calculate cosine similarity
            let score = self.cosine_similarity(query_embedding, &stored_embedding);
            
            let metadata_str: String = row.get(4)?;
            let metadata: HashMap<String, String> = serde_json::from_str(&metadata_str)
                .unwrap_or_default();
            
            let chunk = DocumentChunk {
                id: row.get(0)?,
                document_id: row.get(1)?,
                content: row.get(2)?,
                chunk_index: row.get(3)?,
                metadata,
                created_at: chrono::Utc::now(), // We'll use current time for now
            };
            
            Ok((chunk, score))
        })?;
        
        let mut results: Vec<(DocumentChunk, f32)> = rows.collect::<SqliteResult<Vec<_>>>()?;
        
        // Sort by score (highest first)
        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        
        // Convert to EmbeddingSearchResult
        let search_results: Vec<EmbeddingSearchResult> = results
            .into_iter()
            .take(limit)
            .map(|(chunk, score)| EmbeddingSearchResult { chunk, score })
            .collect();
        
        Ok(search_results)
    }
    
    pub fn delete_document(&mut self, document_id: &str) -> Result<(), Box<dyn std::error::Error>> {
        let deleted = self.conn.execute(
            "DELETE FROM document_embeddings WHERE document_id = ?",
            params![document_id],
        )?;
        
        println!("Deleted {} chunks for document {}", deleted, document_id);
        Ok(())
    }
    
    pub fn get_stats(&self) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
        let mut stmt = self.conn.prepare("SELECT COUNT(*) FROM document_embeddings")?;
        let total_chunks: i64 = stmt.query_row([], |row| row.get(0))?;
        
        let mut stmt = self.conn.prepare("SELECT COUNT(DISTINCT document_id) FROM document_embeddings")?;
        let total_documents: i64 = stmt.query_row([], |row| row.get(0))?;
        
        println!("Vector service stats: {} chunks, {} documents", total_chunks, total_documents);
        
        Ok(serde_json::json!({
            "total_chunks": total_chunks,
            "total_documents": total_documents,
            "provider": "sqlite-vec",
            "dimensions": self.dimensions
        }))
    }
    
    pub fn list_embedded_documents(&self) -> Result<Vec<serde_json::Value>, Box<dyn std::error::Error>> {
        let mut stmt = self.conn.prepare(
            "SELECT document_id, COUNT(*) as chunk_count, MIN(created_at) as first_embedded
             FROM document_embeddings 
             GROUP BY document_id 
             ORDER BY first_embedded DESC"
        )?;
        
        let rows = stmt.query_map([], |row| {
            Ok(serde_json::json!({
                "document_id": row.get::<_, String>(0)?,
                "chunk_count": row.get::<_, i64>(1)?,
                "first_embedded": row.get::<_, String>(2)?,
                "status": "embedded"
            }))
        })?;
        
        let documents: Result<Vec<_>, _> = rows.collect();
        Ok(documents?)
    }
    
    pub fn get_document_embedding_info(&self, document_id: &str) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, chunk_index, LENGTH(chunk_text) as text_length, created_at
             FROM document_embeddings 
             WHERE document_id = ?
             ORDER BY chunk_index"
        )?;
        
        let chunks: Result<Vec<_>, _> = stmt.query_map([document_id], |row| {
            Ok(serde_json::json!({
                "chunk_id": row.get::<_, String>(0)?,
                "chunk_index": row.get::<_, i64>(1)?,
                "text_length": row.get::<_, i64>(2)?,
                "created_at": row.get::<_, String>(3)?
            }))
        })?.collect();
        
        let chunk_list = chunks?;
        
        Ok(serde_json::json!({
            "document_id": document_id,
            "total_chunks": chunk_list.len(),
            "chunks": chunk_list
        }))
    }
    
    // Helper function to calculate cosine similarity
    fn cosine_similarity(&self, a: &[f32], b: &[f32]) -> f32 {
        if a.len() != b.len() {
            return 0.0;
        }
        
        let dot_product: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
        let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
        let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
        
        if norm_a == 0.0 || norm_b == 0.0 {
            return 0.0;
        }
        
        dot_product / (norm_a * norm_b)
    }
} 