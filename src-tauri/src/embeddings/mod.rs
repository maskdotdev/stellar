pub mod types;
pub mod chunking;
// pub mod local; // Temporarily disabled due to API changes
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
}

#[async_trait]
pub trait EmbeddingGenerator: Send + Sync {
    async fn generate_embeddings(&self, texts: &[String]) -> Result<Vec<Vec<f32>>, Box<dyn std::error::Error>>;
    fn dimensions(&self) -> usize;
}

pub fn create_embedding_generator(config: &EmbeddingConfig) -> Result<Box<dyn EmbeddingGenerator>, Box<dyn std::error::Error>> {
    match config.provider {
        EmbeddingProvider::OpenAI => {
            Ok(Box::new(cloud::OpenAIEmbeddings::new(
                config.api_key.as_ref().unwrap().clone(),
                config.model.clone(),
            )?))
        }
        EmbeddingProvider::LocalModel => {
            Err("Local models temporarily disabled".into())
            // Ok(Box::new(local::LocalEmbeddings::new(&config.model)?))
        }
        EmbeddingProvider::Ollama => {
            Ok(Box::new(cloud::OllamaEmbeddings::new(
                config.base_url.as_ref().unwrap_or(&"http://localhost:11434".to_string()).clone(),
                config.model.clone(),
            )?))
        }
    }
} 