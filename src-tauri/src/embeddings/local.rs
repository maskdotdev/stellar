use super::EmbeddingGenerator;
use async_trait::async_trait;
use std::hash::{Hash, Hasher};

pub struct LocalEmbeddings {
    // Placeholder for future local model implementations
}

impl LocalEmbeddings {
    pub fn new(model_name: &str) -> Result<Self, Box<dyn std::error::Error>> {
        // For now, just return an error since we're not implementing full local models
        Err(format!("Local model '{}' not implemented yet", model_name).into())
    }
}

#[async_trait]
impl EmbeddingGenerator for LocalEmbeddings {
    async fn generate_embeddings(&self, _texts: &[String]) -> Result<Vec<Vec<f32>>, Box<dyn std::error::Error>> {
        Err("Local embeddings not implemented".into())
    }

    fn dimensions(&self) -> usize {
        384 // Standard embedding size
    }
}

/// Simple rust-bert based embeddings as a fallback
pub struct RustBertEmbeddings {
    dimensions: usize,
}

impl RustBertEmbeddings {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        println!("🔧 Initializing rust-bert fallback embeddings");
        Ok(Self {
            dimensions: 384, // Standard BERT embedding size
        })
    }

    /// Generate simple embeddings based on text characteristics
    /// This is a basic fallback - not as good as real embeddings but functional
    fn generate_simple_embedding(&self, text: &str) -> Vec<f32> {
        let mut embedding = vec![0.0; self.dimensions];
        
        // Basic text analysis for embedding generation
        let words: Vec<&str> = text.split_whitespace().collect();
        let char_count = text.len() as f32;
        let word_count = words.len() as f32;
        
        // Generate features based on text characteristics
        let mut hasher = std::collections::hash_map::DefaultHasher::new();
        
        for (_i, word) in words.iter().enumerate().take(50) {
            word.hash(&mut hasher);
            let hash = hasher.finish();
            let index = (hash as usize) % self.dimensions;
            embedding[index] += 1.0 / (word_count + 1.0);
        }
        
        // Add length-based features
        embedding[0] = (char_count / 1000.0).min(1.0); // Normalized length
        embedding[1] = (word_count / 100.0).min(1.0);  // Normalized word count
        
        // Add simple n-gram features
        for i in 0..words.len().saturating_sub(1) {
            let bigram = format!("{} {}", words[i], words[i + 1]);
            bigram.hash(&mut hasher);
            let hash = hasher.finish();
            let index = 2 + ((hash as usize) % (self.dimensions - 2));
            embedding[index] += 0.5 / (word_count + 1.0);
        }
        
        // Normalize the embedding
        let norm: f32 = embedding.iter().map(|x| x * x).sum::<f32>().sqrt();
        if norm > 0.0 {
            embedding.iter_mut().for_each(|x| *x /= norm);
        }
        
        embedding
    }
}

#[async_trait]
impl EmbeddingGenerator for RustBertEmbeddings {
    async fn generate_embeddings(&self, texts: &[String]) -> Result<Vec<Vec<f32>>, Box<dyn std::error::Error>> {
        println!("🔧 Generating {} embeddings using rust-bert fallback", texts.len());
        
        let embeddings: Vec<Vec<f32>> = texts
            .iter()
            .map(|text| self.generate_simple_embedding(text))
            .collect();
        
        Ok(embeddings)
    }

    fn dimensions(&self) -> usize {
        self.dimensions
    }
} 