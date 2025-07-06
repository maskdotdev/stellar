import { invoke } from "@tauri-apps/api/core"
import { path } from "@tauri-apps/api"

export interface EmbeddingConfig {
  provider: 'openai' | 'local' | 'ollama';
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface DocumentChunk {
  id: string
  document_id: string
  content: string
  chunk_index: number
  metadata: Record<string, string>
  created_at: string
}

export interface EmbeddingSearchResult {
  chunk: DocumentChunk
  score: number
}

export interface SearchQuery {
  query: string
  limit?: number
  threshold?: number
  document_ids?: string[]
}

export interface EmbeddingStats {
  total_chunks: number
  total_documents: number
  provider: string
  dimensions: number
}

export class EmbeddingService {
  private static instance: EmbeddingService
  private initialized = false

  static getInstance(): EmbeddingService {
    if (!EmbeddingService.instance) {
      EmbeddingService.instance = new EmbeddingService()
    }
    return EmbeddingService.instance
  }

  /**
   * Initialize the embedding service with sqlite-vec
   */
  async initialize(config?: EmbeddingConfig): Promise<boolean> {
    try {
      // Default configuration - use Ollama with the correct URL and model
      const defaultConfig: EmbeddingConfig = {
        provider: 'ollama',
        model: 'mxbai-embed-large', // Use the model that exists
        baseUrl: 'http://localhost:11434' // Correct Ollama URL
      };

      const finalConfig = { ...defaultConfig, ...config };
      
      // Use the same data directory structure as the main database
      const dataDir = await path.dataDir();
      const stellarDataDir = await path.join(dataDir, "stellar_data");
      const dbPath = await path.join(stellarDataDir, "embeddings.db");
      
      this.initialized = await invoke<boolean>("init_vector_service", {
        dbPath,
        embeddingProvider: finalConfig.provider,
        model: finalConfig.model,
        apiKey: finalConfig.apiKey,
        baseUrl: finalConfig.baseUrl,
      });
      
      if (this.initialized) {
        console.log("✅ Embedding service initialized successfully");
      }
      
      return this.initialized;
    } catch (error) {
      console.warn("Failed to initialize new embedding service:", error);
      
      // Try the legacy initialization for backward compatibility with correct Ollama settings
      try {
        const result = await invoke<any>("init_embedding_service", {
          legacyUrl: "http://localhost:11434" // Legacy parameter for backward compatibility
        });
        
        this.initialized = result.success || false;
        
        if (this.initialized) {
          console.log(`✅ Embedding service initialized with ${result.provider}`);
          if (result.model) {
            console.log(`🤖 Using model: ${result.model}`);
          }
          if (result.base_url) {
            console.log(`🌐 Base URL: ${result.base_url}`);
          }
          if (result.fallback_used) {
            console.warn("⚠️ Using fallback embedding provider:", result.provider);
            console.warn("💡 Consider setting up Ollama for better embeddings: https://ollama.ai");
          }
          if (result.last_error) {
            console.warn("Previous errors:", result.last_error);
          }
        }
        
        return this.initialized;
      } catch (legacyError) {
        console.error("Both new and legacy embedding initialization failed:", legacyError);
        return false;
      }
    }
  }

  /**
   * Process a document for embeddings (usually called automatically when documents are uploaded)
   */
  async processDocument(
    documentId: string,
    title: string,
    content: string,
    docType: string,
    filePath?: string
  ): Promise<boolean> {
    try {
      return await invoke<boolean>("process_document_embeddings", {
        documentId,
        title,
        content,
        docType,
        filePath
      })
    } catch (error) {
      console.error("Failed to process document embeddings:", error)
      return false
    }
  }

  /**
   * Search for relevant document chunks using semantic search
   */
  async search(query: SearchQuery): Promise<EmbeddingSearchResult[]> {
    try {
      return await invoke<EmbeddingSearchResult[]>("search_document_embeddings", {
        query: query.query,
        limit: query.limit,
        threshold: query.threshold,
        documentIds: query.document_ids
      })
    } catch (error) {
      console.error("Failed to search embeddings:", error)
      return []
    }
  }

  /**
   * Delete embeddings for a document
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      return await invoke<boolean>("delete_document_embeddings", {
        documentId
      })
    } catch (error) {
      console.error("Failed to delete document embeddings:", error)
      return false
    }
  }

  /**
   * Get embedding statistics
   */
  async getStats(): Promise<EmbeddingStats | null> {
    try {
      return await invoke<EmbeddingStats>("get_embedding_stats")
    } catch (error) {
      console.error("Failed to get embedding stats:", error)
      return null
    }
  }

