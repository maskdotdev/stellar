"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, Pin, Share, Download, Tag } from "lucide-react"
import { useStudyStore } from "@/lib/study-store"

export function ContextBar() {
  const { currentDocument, currentTags } = useStudyStore()

  return (
    <div className="h-12 px-4 flex items-center justify-between bg-muted/20 border-b">
      {/* Breadcrumbs */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <span>Library</span>
        <ChevronRight className="h-3 w-3" />
        <span>Machine Learning</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">{currentDocument || "Attention Is All You Need"}</span>
      </div>

      {/* Tags and Actions */}
      <div className="flex items-center space-x-2">
        {/* Current Tags */}
        <div className="flex items-center space-x-1">
          {currentTags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              <Tag className="h-3 w-3 mr-1" />
              {tag}
            </Badge>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="sm">
            <Pin className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Share className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
