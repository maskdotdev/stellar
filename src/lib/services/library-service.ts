import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { extractTextFromHTML } from '@/lib/utils/tiptap-utils'

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
  category_id?: string
}

export interface Category {
  id: string
  name: string
  description?: string
  color?: string
  icon?: string
  created_at: string
  updated_at: string
  document_count: number
}

export interface CreateDocumentRequest {
  title: string
  content: string
  file_path?: string
  doc_type: string
  tags: string[]
  status?: string
  category_id?: string
}

export interface CreateCategoryRequest {
  name: string
  description?: string
  color?: string
  icon?: string
}

export interface UploadPdfOptions {
  title?: string
  tags?: string[]
  useMarker?: boolean
  useEnhanced?: boolean
  useMarkItDown?: boolean
  categoryId?: string
}

export interface UploadPdfFromUrlOptions {
  url: string
  title?: string
  tags?: string[]
  useMarker?: boolean
  useEnhanced?: boolean
  useMarkItDown?: boolean
  categoryId?: string
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
        useMarker: options.useMarker || false,
        useEnhanced: options.useEnhanced || false,
        useMarkitdown: options.useMarkItDown || false,
        categoryId: options.categoryId || null
      })

      console.log('PDF processed successfully:', document)
      return document
    } catch (error) {
      console.error('Failed to upload PDF:', error)
      throw error
    }
  }

  async uploadPdfFileWithOptions(file: File, options: UploadPdfOptions): Promise<Document | null> {
    try {
      console.log('Starting PDF upload process with pre-selected file:', file.name, 'options:', options)
      
      // Convert File to Uint8Array for Tauri
      const arrayBuffer = await file.arrayBuffer()
      const fileData = Array.from(new Uint8Array(arrayBuffer))
      
      console.log('Converted file to bytes, size:', fileData.length)
      
      // Process the PDF with the new command that accepts file data
      const document = await invoke<Document>('upload_and_process_pdf_from_data', {
        fileData: fileData,
        fileName: file.name,
        title: options.title || null,
        tags: options.tags || null,
        useMarker: options.useMarker || false,
        useEnhanced: options.useEnhanced || false,
        useMarkitdown: options.useMarkItDown || false,
        categoryId: options.categoryId || null
      })

      console.log('PDF processed successfully:', document)
      return document
    } catch (error) {
      console.error('Failed to upload PDF file:', error)
      throw error
    }
  }

  async uploadPdfFromUrl(options: UploadPdfFromUrlOptions): Promise<Document | null> {
    try {
      console.log('Starting PDF upload from URL:', options)
      
      // Process the PDF from URL
      const document = await invoke<Document>('upload_and_process_pdf_from_url', {
        url: options.url,
        title: options.title || null,
        tags: options.tags || null,
        useMarker: options.useMarker || false,
        useEnhanced: options.useEnhanced || false,
        useMarkitdown: options.useMarkItDown || false,
        categoryId: options.categoryId || null
      })

      console.log('PDF from URL processed successfully:', document)
      return document
    } catch (error) {
      console.error('Failed to upload PDF from URL:', error)
      throw error
    }
  }

  async getPdfFilePath(filename: string): Promise<string | null> {
    try {
      console.log('Getting PDF file path for:', filename)
      
      const filePath = await invoke<string>('get_pdf_file_path', {
        filename: filename
      })

      console.log('PDF file path retrieved:', filePath)
      return filePath
    } catch (error) {
      console.error('Failed to get PDF file path:', error)
      return null
    }
  }

  async getPdfBlobUrl(filename: string): Promise<string | null> {
    try {
      console.log('Getting PDF content for:', filename)
      
      const fileContent = await invoke<number[]>('get_pdf_file_content', {
        filename: filename
      })

      // Convert the array of numbers to a Uint8Array
      const uint8Array = new Uint8Array(fileContent)
      
      // Create a blob from the file content
      const blob = new Blob([uint8Array], { type: 'application/pdf' })
      
      // Create a blob URL
      const blobUrl = URL.createObjectURL(blob)
      
      console.log('PDF blob URL created:', blobUrl)
      return blobUrl
    } catch (error) {
      console.error('Failed to get PDF content:', error)
      return null
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
    if (!content) return ''
    
    // Use the utility function to extract text from HTML content
    return extractTextFromHTML(content, maxLength)
  }

  // Category management methods

  async createCategory(request: CreateCategoryRequest): Promise<Category> {
    try {
      const category = await invoke<Category>('create_category', { request })
      console.log('Category created successfully:', category)
      return category
    } catch (error) {
      console.error('Failed to create category:', error)
      throw error
    }
  }

  async getAllCategories(): Promise<Category[]> {
    try {
      const categories = await invoke<Category[]>('get_all_categories')
      return categories
    } catch (error) {
      console.error('Failed to get categories:', error)
      throw error
    }
  }

  async getCategory(id: string): Promise<Category | null> {
    try {
      const category = await invoke<Category | null>('get_category', { id })
      return category
    } catch (error) {
      console.error('Failed to get category:', error)
      throw error
    }
  }

  async updateCategory(id: string, request: CreateCategoryRequest): Promise<Category | null> {
    try {
      const category = await invoke<Category | null>('update_category', { id, request })
      console.log('Category updated successfully:', category)
      return category
    } catch (error) {
      console.error('Failed to update category:', error)
      throw error
    }
  }

  async deleteCategory(id: string): Promise<boolean> {
    try {
      const success = await invoke<boolean>('delete_category', { id })
      console.log('Category deleted successfully:', success)
      return success
    } catch (error) {
      console.error('Failed to delete category:', error)
      throw error
    }
  }

  async getDocumentsByCategory(categoryId: string): Promise<Document[]> {
    try {
      const documents = await invoke<Document[]>('get_documents_by_category', { categoryId })
      return documents
    } catch (error) {
      console.error('Failed to get documents by category:', error)
      throw error
    }
  }

  async getUncategorizedDocuments(): Promise<Document[]> {
    try {
      const documents = await invoke<Document[]>('get_uncategorized_documents')
      return documents
    } catch (error) {
      console.error('Failed to get uncategorized documents:', error)
      throw error
    }
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