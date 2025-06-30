use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentChunk {
    pub id: String,
    pub document_id: String,
    pub content: String,
    pub chunk_index: usize,
    pub metadata: HashMap<String, String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingSearchResult {
    pub chunk: DocumentChunk,
    pub score: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchQuery {
    pub query: String,
    pub limit: Option<usize>,
    pub threshold: Option<f32>,
    pub document_ids: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingStats {
    pub total_chunks: usize,
    pub total_documents: usize,
    pub average_chunk_size: f32,
}

#[derive(Debug)]
pub enum EmbeddingError {
    ModelError(String),
    VectorError(String),
    ChunkingError(String),
    IoError(std::io::Error),
    SerializationError(serde_json::Error),
}

impl From<std::io::Error> for EmbeddingError {
    fn from(error: std::io::Error) -> Self {
        EmbeddingError::IoError(error)
    }
}

impl From<serde_json::Error> for EmbeddingError {
    fn from(error: serde_json::Error) -> Self {
        EmbeddingError::SerializationError(error)
    }
}

impl std::fmt::Display for EmbeddingError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EmbeddingError::ModelError(msg) => write!(f, "Model error: {}", msg),
            EmbeddingError::VectorError(msg) => write!(f, "Vector database error: {}", msg),
            EmbeddingError::ChunkingError(msg) => write!(f, "Chunking error: {}", msg),
            EmbeddingError::IoError(err) => write!(f, "IO error: {}", err),
            EmbeddingError::SerializationError(err) => write!(f, "Serialization error: {}", err),
        }
    }
}

impl std::error::Error for EmbeddingError {} 