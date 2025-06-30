use super::EmbeddingGenerator;
use async_trait::async_trait;
use candle_core::{Device, Tensor};
use candle_nn::VarBuilder;
use candle_transformers::models::bert::{BertModel, Config};
use tokenizers::Tokenizer;
use std::path::Path;

pub struct LocalEmbeddings {
    model: BertModel,
    tokenizer: Tokenizer,
    device: Device,
    dimensions: usize,
}

impl LocalEmbeddings {
    pub fn new(model_path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let device = Device::Cpu; // Use CPU for simplicity, can be configured for GPU
        
        // Check if model directory exists
        if !Path::new(model_path).exists() {
            return Err(format!("Model path does not exist: {}", model_path).into());
        }
        
        // Load tokenizer
        let tokenizer_path = format!("{}/tokenizer.json", model_path);
        if !Path::new(&tokenizer_path).exists() {
            return Err(format!("Tokenizer not found at: {}", tokenizer_path).into());
        }
        let tokenizer = Tokenizer::from_file(&tokenizer_path)?;
        
        // Load model config
        let config_path = format!("{}/config.json", model_path);
        if !Path::new(&config_path).exists() {
            return Err(format!("Config not found at: {}", config_path).into());
        }
        let config: Config = serde_json::from_str(&std::fs::read_to_string(&config_path)?)?;
        
        // Load model weights
        let model_weights_path = format!("{}/model.safetensors", model_path);
        if !Path::new(&model_weights_path).exists() {
            return Err(format!("Model weights not found at: {}", model_weights_path).into());
        }
        
        let model_weights = candle_core::safetensors::load(&model_weights_path, &device)?;
        let var_builder = VarBuilder::from_tensors(model_weights, candle_core::DType::F32, &device);
        let model = BertModel::load(&var_builder, &config)?;
        
        Ok(Self {
            model,
            tokenizer,
            device,
            dimensions: config.hidden_size,
        })
    }
    
    fn mean_pooling(&self, token_embeddings: &Tensor, attention_mask: &Tensor) -> Result<Tensor, Box<dyn std::error::Error>> {
        let attention_mask_expanded = attention_mask
            .unsqueeze(2)?
            .expand(token_embeddings.shape())?
            .to_dtype(token_embeddings.dtype())?;
        
        let masked_embeddings = token_embeddings.broadcast_mul(&attention_mask_expanded)?;
        let summed = masked_embeddings.sum(1)?;
        let mask_sum = attention_mask.sum_keepdim(1)?.to_dtype(candle_core::DType::F32)?.clamp(1e-9, f64::INFINITY)?;
        Ok(summed.broadcast_div(&mask_sum)?)
    }
}

#[async_trait]
impl EmbeddingGenerator for LocalEmbeddings {
    async fn generate_embeddings(&self, texts: &[String]) -> Result<Vec<Vec<f32>>, Box<dyn std::error::Error>> {
        let mut embeddings = Vec::new();
        
        for text in texts {
            let encoding = self.tokenizer.encode(text, true)?;
            let tokens = encoding.get_ids().to_vec();
            let attention_mask: Vec<u32> = encoding.get_attention_mask().iter().map(|&x| x as u32).collect();
            
            let input_ids = Tensor::new(tokens.as_slice(), &self.device)?.unsqueeze(0)?;
            let attention_mask_tensor = Tensor::new(attention_mask.as_slice(), &self.device)?.unsqueeze(0)?;
            
            let outputs = self.model.forward(&input_ids, &attention_mask_tensor)?;
            let pooled = self.mean_pooling(&outputs, &attention_mask_tensor)?;
            
            // Normalize the embeddings
            let norm = pooled.sqr()?.sum_keepdim(1)?.sqrt()?;
            let normalized = pooled.broadcast_div(&norm)?;
            
            let embedding_vec = normalized.to_vec2::<f32>()?[0].clone();
            embeddings.push(embedding_vec);
        }
        
        Ok(embeddings)
    }

    fn dimensions(&self) -> usize {
        self.dimensions
    }
} 