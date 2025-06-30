# Migration Plan: ChromaDB → sqlite-vec

## Overview
Replace the external ChromaDB dependency with sqlite-vec, a SQLite extension that provides vector search capabilities with zero external dependencies. This migration includes both local and cloud-based embedding generation options.

## Benefits of Migration

### Current Issues (ChromaDB)
- ❌ Requires Python 3.8+ installation
- ❌ Manual setup script execution  
- ❌ External server process management
- ❌ Complex deployment/distribution
- ❌ User must start/stop ChromaDB manually

### After Migration (sqlite-vec)
- ✅ Zero external dependencies
- ✅ Embedded in Tauri application
- ✅ No user setup required
- ✅ Automatic startup/shutdown
- ✅ Cross-platform compatibility
- ✅ Smaller application size
- ✅ Flexible embedding generation (local or cloud)

## Implementation Steps

### 1. Add Dependencies

```toml
# src-tauri/Cargo.toml
[dependencies]
# Core database and vector search
rusqlite = { version = "0.31", features = ["bundled", "load_extension"] }
sqlite-vec = "0.1"

# Embedding generation - local models
candle-core = "0.7"
candle-nn = "0.7"
candle-transformers = "0.7"
tokenizers = "0.19"

# Embedding generation - cloud APIs
reqwest = { version = "0.12", features = ["json"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# Async support
tokio = { version = "1.0", features = ["full"] }

# Configuration
config = "0.14"
```

### 2. Create Embedding Service

```rust
// src-tauri/src/embeddings/mod.rs
pub mod local;
pub mod cloud;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

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
    OpenAI,
    LocalModel,
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
            Ok(Box::new(local::LocalEmbeddings::new(&config.model)?))
        }
        EmbeddingProvider::Ollama => {
            Ok(Box::new(cloud::OllamaEmbeddings::new(
                config.base_url.as_ref().unwrap_or(&"http://localhost:11434".to_string()).clone(),
                config.model.clone(),
            )?))
        }
    }
}
```

### 3. Implement Cloud-based Embedding Generation

```rust
// src-tauri/src/embeddings/cloud.rs
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

// Similar implementation for Ollama
pub struct OllamaEmbeddings {
    client: Client,
    base_url: String,
    model: String,
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
        384 // Common for many models, should be configurable
    }
}
```

### 4. Implement Local Embedding Generation

```rust
// src-tauri/src/embeddings/local.rs
use super::EmbeddingGenerator;
use async_trait::async_trait;
use candle_core::{Device, Tensor};
use candle_nn::VarBuilder;
use candle_transformers::models::bert::{BertModel, Config};
use tokenizers::Tokenizer;

pub struct LocalEmbeddings {
    model: BertModel,
    tokenizer: Tokenizer,
    device: Device,
    dimensions: usize,
}

impl LocalEmbeddings {
    pub fn new(model_path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let device = Device::Cpu; // Use CPU for simplicity, can be configured for GPU
        
        // Load tokenizer
        let tokenizer = Tokenizer::from_file(format!("{}/tokenizer.json", model_path))?;
        
        // Load model config
        let config: Config = serde_json::from_str(&std::fs::read_to_string(
            format!("{}/config.json", model_path)
        )?)?;
        
        // Load model weights
        let model_weights = candle_core::safetensors::load(
            format!("{}/model.safetensors", model_path),
            &device
        )?;
        
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
        let masked_embeddings = token_embeddings.broadcast_mul(attention_mask)?;
        let summed = masked_embeddings.sum(1)?;
        let mask_sum = attention_mask.sum(1)?;
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
            
            let embedding_vec = pooled.to_vec2::<f32>()?[0].clone();
            embeddings.push(embedding_vec);
        }
        
        Ok(embeddings)
    }

    fn dimensions(&self) -> usize {
        self.dimensions
    }
}
```

### 5. Create Vector Database Service

