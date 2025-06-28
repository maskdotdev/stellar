import { MentionProvider, MentionItem } from "@/components/ui/mention-input"
import { useStudyStore } from "@/lib/study-store"
import { useSettingsStore } from "@/lib/settings-store"
import { LibraryService } from "@/lib/library-service"
import { FileText, BookOpen, Code, Headphones } from "lucide-react"

const typeIcons = {
  pdf: FileText,
  paper: FileText,
  note: BookOpen,
  code: Code,
  audio: Headphones,
  markdown: BookOpen,
}

export function createDocumentProvider(): MentionProvider {
  return {
    type: 'document',
    trigger: '@',
    search: async (query: string): Promise<MentionItem[]> => {
      console.log("📚 DocumentProvider: Search called")
      console.log("  🔍 Query:", JSON.stringify(query))
      
      const { documents } = useStudyStore.getState()
      const { app } = useSettingsStore.getState()
      const libraryService = LibraryService.getInstance()
      const limit = app.documentMentionLimit
      
      console.log("  📄 Available documents:", documents.length)
      console.log("  📄 Document titles:", documents.map(doc => doc.title))
      console.log("  🔢 Limit:", limit)
      
      if (!query.trim()) {
        console.log("  ⚪ Empty query, returning first", limit, "documents")
        const results = documents.slice(0, limit).map(doc => ({
          id: doc.id,
          title: doc.title,
          subtitle: doc.doc_type ? doc.doc_type.toUpperCase() : 'DOCUMENT',
          preview: libraryService.getContentPreview(doc.content, 80),
          tags: doc.tags,
          icon: typeIcons[doc.doc_type as keyof typeof typeIcons] || FileText,
          data: doc
        }))
        console.log("  ✅ Returning", results.length, "empty query results:", results.map(r => r.title))
        return results
      }
      
      console.log("  🔍 Filtering documents by query:", query)
      const filtered = documents.filter(doc => {
        const titleMatch = doc.title.toLowerCase().includes(query.toLowerCase())
        const tagMatch = doc.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
        const matches = titleMatch || tagMatch
        
        if (matches) {
          console.log(`    ✅ "${doc.title}" matches (title: ${titleMatch}, tags: ${tagMatch})`)
        }
        
        return matches
      })
      
      console.log("  📊 Filtered results:", filtered.length, "documents")
      
      const results = filtered
        .slice(0, limit)
        .map(doc => ({
          id: doc.id,
          title: doc.title,
          subtitle: doc.doc_type ? doc.doc_type.toUpperCase() : 'DOCUMENT',
          preview: libraryService.getContentPreview(doc.content, 80),
          tags: doc.tags,
          icon: typeIcons[doc.doc_type as keyof typeof typeIcons] || FileText,
          data: doc
        }))
      
      console.log("  ✅ Final document results:", results.length, results.map(r => r.title))
      return results
    },
    format: (item: MentionItem): string => {
      return item.title
    }
  }
} 