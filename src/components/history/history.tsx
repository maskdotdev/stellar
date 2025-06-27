"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileText, MessageCircle, HighlighterIcon as Highlight, Code, Search, Calendar, RotateCcw } from "lucide-react"

const historyItems = [
  {
    id: "1",
    timestamp: "2024-01-15 15:30",
    type: "read",
    action: 'Opened "Attention Is All You Need"',
    details: "Spent 45 minutes reading sections 1-3",
  },
  {
    id: "2",
    timestamp: "2024-01-15 15:15",
    type: "highlight",
    action: "Highlighted text in Transformer paper",
    details: '"The attention mechanism allows modeling of dependencies without regard to their distance"',
  },
  {
    id: "3",
    timestamp: "2024-01-15 15:00",
    type: "chat",
    action: "Asked AI about multi-head attention",
    details: "Q: How does multi-head attention work? A: Multi-head attention allows...",
  },
  {
    id: "4",
    timestamp: "2024-01-15 14:45",
    type: "code",
    action: "Added attention implementation",
    details: "Python implementation of scaled dot-product attention",
  },
  {
    id: "5",
    timestamp: "2024-01-15 14:30",
    type: "import",
    action: "Imported new paper",
    details: 'Added "BERT: Pre-training of Deep Bidirectional Transformers"',
  },
]

const typeConfig = {
  read: { icon: FileText, color: "bg-blue-100 text-blue-800", label: "Read" },
  highlight: { icon: Highlight, color: "bg-yellow-100 text-yellow-800", label: "Highlight" },
  chat: { icon: MessageCircle, color: "bg-green-100 text-green-800", label: "Chat" },
  code: { icon: Code, color: "bg-purple-100 text-purple-800", label: "Code" },
  import: { icon: FileText, color: "bg-gray-100 text-gray-800", label: "Import" },
}

export function History() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">History</h1>
          <Button variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Rewind Session
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search history..." className="pl-10" />
        </div>
      </div>

      {/* Timeline */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <div className="space-y-4">
            {historyItems.map((item, index) => {
              const config = typeConfig[item.type as keyof typeof typeConfig]
              const Icon = config.icon

              return (
                <div
                  key={item.id}
                  className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${config.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {index < historyItems.length - 1 && <div className="w-px h-8 bg-border mt-2" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {config.label}
                      </Badge>
                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{item.timestamp}</span>
                      </div>
                    </div>

                    <h3 className="font-medium mb-1">{item.action}</h3>
                    <p className="text-sm text-muted-foreground">{item.details}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
