import { LibraryService } from "@/lib/services/library-service"
import { EmbeddingService } from "@/lib/services/embedding-service"
import { DocumentContextParser } from './document-context'
import { invoke } from "@tauri-apps/api/core"

export class AppInitializationService {
  private static instance: AppInitializationService
  private initialized = false

  static getInstance(): AppInitializationService {
    if (!AppInitializationService.instance) {
      AppInitializationService.instance = new AppInitializationService()
    }
    return AppInitializationService.instance
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('🔄 App already initialized, skipping...')
      return
    }

    console.log('🚀 Initializing Stellar...')

    try {
      // Initialize library service (database)
      console.log('📚 Initializing library service...')
      const libraryService = LibraryService.getInstance()
      await libraryService.initialize()

      // Initialize embedding service with smart fallback (sqlite-vec)
      console.log('🔍 Initializing embedding service with fallback logic...')
      
      try {
        // Use the smart initialization service that handles fallbacks
        const embeddingService = EmbeddingService.getInstance()
        const result = await invoke<{
          success: boolean;
          provider: string;
          model: string;
          message: string;
          fallback_used: boolean;
          last_error?: string;
        }>("init_embedding_service", {});
        
        if (result.success) {
          // Mark the service as initialized so it knows it's ready
          embeddingService.markAsInitialized()
          
          if (result.fallback_used) {
            console.log(`⚠️ Embedding service initialized with fallback: ${result.provider}`)
            console.log('💡 Consider setting up Ollama for better performance: https://ollama.ai')
          } else {
            console.log(`✅ Embedding service initialized with ${result.provider}`)
          }
          
          if (result.last_error) {
            console.log(`📝 Fallback details: ${result.last_error}`)
          }
          
          // Initialize document context parser with embeddings
          const contextParser = DocumentContextParser.getInstance()
          await contextParser.initializeEmbeddings()
          
          console.log('✅ Document context enhanced with semantic search')
        } else {
          console.warn('⚠️ All embedding providers failed - using basic document context')
          console.log('💡 To enable advanced features, configure an embedding provider in settings')
        }
      } catch (error) {
        console.error('❌ Embedding service initialization failed:', error)
        console.warn('⚠️ Using basic document context without semantic search')
      }

      this.initialized = true
      console.log('🎉 Stellar initialization complete!')

    } catch (error) {
      console.error('❌ Failed to initialize Stellar:', error)
      throw error
    }
  }

  async getInitializationStatus(): Promise<{
    library: boolean
    embeddings: boolean
    embeddingHealth: boolean
  }> {
    const embeddingService = EmbeddingService.getInstance()
    const contextParser = DocumentContextParser.getInstance()

    return {
      library: true, // Always true if we get here
      embeddings: embeddingService.isInitialized(),
      embeddingHealth: await contextParser.getEmbeddingHealth()
    }
  }

  isInitialized(): boolean {
    return this.initialized
  }
} 