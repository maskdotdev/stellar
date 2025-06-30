pub mod types;
pub mod chunking;
pub mod local; // Re-enable local embeddings for rust-bert fallback
pub mod cloud;
pub mod vector;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

pub use types::*;
pub use chunking::*;
pub use vector::VectorService;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingConfig {
    pub provider: EmbeddingProvider,
    pub model: String,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub dimensions: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EmbeddingProvider {
    #[serde(rename = "openai")]
    OpenAI,
    #[serde(rename = "local")]
    LocalModel,
    #[serde(rename = "ollama")]
    Ollama,
    #[serde(rename = "rust-bert")]
    RustBert, // Fallback provider
}

#[async_trait]
pub trait EmbeddingGenerator: Send + Sync {
    async fn generate_embeddings(&self, texts: &[String]) -> Result<Vec<Vec<f32>>, Box<dyn std::error::Error>>;
    fn dimensions(&self) -> usize;
}

pub fn create_embedding_generator(config: &EmbeddingConfig) -> Result<Box<dyn EmbeddingGenerator>, Box<dyn std::error::Error>> {
    match config.provider {
        EmbeddingProvider::OpenAI => {
            match config.api_key.as_ref() {
                Some(api_key) => {
                    Ok(Box::new(cloud::OpenAIEmbeddings::new(
                        api_key.clone(),
                        config.model.clone(),
                    )?))
                }
                None => {
                    eprintln!("OpenAI API key not provided, falling back to rust-bert");
                    Ok(Box::new(local::RustBertEmbeddings::new()?))
                }
            }
        }
        EmbeddingProvider::LocalModel => {
            match local::LocalEmbeddings::new(&config.model) {
                Ok(embeddings) => Ok(Box::new(embeddings)),
                Err(e) => {
                    eprintln!("Failed to load local model '{}': {}, falling back to rust-bert", config.model, e);
                    Ok(Box::new(local::RustBertEmbeddings::new()?))
                }
            }
        }
        EmbeddingProvider::Ollama => {
            let base_url = config.base_url.as_ref().unwrap_or(&"http://localhost:11434".to_string()).clone();
            match cloud::OllamaEmbeddings::new(base_url, config.model.clone()) {
                Ok(embeddings) => Ok(Box::new(embeddings)),
                Err(e) => {
                    eprintln!("Failed to connect to Ollama at {}: {}, falling back to rust-bert", 
                             config.base_url.as_ref().unwrap_or(&"http://localhost:11434".to_string()), e);
                    Ok(Box::new(local::RustBertEmbeddings::new()?))
                }
            }
        }
        EmbeddingProvider::RustBert => {
            Ok(Box::new(local::RustBertEmbeddings::new()?))
        }
    }
} 