import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'

export interface Document {
  id: string
  title: string
  content: string
  file_path?: string
  doc_type: string
  tags: string[]
  created_at: string
  updated_at: string
  status: string
}

export interface CreateDocumentRequest {
  title: string
  content: string
  file_path?: string
  doc_type: string
  tags: string[]
  status?: string
}

export interface UploadPdfOptions {
  title?: string
  tags?: string[]
  useMarker?: boolean
}

export class LibraryService {
  private static instance: LibraryService
  private initialized = false

  public static getInstance(): LibraryService {
    if (!LibraryService.instance) {
      LibraryService.instance = new LibraryService()
    }
    return LibraryService.instance
  }

  async initialize(): Promise<void> {
    if (this.initialized) return
    
    try {
      await invoke('init_database')
      this.initialized = true
      console.log('Database initialized successfully')
    } catch (error) {
      console.error('Failed to initialize database:', error)
      throw error
    }
  }

  async uploadPdf(): Promise<Document | null> {
    try {
      console.log('Starting PDF upload process...')
      
      // Open file dialog to select PDF
      const file = await open({
        multiple: false,
        filters: [
          {
            name: 'PDF Files',
            extensions: ['pdf']
          }
        ]
      })

      console.log('File dialog result:', file)

      if (!file) {
        console.log('User cancelled file selection')
        return null // User cancelled
      }

      console.log('Processing PDF file:', file)
      
      // Process the PDF and create document
      const document = await invoke<Document>('upload_and_process_pdf', {
        filePath: file,
        title: null,
        tags: null,
        useMarker: false
      })

      console.log('PDF processed successfully:', document)
      return document
    } catch (error) {
      console.error('Failed to upload PDF:', error)
      throw error
    }
  }

  async uploadPdfWithOptions(options: UploadPdfOptions): Promise<Document | null> {
    try {
      console.log('Starting PDF upload process with options:', options)
      
      // Open file dialog to select PDF
      const file = await open({
        multiple: false,
        filters: [
          {
            name: 'PDF Files',
            extensions: ['pdf']
          }
        ]
      })

      console.log('File dialog result:', file)

      if (!file) {
        console.log('User cancelled file selection')
        return null // User cancelled
      }

      console.log('Processing PDF file:', file)
      
      // Process the PDF with options
      const document = await invoke<Document>('upload_and_process_pdf', {
        filePath: file,
        title: options.title || null,
        tags: options.tags || null,
        useMarker: options.useMarker || false
      })

      console.log('PDF processed successfully:', document)
      return document
    } catch (error) {
      console.error('Failed to upload PDF:', error)
      throw error
    }
  }

  async uploadPdfWithMetadata(title: string, tags: string[] = []): Promise<Document | null> {
    try {
      // Open file dialog to select PDF
      const file = await open({
        multiple: false,
        filters: [
          {
            name: 'PDF Files',
            extensions: ['pdf']
          }
        ]
      })

      if (!file) {
        return null // User cancelled
      }

      // Process the PDF with custom metadata
      const document = await invoke<Document>('upload_and_process_pdf', {
        filePath: file,
        title,
        tags,
        useMarker: false
      })

      console.log('PDF processed successfully:', document)
      return document
    } catch (error) {
      console.error('Failed to upload PDF:', error)
      throw error
    }
  }

  async createDocument(request: CreateDocumentRequest): Promise<Document> {
    try {
      const document = await invoke<Document>('create_document', { request })
      console.log('Document created successfully:', document)
      return document
    } catch (error) {
      console.error('Failed to create document:', error)
      throw error
    }
  }

  async getAllDocuments(): Promise<Document[]> {
    try {
      const documents = await invoke<Document[]>('get_all_documents')
      return documents
    } catch (error) {
      console.error('Failed to get documents:', error)
      throw error
    }
  }

  async getDocument(id: string): Promise<Document | null> {
    try {
      const document = await invoke<Document | null>('get_document', { id })
      return document
    } catch (error) {
      console.error('Failed to get document:', error)
      throw error
    }
  }

  async updateDocument(id: string, request: CreateDocumentRequest): Promise<Document | null> {
    try {
      const document = await invoke<Document | null>('update_document', { id, request })
      console.log('Document updated successfully:', document)
      return document
    } catch (error) {
      console.error('Failed to update document:', error)
      throw error
    }
  }

  async deleteDocument(id: string): Promise<boolean> {
    try {
      const success = await invoke<boolean>('delete_document', { id })
      console.log('Document deleted successfully:', success)
      return success
    } catch (error) {
      console.error('Failed to delete document:', error)
      throw error
    }
  }

  // Helper method to extract text content preview
  getContentPreview(content: string, maxLength: number = 200): string {
    const plainText = content.replace(/#{1,6}\s/g, '').replace(/\n+/g, ' ').trim()
    if (plainText.length <= maxLength) {
      return plainText
    }
    return plainText.substring(0, maxLength) + '...'
  }

  // Helper method to format document date
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'Unknown date'
    }
  }
} 