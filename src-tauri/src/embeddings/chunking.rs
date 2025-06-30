use super::types::{DocumentChunk, EmbeddingError};
use std::collections::HashMap;
use uuid::Uuid;

pub struct ChunkingStrategy {
    pub max_chunk_size: usize,
    pub overlap: usize,
    pub min_chunk_size: usize,
}

impl Default for ChunkingStrategy {
    fn default() -> Self {
        Self {
            max_chunk_size: 1000,
            overlap: 200,
            min_chunk_size: 100,
        }
    }
}

pub struct DocumentChunker {
    strategy: ChunkingStrategy,
}

impl DocumentChunker {
    pub fn new(strategy: ChunkingStrategy) -> Self {
        Self { strategy }
    }

    pub fn with_default_strategy() -> Self {
        Self::new(ChunkingStrategy::default())
    }

    /// Chunk document content into overlapping segments optimized for embeddings
    pub fn chunk_document(
        &self,
        document_id: &str,
        content: &str,
        metadata: HashMap<String, String>,
    ) -> Result<Vec<DocumentChunk>, EmbeddingError> {
        let mut chunks = Vec::new();
        
        // Split by paragraphs first for better semantic boundaries
        let paragraphs: Vec<&str> = content
            .split("\n\n")
            .filter(|p| !p.trim().is_empty())
            .collect();

        let mut current_chunk = String::new();
        let mut chunk_index = 0;

        for paragraph in paragraphs {
            let paragraph = paragraph.trim();
            
            // If adding this paragraph would exceed max size, finalize current chunk
            if !current_chunk.is_empty() && 
               current_chunk.len() + paragraph.len() + 2 > self.strategy.max_chunk_size {
                
                if current_chunk.trim().len() >= self.strategy.min_chunk_size {
                    chunks.push(self.create_chunk(
                        document_id,
                        &current_chunk,
                        chunk_index,
                        metadata.clone(),
                    )?);
                    chunk_index += 1;
                }

                // Start new chunk with overlap if possible
                current_chunk = self.create_overlap(&current_chunk, paragraph);
            } else {
                // Add paragraph to current chunk
                if !current_chunk.is_empty() {
                    current_chunk.push_str("\n\n");
                }
                current_chunk.push_str(paragraph);
            }
        }

        // Add final chunk if it has content
        if current_chunk.trim().len() >= self.strategy.min_chunk_size {
            chunks.push(self.create_chunk(
                document_id,
                &current_chunk,
                chunk_index,
                metadata.clone(),
            )?);
        }

        // If no chunks were created, create one from the entire content
        if chunks.is_empty() && !content.trim().is_empty() {
            chunks.push(self.create_chunk(
                document_id,
                content,
                0,
                metadata,
            )?);
        }

        Ok(chunks)
    }

    /// Create overlap between chunks by taking the last N words from previous chunk
    fn create_overlap(&self, previous_chunk: &str, new_paragraph: &str) -> String {
        let words: Vec<&str> = previous_chunk.split_whitespace().collect();
        let overlap_words = words.len().saturating_sub(self.strategy.overlap / 10); // Rough word count
        
        let overlap_text = if overlap_words > 0 && overlap_words < words.len() {
            words[overlap_words..].join(" ")
        } else {
            String::new()
        };

        if overlap_text.is_empty() {
            new_paragraph.to_string()
        } else {
            format!("{}\n\n{}", overlap_text, new_paragraph)
        }
    }

    fn create_chunk(
        &self,
        document_id: &str,
        content: &str,
        chunk_index: usize,
        metadata: HashMap<String, String>,
    ) -> Result<DocumentChunk, EmbeddingError> {
        Ok(DocumentChunk {
            id: Uuid::new_v4().to_string(),
            document_id: document_id.to_string(),
            content: content.trim().to_string(),
            chunk_index,
            metadata,
            created_at: chrono::Utc::now(),
        })
    }

    /// Chunk content by sentences for more precise semantic boundaries
    pub fn chunk_by_sentences(
        &self,
        document_id: &str,
        content: &str,
        metadata: HashMap<String, String>,
    ) -> Result<Vec<DocumentChunk>, EmbeddingError> {
        let sentences = self.split_sentences(content);
        let mut chunks = Vec::new();
        let mut current_chunk = String::new();
        let mut chunk_index = 0;

        for sentence in sentences {
            if !current_chunk.is_empty() && 
               current_chunk.len() + sentence.len() + 1 > self.strategy.max_chunk_size {
                
                if current_chunk.trim().len() >= self.strategy.min_chunk_size {
                    chunks.push(self.create_chunk(
                        document_id,
                        &current_chunk,
                        chunk_index,
                        metadata.clone(),
                    )?);
                    chunk_index += 1;
                }
                current_chunk = sentence.to_string();
            } else {
                if !current_chunk.is_empty() {
                    current_chunk.push(' ');
                }
                current_chunk.push_str(sentence);
            }
        }

        if current_chunk.trim().len() >= self.strategy.min_chunk_size {
            chunks.push(self.create_chunk(
                document_id,
                &current_chunk,
                chunk_index,
                metadata.clone(),
            )?);
        }

        Ok(chunks)
    }

    /// Simple sentence splitting - could be enhanced with proper NLP
    fn split_sentences<'a>(&self, text: &'a str) -> Vec<&'a str> {
        let sentence_endings = regex::Regex::new(r"[.!?]+\s+").unwrap();
        sentence_endings
            .split(text)
            .filter(|s| !s.trim().is_empty())
            .collect()
    }
} 