```rust
// src-tauri/src/vector/mod.rs
use crate::embeddings::{EmbeddingGenerator, EmbeddingConfig, create_embedding_generator};
use rusqlite::{Connection, Result as SqliteResult, params};
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentChunk {
    pub id: String,
    pub document_id: String,
    pub content: String,
    pub chunk_index: usize,
    pub metadata: serde_json::Value,
}

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
        let mut conn = Connection::open(db_path)?;
        
        // Load sqlite-vec extension
        unsafe {
            conn.load_extension_enable()?;
            conn.load_extension(Path::new("vec0"), None)?;
        }
        
        let embedding_generator = create_embedding_generator(&embedding_config)?;
        let dimensions = embedding_generator.dimensions();
        
        // Create vector table with correct dimensions
        conn.execute(
            &format!(
                "CREATE VIRTUAL TABLE IF NOT EXISTS document_embeddings USING vec0(
                    content_embedding float[{}],
                    document_id TEXT,
                    chunk_text TEXT,
                    chunk_index INTEGER,
                    metadata TEXT
                )",
                dimensions
            ),
            [],
        )?;
        
        Ok(Self {
            conn,
            embedding_generator,
            dimensions,
        })
    }
    
    pub async fn add_document_chunks(&mut self, chunks: &[DocumentChunk]) -> Result<(), Box<dyn std::error::Error>> {
        let texts: Vec<String> = chunks.iter().map(|c| c.content.clone()).collect();
        let embeddings = self.embedding_generator.generate_embeddings(&texts).await?;
        
        let mut stmt = self.conn.prepare(
            "INSERT INTO document_embeddings (rowid, content_embedding, document_id, chunk_text, chunk_index, metadata) 
             VALUES (?, ?, ?, ?, ?, ?)"
        )?;
        
        for (chunk, embedding) in chunks.iter().zip(embeddings.iter()) {
            stmt.execute(params![
                &chunk.id,
                &serde_json::to_string(embedding)?,
                &chunk.document_id,
                &chunk.content,
                &chunk.chunk_index,
                &serde_json::to_string(&chunk.metadata)?,
            ])?;
        }
        
        Ok(())
    }
    
    pub async fn search_similar(&mut self, query: &str, limit: usize, document_ids: Option<&[String]>) -> Result<Vec<SearchResult>, Box<dyn std::error::Error>> {
        let query_embeddings = self.embedding_generator.generate_embeddings(&[query.to_string()]).await?;
        let query_embedding = &query_embeddings[0];
        let embedding_json = serde_json::to_string(query_embedding)?;
        
        let (sql, params): (String, Vec<&dyn rusqlite::ToSql>) = if let Some(doc_ids) = document_ids {
            let placeholders = doc_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            let mut query_params: Vec<&dyn rusqlite::ToSql> = vec![&embedding_json];
            for doc_id in doc_ids {
                query_params.push(doc_id);
            }
            query_params.push(&(limit as i64));
            
            (format!(
                "SELECT document_id, chunk_text, chunk_index, metadata, distance 
                 FROM document_embeddings 
                 WHERE content_embedding MATCH ? AND document_id IN ({})
                 ORDER BY distance 
                 LIMIT ?",
                placeholders
            ), query_params)
        } else {
            (format!(
                "SELECT document_id, chunk_text, chunk_index, metadata, distance 
                 FROM document_embeddings 
                 WHERE content_embedding MATCH ? 
                 ORDER BY distance 
                 LIMIT ?"
            ), vec![&embedding_json, &(limit as i64)])
        };
        
        let mut stmt = self.conn.prepare(&sql)?;
        let rows = stmt.query_map(params.as_slice(), |row| {
            Ok(SearchResult {
                document_id: row.get(0)?,
                content: row.get(1)?,
                chunk_index: row.get(2)?,
                metadata: serde_json::from_str(&row.get::<_, String>(3)?).unwrap_or_default(),
                score: 1.0 - row.get::<_, f64>(4)?, // Convert distance to similarity
            })
        })?;
        
        rows.collect::<SqliteResult<Vec<_>>>().map_err(Into::into)
    }
    
    pub fn delete_document(&mut self, document_id: &str) -> Result<(), Box<dyn std::error::Error>> {
        self.conn.execute(
            "DELETE FROM document_embeddings WHERE document_id = ?",
            params![document_id],
        )?;
        Ok(())
    }
}
```

### 6. Update Tauri Commands

