import { LibraryService } from './library-service'
import { EmbeddingService } from './embedding-service'
import { DocumentContextParser } from './document-context'

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
    if (this.initialized) return

    console.log('🚀 Initializing Stellar...')

    try {
      // Initialize library service (database)
      console.log('📚 Initializing library service...')
      const libraryService = LibraryService.getInstance()
      await libraryService.initialize()

      // Initialize embedding service (ChromaDB)
      console.log('🔍 Initializing embedding service...')
      const embeddingService = EmbeddingService.getInstance()
      const embeddingInitialized = await embeddingService.initialize()
      
      if (embeddingInitialized) {
        console.log('✅ ChromaDB connected successfully!')
        
        // Initialize document context parser with embeddings
        const contextParser = DocumentContextParser.getInstance()
        await contextParser.initializeEmbeddings()
        
        console.log('✅ Document context enhanced with semantic search')
      } else {
        console.warn('⚠️  ChromaDB not available - using basic document context')
        console.log('💡 To enable advanced features, see: docs/chromadb-setup.md')
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
    const libraryService = LibraryService.getInstance()
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