  /**
   * Check if the embedding service is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await invoke<boolean>("check_embedding_health")
    } catch (error) {
      console.error("Embedding health check failed:", error)
      return false
    }
  }

  /**
   * Find relevant context for a query across all documents
   */
  async findRelevantContext(
    query: string,
    options: {
      limit?: number
      threshold?: number
      documentIds?: string[]
    } = {}
  ): Promise<string> {
    const results = await this.search({
      query,
      limit: options.limit || 5,
      threshold: options.threshold || 0.7,
      document_ids: options.documentIds
    })

    if (results.length === 0) {
      return ""
    }

    // Group chunks by document and create context string
    const contextParts: string[] = []
    const documentGroups = new Map<string, EmbeddingSearchResult[]>()
    
    for (const result of results) {
      const docId = result.chunk.document_id
      if (!documentGroups.has(docId)) {
        documentGroups.set(docId, [])
      }
      documentGroups.get(docId)!.push(result)
    }

    for (const [, chunks] of documentGroups.entries()) {
      const docTitle = chunks[0]?.chunk.metadata.title || "Document"
      const chunkContents = chunks
        .sort((a, b) => a.chunk.chunk_index - b.chunk.chunk_index)
        .map(result => result.chunk.content)
        .join("\n\n")
      
      contextParts.push(`### ${docTitle}\n${chunkContents}`)
    }

    return contextParts.join("\n\n---\n\n")
  }

  /**
   * Get if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Configure embedding provider settings
   */
  async configure(config: EmbeddingConfig): Promise<boolean> {
    // This will reinitialize with new config
    return await this.initialize(config)
  }

  /**
   * Get supported embedding providers
   */
  getSupportedProviders(): Array<{provider: string, name: string, description: string}> {
    return [
      {
        provider: 'ollama',
        name: 'Ollama (Local)',
        description: 'Run models locally with Ollama - good balance of privacy and quality'
      },
      {
        provider: 'openai',
        name: 'OpenAI',
        description: 'High-quality embeddings from OpenAI (requires API key)'
      },
      // Local models temporarily disabled
      // {
      //   provider: 'local',
      //   name: 'Local Models',
      //   description: 'Run models directly in the app (larger download)'
      // }
    ]
  }

  /**
   * List all documents that have embeddings
   */
  async listEmbeddedDocuments(): Promise<any[]> {
    try {
      return await invoke<any[]>("list_embedded_documents")
    } catch (error) {
      console.error("Failed to list embedded documents:", error)
      return []
    }
  }

  /**
   * Get embedding information for a specific document
   */
  async getDocumentEmbeddingInfo(documentId: string): Promise<any> {
    try {
      return await invoke("get_document_embedding_info", { documentId })
    } catch (error) {
      console.error("Failed to get document embedding info:", error)
      return null
    }
  }

  /**
   * Get general information about the embedding database
   */
  async getDatabaseInfo(): Promise<any> {
    try {
      return await invoke("get_embedding_database_info")
    } catch (error) {
      console.error("Failed to get embedding database info:", error)
      return null
    }
  }

  /**
   * Debug the embedding service status
   */
  async debug(): Promise<any> {
    try {
      return await invoke<any>("debug_embedding_service")
    } catch (error) {
      console.error("Failed to debug embedding service:", error)
      throw error
    }
  }

  /**
   * Bulk reprocess all existing documents for embeddings
   */
  async bulkReprocessDocuments(): Promise<{
    processed: number
    failed: number
    skipped: number
    total_documents: number
    errors: string[]
  }> {
    try {
      const result = await invoke<{
        processed: number
        failed: number
        skipped: number
        total_documents: number
        errors: string[]
      }>("bulk_reprocess_documents_for_embeddings")
      
      console.log(`✅ Bulk reprocessing completed: ${result.processed}/${result.total_documents} documents processed`)
      if (result.skipped > 0) {
        console.log(`⏭️ Skipped ${result.skipped} documents (already had embeddings)`)
      }
      if (result.errors.length > 0) {
        console.warn("⚠️ Some documents failed to process:", result.errors)
      }
      
      return result
    } catch (error) {
      console.error("Failed to bulk reprocess documents:", error)
      throw error
    }
  }

  /**
   * Copy embeddings from one document to another (for duplicates)
   */
  async copyDocumentEmbeddings(sourceDocumentId: string, targetDocumentId: string): Promise<boolean> {
    try {
      const result = await invoke<boolean>("copy_document_embeddings", {
        sourceDocumentId,
        targetDocumentId
      })
      
      console.log(`📋 Successfully copied embeddings from ${sourceDocumentId} to ${targetDocumentId}`)
      return result
    } catch (error) {
      console.error("Failed to copy document embeddings:", error)
      throw error
    }
  }
}