```rust
// src-tauri/src/commands/embeddings.rs
use crate::vector::{VectorService, DocumentChunk, SearchResult};
use crate::embeddings::{EmbeddingConfig, EmbeddingProvider};
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::State;

type VectorState = Arc<Mutex<Option<VectorService>>>;

#[tauri::command]
pub async fn init_vector_service(
    state: State<'_, VectorState>,
    db_path: String,
    embedding_provider: String,
    model: String,
    api_key: Option<String>,
    base_url: Option<String>,
) -> Result<bool, String> {
    let provider = match embedding_provider.as_str() {
        "openai" => EmbeddingProvider::OpenAI,
        "local" => EmbeddingProvider::LocalModel,
        "ollama" => EmbeddingProvider::Ollama,
        _ => return Err("Invalid embedding provider".to_string()),
    };
    
    let config = EmbeddingConfig {
        provider,
        model,
        api_key,
        base_url,
        dimensions: 384, // Will be determined by the actual model
    };
    
    let service = VectorService::new(&db_path, config).await
        .map_err(|e| format!("Failed to initialize vector service: {}", e))?;
    
    let mut guard = state.lock().await;
    *guard = Some(service);
    
    Ok(true)
}

#[tauri::command]
pub async fn process_document_embeddings(
    state: State<'_, VectorState>,
    document_id: String,
    title: String,
    content: String,
    doc_type: String,
    file_path: Option<String>,
) -> Result<bool, String> {
    let mut guard = state.lock().await;
    let service = guard.as_mut()
        .ok_or("Vector service not initialized")?;

    // Simple chunking strategy - split by paragraphs and limit size
    let chunks: Vec<DocumentChunk> = content
        .split("\n\n")
        .enumerate()
        .map(|(i, chunk_content)| {
            let mut metadata = serde_json::json!({
                "title": title,
                "doc_type": doc_type,
                "chunk_index": i
            });
            
            if let Some(path) = &file_path {
                metadata["file_path"] = serde_json::Value::String(path.clone());
            }
            
            DocumentChunk {
                id: format!("{}_{}", document_id, i),
                document_id: document_id.clone(),
                content: chunk_content.to_string(),
                chunk_index: i,
                metadata,
            }
        })
        .collect();

    service.add_document_chunks(&chunks).await
        .map_err(|e| format!("Failed to process document embeddings: {}", e))?;

    Ok(true)
}

#[tauri::command]
pub async fn search_document_embeddings(
    state: State<'_, VectorState>,
    query: String,
    limit: Option<usize>,
    document_ids: Option<Vec<String>>,
) -> Result<Vec<SearchResult>, String> {
    let mut guard = state.lock().await;
    let service = guard.as_mut()
        .ok_or("Vector service not initialized")?;
    
    service.search_similar(
        &query, 
        limit.unwrap_or(10),
        document_ids.as_ref().map(|v| v.as_slice())
    ).await
    .map_err(|e| format!("Search failed: {}", e))
}

#[tauri::command]
pub async fn delete_document_embeddings(
    state: State<'_, VectorState>,
    document_id: String,
) -> Result<bool, String> {
    let mut guard = state.lock().await;
    let service = guard.as_mut()
        .ok_or("Vector service not initialized")?;

    service.delete_document(&document_id)
        .map_err(|e| format!("Failed to delete document embeddings: {}", e))?;

    Ok(true)
}

#[tauri::command]
pub async fn get_embedding_stats(
    state: State<'_, VectorState>,
) -> Result<serde_json::Value, String> {
    let guard = state.lock().await;
    let _service = guard.as_ref()
        .ok_or("Vector service not initialized")?;

    // Return basic stats - can be expanded
    Ok(serde_json::json!({
        "total_chunks": 0, // Could query the database for actual count
        "total_documents": 0,
        "provider": "sqlite-vec"
    }))
}
```

### 7. Update Frontend Service

