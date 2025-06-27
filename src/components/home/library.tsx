"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Filter, Grid, List, FileText, BookOpen, Code, Headphones, Calendar, Tag } from "lucide-react"
import { useStudyStore } from "@/lib/study-store"

const libraryItems = [
  {
    id: "1",
    title: "Attention Is All You Need",
    type: "paper",
    tags: ["transformer", "attention", "nlp"],
    date: "2024-01-15",
    status: "reading",
  },
  {
    id: "2",
    title: "BERT: Pre-training Transformers",
    type: "paper",
    tags: ["bert", "pretraining", "nlp"],
    date: "2024-01-14",
    status: "completed",
  },
  {
    id: "3",
    title: "Deep Learning Notes",
    type: "note",
    tags: ["deep-learning", "notes"],
    date: "2024-01-13",
    status: "draft",
  },
  {
    id: "4",
    title: "Transformer Implementation",
    type: "code",
    tags: ["pytorch", "transformer", "implementation"],
    date: "2024-01-12",
    status: "completed",
  },
]

const typeIcons = {
  paper: FileText,
  note: BookOpen,
  code: Code,
  audio: Headphones,
}

export function Library() {
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")
  const { setCurrentView, setCurrentDocument } = useStudyStore()

  const filteredItems = libraryItems.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const handleItemClick = (item: any) => {
    setCurrentDocument(item.title)
    setCurrentView("focus")
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Library</h1>
          <div className="flex items-center space-x-2">
            <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}>
              <List className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === "grid" ? "default" : "outline"} size="sm" onClick={() => setViewMode("grid")}>
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search papers, notes, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {viewMode === "list" ? (
            <div className="space-y-2">
              {filteredItems.map((item) => {
                const Icon = typeIcons[item.type as keyof typeof typeIcons]
                return (
                  <div
                    key={item.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                        <div>
                          <h3 className="font-medium">{item.title}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{item.date}</span>
                            <Badge variant="outline" className="text-xs">
                              {item.status}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-1 mt-2">
                            {item.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                <Tag className="h-2 w-2 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const Icon = typeIcons[item.type as keyof typeof typeIcons]
                return (
                  <div
                    key={item.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleItemClick(item)}
                  >
                    <Icon className="h-8 w-8 text-muted-foreground mb-3" />
                    <h3 className="font-medium mb-2">{item.title}</h3>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {item.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {item.tags.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{item.tags.length - 2}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{item.date}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
