use super::EmbeddingGenerator;
use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct OpenAIEmbeddingRequest {
    input: Vec<String>,
    model: String,
}

#[derive(Deserialize)]
struct OpenAIEmbeddingResponse {
    data: Vec<OpenAIEmbeddingData>,
}

#[derive(Deserialize)]
struct OpenAIEmbeddingData {
    embedding: Vec<f32>,
}

pub struct OpenAIEmbeddings {
    client: Client,
    api_key: String,
    model: String,
}

impl OpenAIEmbeddings {
    pub fn new(api_key: String, model: String) -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            client: Client::new(),
            api_key,
            model,
        })
    }
}

#[async_trait]
impl EmbeddingGenerator for OpenAIEmbeddings {
    async fn generate_embeddings(&self, texts: &[String]) -> Result<Vec<Vec<f32>>, Box<dyn std::error::Error>> {
        let request = OpenAIEmbeddingRequest {
            input: texts.to_vec(),
            model: self.model.clone(),
        };

        let response = self
            .client
            .post("https://api.openai.com/v1/embeddings")
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await?;

        let embedding_response: OpenAIEmbeddingResponse = response.json().await?;
        Ok(embedding_response.data.into_iter().map(|d| d.embedding).collect())
    }

    fn dimensions(&self) -> usize {
        match self.model.as_str() {
            "text-embedding-ada-002" => 1536,
            "text-embedding-3-small" => 1536,
            "text-embedding-3-large" => 3072,
            _ => 1536, // Default
        }
    }
}

// Ollama implementation
pub struct OllamaEmbeddings {
    client: Client,
    base_url: String,
    model: String,
}

impl OllamaEmbeddings {
    pub fn new(base_url: String, model: String) -> Result<Self, Box<dyn std::error::Error>> {
        Ok(Self {
            client: Client::new(),
            base_url,
            model,
        })
    }
}

#[async_trait]
impl EmbeddingGenerator for OllamaEmbeddings {
    async fn generate_embeddings(&self, texts: &[String]) -> Result<Vec<Vec<f32>>, Box<dyn std::error::Error>> {
        let mut embeddings = Vec::new();
        
        for text in texts {
            let request = serde_json::json!({
                "model": self.model,
                "prompt": text
            });

            let response = self
                .client
                .post(&format!("{}/api/embeddings", self.base_url))
                .json(&request)
                .send()
                .await?;

            let response_json: serde_json::Value = response.json().await?;
            if let Some(embedding) = response_json["embedding"].as_array() {
                let vec: Vec<f32> = embedding
                    .iter()
                    .filter_map(|v| v.as_f64().map(|f| f as f32))
                    .collect();
                embeddings.push(vec);
            }
        }
        
        Ok(embeddings)
    }

    fn dimensions(&self) -> usize {
        // Common for many models, should be configurable based on model
        match self.model.as_str() {
            "all-minilm" => 384,
            "nomic-embed-text" => 768,
            _ => 384, // Default
        }
    }
} 