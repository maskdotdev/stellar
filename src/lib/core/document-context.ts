import { LibraryService, type Document } from "@/lib/services/library-service"
import { EmbeddingService, type EmbeddingSearchResult, type EmbeddingConfig } from "@/lib/services/embedding-service"

export interface ParsedDocumentContext {
  mentionedDocuments: Document[]
  contextualMessage: string
  hasContext: boolean
}

export interface DocumentMention {
  originalText: string
  documentName: string
  document?: Document
}

export class DocumentContextParser {
  private static instance: DocumentContextParser
  private libraryService: LibraryService
  private embeddingService: EmbeddingService

  private constructor() {
    this.libraryService = LibraryService.getInstance()
    this.embeddingService = EmbeddingService.getInstance()
  }

  public static getInstance(): DocumentContextParser {
    if (!DocumentContextParser.instance) {
      DocumentContextParser.instance = new DocumentContextParser()
    }
    return DocumentContextParser.instance
  }

  /**
   * Parse document mentions in format @{document_name} from user message
   */
  async parseDocumentMentions(message: string, availableDocuments: Document[]): Promise<ParsedDocumentContext> {
    const mentionRegex = /@\{([^}]+)\}/g
    const mentions: DocumentMention[] = []
    const mentionedDocuments: Document[] = []
    let match

    while ((match = mentionRegex.exec(message)) !== null) {
      const documentName = match[1]
      const document = this.findDocumentByName(documentName, availableDocuments)
      
      mentions.push({
        originalText: match[0],
        documentName,
        document
      })

      if (document) {
        mentionedDocuments.push(document)
      }
    }

    // Create contextual message with document content or semantic context
    let contextualMessage = message

    if (mentionedDocuments.length > 0) {
      // Use mentioned documents for context
      const documentContext = await this.buildDocumentContext(mentionedDocuments)
      contextualMessage = `${message}\n\nRelevant document context:\n${documentContext}`
    } else if (this.embeddingService.isInitialized()) {
      // If no specific documents mentioned, try semantic search
      const semanticContext = await this.embeddingService.findRelevantContext(message, {
        limit: 3,
        threshold: 0.75
      })
      
      if (semanticContext) {
        contextualMessage = `${message}\n\nRelevant context from your documents:\n${semanticContext}`
      }
    }

    return {
      mentionedDocuments,
      contextualMessage,
      hasContext: mentionedDocuments.length > 0 || contextualMessage !== message
    }
  }

  /**
   * Get document content for a specific document
   */
  async getDocumentContent(documentId: string): Promise<string | null> {
    try {
      const document = await this.libraryService.getDocument(documentId)
      return document?.content || null
    } catch (error) {
      console.error('Failed to get document content:', error)
      return null
    }
  }

  /**
   * Create a system message with document context
   */
  createSystemMessage(documents: Document[]): string {
    if (documents.length === 0) return ""

    const documentSummaries = documents.map(doc => {
      const preview = this.getContentPreview(doc.content, 500)
      return `## ${doc.title}\nType: ${doc.doc_type}\nContent: ${preview}`
    }).join('\n\n')

    return `You have access to the following documents that the user has mentioned. Use this information to provide relevant and accurate responses:

${documentSummaries}

Please reference these documents when answering questions and provide specific information from them when relevant.`
  }

  /**
   * Get plain text message without @{} mentions for display
   */
  getPlainTextMessage(message: string): string {
    return message.replace(/@\{([^}]+)\}/g, '$1')
  }

  /**
   * Build enhanced document context using embeddings if available
   */
  private async buildDocumentContext(documents: Document[]): Promise<string> {
    const contextParts: string[] = []

    for (const document of documents) {
      const title = `## ${document.title}`
      let content = ""

      if (this.embeddingService.isInitialized()) {
        // Try to get most relevant chunks for this document
        // This could be enhanced with the actual user query context
        const chunks = await this.embeddingService.search({
          query: document.title, // Simple approach - could be improved
          limit: 3,
          document_ids: [document.id],
          threshold: 0.5
        })

        if (chunks.length > 0) {
          content = chunks
            .sort((a: EmbeddingSearchResult, b: EmbeddingSearchResult) => a.chunk.chunk_index - b.chunk.chunk_index)
            .map((result: EmbeddingSearchResult) => result.chunk.content)
            .join('\n\n')
        } else {
          // Fallback to truncated full content
          content = this.getContentPreview(document.content, 1000)
        }
      } else {
        // No embedding service, use truncated content
        content = this.getContentPreview(document.content, 1000)
      }

      contextParts.push(`${title}\n${content}`)
    }

    return contextParts.join('\n\n---\n\n')
  }

  private findDocumentByName(name: string, documents: Document[]): Document | undefined {
    const normalizedName = name.toLowerCase().trim()
    
    // Try exact title match first
    let match = documents.find(doc => 
      doc.title.toLowerCase().trim() === normalizedName
    )

    // Try partial title match
    if (!match) {
      match = documents.find(doc => 
        doc.title.toLowerCase().includes(normalizedName) ||
        normalizedName.includes(doc.title.toLowerCase())
      )
    }

    // Try filename match (for PDFs)
    if (!match && normalizedName.includes('.')) {
      match = documents.find(doc => 
        doc.file_path && doc.file_path.toLowerCase().includes(normalizedName)
      )
    }

    return match
  }

  private getContentPreview(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content
    }
    
    const truncated = content.substring(0, maxLength)
    const lastSentence = truncated.lastIndexOf('.')
    
    if (lastSentence > maxLength * 0.7) {
      return truncated.substring(0, lastSentence + 1)
    }
    
    return truncated + '...'
  }

  /**
   * Initialize the embedding service
   */
  async initializeEmbeddings(config?: EmbeddingConfig): Promise<boolean> {
    return await this.embeddingService.initialize(config)
  }

  /**
   * Get embedding service health status
   */
  async getEmbeddingHealth(): Promise<boolean> {
    return await this.embeddingService.healthCheck()
  }
} 