```typescript
// src/lib/embedding-service.ts
import { invoke } from "@tauri-apps/api/core";
import { path } from "@tauri-apps/api";

export interface EmbeddingConfig {
  provider: 'openai' | 'local' | 'ollama';
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  metadata: Record<string, any>;
}

export interface EmbeddingSearchResult {
  document_id: string;
  content: string;
  metadata: Record<string, any>;
  score: number;
  chunk_index: number;
}

export interface SearchQuery {
  query: string;
  limit?: number;
  document_ids?: string[];
}

export class EmbeddingService {
  private initialized = false;
  private static instance: EmbeddingService;

  static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService();
    }
    return EmbeddingService.instance;
  }

  async initialize(config?: EmbeddingConfig): Promise<boolean> {
    try {
      // Default configuration - can be overridden by user settings
      const defaultConfig: EmbeddingConfig = {
        provider: 'ollama',
        model: 'all-minilm',
        baseUrl: 'http://localhost:11434'
      };

      const finalConfig = { ...defaultConfig, ...config };
      
      const dbPath = await path.join(await path.dataDir(), "stellar.db");
      
      this.initialized = await invoke<boolean>("init_vector_service", {
        dbPath,
        embeddingProvider: finalConfig.provider,
        model: finalConfig.model,
        apiKey: finalConfig.apiKey,
        baseUrl: finalConfig.baseUrl,
      });
      
      return this.initialized;
    } catch (error) {
      console.error("Failed to initialize vector service:", error);
      return false;
    }
  }

  async processDocument(
    documentId: string,
    title: string,
    content: string,
    docType: string,
    filePath?: string
  ): Promise<boolean> {
    if (!this.initialized) {
      throw new Error("Vector service not initialized");
    }

    return await invoke<boolean>("process_document_embeddings", {
      documentId,
      title,
      content,
      docType,
      filePath,
    });
  }

  async search(query: SearchQuery): Promise<EmbeddingSearchResult[]> {
    if (!this.initialized) {
      throw new Error("Vector service not initialized");
    }

    return await invoke<EmbeddingSearchResult[]>("search_document_embeddings", {
      query: query.query,
      limit: query.limit,
      documentIds: query.document_ids,
    });
  }

  async deleteDocument(documentId: string): Promise<boolean> {
    if (!this.initialized) {
      throw new Error("Vector service not initialized");
    }

    return await invoke<boolean>("delete_document_embeddings", {
      documentId,
    });
  }

  async getStats(): Promise<any> {
    if (!this.initialized) {
      throw new Error("Vector service not initialized");
    }

    return await invoke("get_embedding_stats");
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}
```

### 8. Update Main Application Setup

```rust
// src-tauri/src/main.rs
use std::sync::Arc;
use tokio::sync::Mutex;
use crate::vector::VectorService;

fn main() {
    tauri::Builder::default()
        .manage(Arc::new(Mutex::new(None::<VectorService>)))
        .invoke_handler(tauri::generate_handler![
            commands::embeddings::init_vector_service,
            commands::embeddings::process_document_embeddings,
            commands::embeddings::search_document_embeddings,
            commands::embeddings::delete_document_embeddings,
            commands::embeddings::get_embedding_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 9. Update Build Configuration  

```rust
// src-tauri/build.rs
fn main() {
    // Check for sqlite-vec library
    println!("cargo:rerun-if-changed=build.rs");
    
    // For bundled SQLite with extensions
    println!("cargo:rustc-link-lib=sqlite3");
    
    tauri_build::build()
}
```

### 10. Update App Initialization

```typescript
// src/lib/app-initialization.ts
import { EmbeddingService, EmbeddingConfig } from './embedding-service';
import { LibraryService } from './library-service';
import { DocumentContextParser } from './document-context';

