import { LibraryService, type Document } from './library-service'

export interface DocumentContext {
  mentionedDocuments: Document[]
  contextualMessage: string
}

export class DocumentContextParser {
  private static instance: DocumentContextParser
  private libraryService: LibraryService

  private constructor() {
    this.libraryService = LibraryService.getInstance()
  }

  public static getInstance(): DocumentContextParser {
    if (!DocumentContextParser.instance) {
      DocumentContextParser.instance = new DocumentContextParser()
    }
    return DocumentContextParser.instance
  }

  /**
   * Parse document mentions from a message and return enhanced context
   */
  async parseDocumentMentions(message: string, documents: Document[]): Promise<DocumentContext> {
    const mentionedDocuments: Document[] = []
    
    // Check each document to see if it's mentioned in the message
    for (const document of documents) {
      const mentionPattern = `@${document.title}`
      if (message.includes(mentionPattern)) {
        mentionedDocuments.push(document)
      }
    }

    if (mentionedDocuments.length === 0) {
      return {
        mentionedDocuments: [],
        contextualMessage: message
      }
    }

    // Create contextual message with document content
    let contextualMessage = message

    if (mentionedDocuments.length > 0) {
      const documentContext = mentionedDocuments.map(doc => {
        const preview = this.libraryService.getContentPreview(doc.content, 1000)
        return `Document: "${doc.title}"\nContent: ${preview}\n---`
      }).join('\n\n')

      contextualMessage = `The user is asking about the following documents:

${documentContext}

User question: ${message}`
    }

    return {
      mentionedDocuments,
      contextualMessage
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
  createSystemMessage(mentionedDocuments: Document[]): string {
    if (mentionedDocuments.length === 0) {
      return "You are a helpful AI assistant. Answer questions based on the provided context and your knowledge."
    }

    const documentList = mentionedDocuments.map(doc => 
      `- "${doc.title}" (${doc.doc_type})`
    ).join('\n')

    return `You are a helpful AI assistant with access to the following documents:

${documentList}

When answering questions, reference the provided document content and be specific about which document you're citing. If the user asks about something not covered in the documents, acknowledge that and provide general knowledge while noting the limitation.`
  }

  /**
   * Extract plain text from document mentions for display
   */
  getPlainTextMessage(message: string): string {
    // Simple replacement of @document_name with document_name
    let result = message
    // You could make this more sophisticated by iterating through known documents
    // For now, just remove @ symbols that are likely document mentions
    return result.replace(/@([a-zA-Z0-9\s\-_\.]+)/g, '$1')
  }
} 