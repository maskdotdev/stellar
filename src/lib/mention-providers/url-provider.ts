import { MentionProvider, MentionItem } from "@/components/ui/mention-input"
import { Globe, Link } from "lucide-react"

// You could extend this to search bookmarks, recent URLs, etc.
export function createUrlProvider(): MentionProvider {
  return {
    type: 'url',
    trigger: '#', // Use # for URLs to differentiate from documents
    search: async (query: string): Promise<MentionItem[]> => {
      // Simple URL validation and suggestions
      if (!query.trim()) {
        return [
          {
            id: 'https',
            title: 'https://',
            subtitle: 'HTTPS URL',
            preview: 'Start typing a secure URL',
            icon: Globe,
            data: { type: 'https' }
          },
          {
            id: 'http',
            title: 'http://',
            subtitle: 'HTTP URL',
            preview: 'Start typing a URL',
            icon: Link,
            data: { type: 'http' }
          }
        ]
      }

      const suggestions: MentionItem[] = []

      // If it looks like the start of a URL, suggest completions
      if (query.startsWith('http://') || query.startsWith('https://')) {
        suggestions.push({
          id: query,
          title: query,
          subtitle: 'URL',
          preview: 'Press Enter to add this URL',
          icon: query.startsWith('https://') ? Globe : Link,
          data: { type: 'url', url: query }
        })
      } else {
        // Suggest adding protocol if it looks like a domain
        if (query.includes('.') && !query.includes(' ')) {
          suggestions.push(
            {
              id: `https://${query}`,
              title: `https://${query}`,
              subtitle: 'HTTPS URL',
              preview: 'Secure URL with HTTPS',
              icon: Globe,
              data: { type: 'url', url: `https://${query}` }
            },
            {
              id: `http://${query}`,
              title: `http://${query}`,
              subtitle: 'HTTP URL',
              preview: 'URL with HTTP',
              icon: Link,
              data: { type: 'url', url: `http://${query}` }
            }
          )
        }
      }

      return suggestions
    },
    format: (item: MentionItem): string => {
      return item.title
    }
  }
} 