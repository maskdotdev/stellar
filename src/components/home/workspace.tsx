"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Clock, Plus, FileText, Code, ImageIcon, Mic } from "lucide-react"

export function Workspace() {
  const [currentNote, setCurrentNote] = useState(`# Research Session - January 15, 2024

## Today's Focus: Transformer Architecture

### Key Insights
- Self-attention mechanism eliminates need for recurrence
- Parallelization leads to faster training
- Position encoding crucial for sequence understanding

### Questions to Explore
- [ ] How does multi-head attention improve performance?
- [ ] What are the computational trade-offs?
- [ ] Applications beyond NLP?

### Code Snippets
\`\`\`python
def scaled_dot_product_attention(Q, K, V, mask=None):
    d_k = Q.size(-1)
    scores = torch.matmul(Q, K.transpose(-2, -1)) / math.sqrt(d_k)
    if mask is not None:
        scores = scores.masked_fill(mask == 0, -1e9)
    attention_weights = F.softmax(scores, dim=-1)
    return torch.matmul(attention_weights, V)
\`\`\`

### References
- [Attention Is All You Need](link)
- [BERT Paper](link)
`)

  const timelineItems = [
    { time: "14:30", type: "note", title: "Started reading Transformer paper" },
    { time: "14:45", type: "highlight", title: "Highlighted attention mechanism section" },
    { time: "15:00", type: "question", title: "Asked AI about multi-head attention" },
    { time: "15:15", type: "code", title: "Added attention implementation" },
    { time: "15:30", type: "summary", title: "Session summary generated" },
  ]

  const typeIcons = {
    note: FileText,
    highlight: FileText,
    question: FileText,
    code: Code,
    summary: FileText,
  }

  return (
    <div className="h-full flex">
      {/* Timeline Sidebar */}
      <div className="w-80 border-r bg-muted/20">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Session Timeline</h2>
          <p className="text-sm text-muted-foreground">January 15, 2024</p>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {timelineItems.map((item, index) => {
              const Icon = typeIcons[item.type as keyof typeof typeIcons]
              return (
                <div key={index} className="flex items-start space-x-3 p-2 rounded hover:bg-muted/50 cursor-pointer">
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground min-w-0">
                    <Clock className="h-3 w-3" />
                    <span>{item.time}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <Icon className="h-3 w-3" />
                      <span className="text-sm truncate">{item.title}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <Button className="w-full" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Entry
          </Button>
        </div>
      </div>

      {/* Canvas/Editor */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Research Canvas</h1>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">Auto-save enabled</Badge>
              <Button variant="outline" size="sm">
                <ImageIcon className="h-4 w-4 mr-2" />
                Insert
              </Button>
              <Button variant="outline" size="sm">
                <Code className="h-4 w-4 mr-2" />
                Code
              </Button>
              <Button variant="outline" size="sm">
                <Mic className="h-4 w-4 mr-2" />
                Audio
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4">
          <Textarea
            value={currentNote}
            onChange={(e) => setCurrentNote(e.target.value)}
            className="h-full resize-none border-0 focus-visible:ring-0 font-mono text-sm"
            placeholder="Start writing your research notes... (Markdown supported)"
          />
        </div>
      </div>
    </div>
  )
}