export class AppInitializationService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('🚀 Initializing Stellar...');

    try {
      // Initialize library service (database)
      console.log('📚 Initializing library service...');
      const libraryService = LibraryService.getInstance();
      await libraryService.initialize();

      // Initialize embedding service with user preferences
      console.log('🔍 Initializing vector search...');
      const embeddingService = EmbeddingService.getInstance();
      
      // Try to get user's embedding preferences
      const embeddingConfig: EmbeddingConfig = await this.getEmbeddingConfig();
      
      const embeddingInitialized = await embeddingService.initialize(embeddingConfig);
      
      if (embeddingInitialized) {
        console.log('✅ Vector search initialized successfully!');
        
        // Initialize document context parser with embeddings
        const contextParser = DocumentContextParser.getInstance();
        await contextParser.initializeEmbeddings();
        
        console.log('✅ Document context enhanced with semantic search');
      } else {
        console.warn('⚠️ Vector search initialization failed - using basic document context');
      }

      this.initialized = true;
      console.log('🎉 Stellar initialization complete!');

    } catch (error) {
      console.error('❌ Failed to initialize Stellar:', error);
      throw error;
    }
  }

  private async getEmbeddingConfig(): Promise<EmbeddingConfig> {
    // This would read from user settings/preferences
    // For now, return sensible defaults
    return {
      provider: 'ollama',
      model: 'all-minilm',
      baseUrl: 'http://localhost:11434'
    };
  }
}
```

### 11. Remove ChromaDB Dependencies

1. **Delete ChromaDB files:**
   ```bash
   rm scripts/setup_chromadb.sh
   rm docs/chromadb-setup.md
   rm -rf src-tauri/src/embeddings/service.rs  # old ChromaDB service
   ```

2. **Update Cargo.toml:**
   ```toml
   # Remove:
   # reqwest = { version = "0.11", features = ["json"] }  # If only used for ChromaDB
   
   # Keep if used elsewhere, add sqlite-vec dependencies as shown above
   ```

3. **Clean up old commands:**
   - Remove old ChromaDB command handlers from `src-tauri/src/commands/mod.rs`
   - Update frontend to use new embedding service interface

## Embedding Generation Options

### Local Models
- **Pros**: No API costs, full privacy, works offline
- **Cons**: Larger app size, slower first-time setup, requires model download
- **Best for**: Privacy-focused users, offline usage

### Cloud APIs (OpenAI, etc.)
- **Pros**: High quality embeddings, no local resources needed
- **Cons**: Requires API key, ongoing costs, internet dependency
- **Best for**: Users wanting best quality with minimal setup

### Ollama (Recommended Default)
- **Pros**: Easy local setup, good quality, user controls models
- **Cons**: Requires Ollama installation (but much simpler than ChromaDB)
- **Best for**: Balance of quality, privacy, and ease of use

## Configuration Management

```rust
// src-tauri/src/config.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StellarConfig {
    pub embedding: EmbeddingConfig,
    pub database_path: String,
}

impl Default for StellarConfig {
    fn default() -> Self {
        Self {
            embedding: EmbeddingConfig {
                provider: EmbeddingProvider::Ollama,
                model: "all-minilm".to_string(),
                api_key: None,
                base_url: Some("http://localhost:11434".to_string()),
                dimensions: 384,
            },
            database_path: "stellar.db".to_string(),
        }
    }
}
```

## Migration Benefits

1. **Zero User Setup**: App works immediately after installation
2. **Smaller Distribution**: No Python runtime or ChromaDB server needed
3. **Better Performance**: Direct SQLite integration, no HTTP overhead
4. **Simplified Architecture**: One less moving part to manage
5. **Cross-Platform**: Works identically on Windows/Mac/Linux
6. **Flexible Embedding Options**: Support for local and cloud-based embedding generation
7. **Better Developer Experience**: Pure Rust implementation, easier debugging
8. **Data Portability**: Everything in SQLite database, easy backup/restore

## Timeline Estimate

- **Phase 1**: Core sqlite-vec integration and embedding infrastructure (3-4 days)
- **Phase 2**: Implement cloud and local embedding generators (2-3 days)
- **Phase 3**: Migrate existing functionality and update commands (2-3 days)  
- **Phase 4**: Frontend updates and testing (2-3 days)
- **Phase 5**: Documentation and cleanup (1-2 days)

**Total: ~2 weeks for complete migration with full embedding support**

## Risk Mitigation

- Keep ChromaDB code temporarily for rollback option
- Implement feature flags to switch between implementations
- Test thoroughly with existing document collections
- Provide migration utility for existing users' data
- Start with Ollama as default (easier than local models, more private than cloud APIs)
- Graceful fallbacks when embedding generation fails

## Post-Migration User Experience

1. **First Launch**: App automatically initializes sqlite-vec, no external setup needed
2. **Embedding Setup**: User can choose between Ollama (default), OpenAI, or local models
3. **Document Upload**: Automatically generates embeddings and stores in embedded database  
4. **Search**: Instant semantic search with no external dependencies
5. **Settings**: Easy switching between embedding providers in app settings 