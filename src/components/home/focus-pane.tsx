"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, MessageCircle, Lightbulb, Split } from "lucide-react"
import { useStudyStore } from "@/lib/study-store"

export function FocusPane() {
  const [splitView, setSplitView] = useState(false)
  const [selectedText, setSelectedText] = useState("")
  const { setShowInteractionDrawer } = useStudyStore()

  const handleTextSelection = () => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString())
    }
  }

  const handleQuestionShortcut = () => {
    if (selectedText) {
      setShowInteractionDrawer(true)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center space-x-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Attention Is All You Need</span>
        </div>
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="sm" onClick={() => setSplitView(!splitView)}>
            <Split className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className={`flex-1 flex ${splitView ? "divide-x" : ""}`}>
        {/* Main Content */}
        <div className={`${splitView ? "w-1/2" : "w-full"} flex flex-col`}>
          <ScrollArea className="flex-1 p-6">
            <div className="prose prose-neutral dark:prose-invert max-w-none" onMouseUp={handleTextSelection}>
              <h1>Attention Is All You Need</h1>
              <p className="text-muted-foreground">
                Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Lukasz Kaiser,
                Illia Polosukhin
              </p>

              <h2>Abstract</h2>
              <p>
                The dominant sequence transduction models are based on complex recurrent or convolutional neural
                networks that include an encoder and a decoder. The best performing models also connect the encoder and
                decoder through an attention mechanism. We propose a new simple network architecture, the Transformer,
                based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.
              </p>

              <p>
                Experiments on two machine translation tasks show these models to be superior in quality while being
                more parallelizable and requiring significantly less time to train. Our model achieves 28.4 BLEU on the
                WMT 2014 English-to-German translation task, improving over the existing best results, including
                ensembles, by over 2 BLEU.
              </p>

              <h2>1. Introduction</h2>
              <p>
                Recurrent neural networks, long short-term memory and gated recurrent neural networks in particular,
                have been firmly established as state of the art approaches in sequence modeling and transduction
                problems such as language modeling and machine translation. Numerous efforts have since continued to
                push the boundaries of recurrent language models and encoder-decoder architectures.
              </p>

              {/* Info Dots for annotations */}
              <div className="relative">
                <div className="absolute -left-4 top-0 w-2 h-2 bg-blue-500 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer" />
                <p>
                  Attention mechanisms have become an integral part of compelling sequence modeling and transduction
                  models in various tasks, allowing modeling of dependencies without regard to their distance in the
                  input or output sequences.
                </p>
              </div>
            </div>
          </ScrollArea>

          {/* Selection Actions */}
          {selectedText && (
            <div className="p-3 border-t bg-muted/20">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Selected:</span>
                <span className="text-sm font-medium truncate max-w-xs">"{selectedText.substring(0, 50)}..."</span>
                <Button variant="outline" size="sm" onClick={handleQuestionShortcut}>
                  <MessageCircle className="h-3 w-3 mr-1" />
                  Ask (?)
                </Button>
                <Button variant="outline" size="sm">
                  <Lightbulb className="h-3 w-3 mr-1" />
                  Note
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Split View - Notes */}
        {splitView && (
          <div className="w-1/2 flex flex-col">
            <div className="p-3 border-b">
              <h3 className="font-medium">Notes</h3>
            </div>
            <div className="flex-1 p-3">
              <Textarea
                placeholder="Take notes here... (markdown supported)"
                className="h-full resize-none border-0 focus-visible:ring-0"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
