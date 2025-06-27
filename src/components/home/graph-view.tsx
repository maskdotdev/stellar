"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ZoomIn, ZoomOut, Maximize, Filter } from "lucide-react"

export function GraphView() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    // Simple graph visualization
    const nodes = [
      { id: "transformer", x: 400, y: 200, label: "Transformer", type: "paper" },
      { id: "attention", x: 300, y: 150, label: "Attention Mechanism", type: "concept" },
      { id: "bert", x: 500, y: 150, label: "BERT", type: "paper" },
      { id: "gpt", x: 450, y: 300, label: "GPT", type: "paper" },
      { id: "self-attention", x: 200, y: 100, label: "Self-Attention", type: "concept" },
    ]

    const edges = [
      { from: "transformer", to: "attention" },
      { from: "transformer", to: "bert" },
      { from: "transformer", to: "gpt" },
      { from: "attention", to: "self-attention" },
    ]

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw edges
    ctx.strokeStyle = "#666"
    ctx.lineWidth = 1
    edges.forEach((edge) => {
      const fromNode = nodes.find((n) => n.id === edge.from)
      const toNode = nodes.find((n) => n.id === edge.to)
      if (fromNode && toNode) {
        ctx.beginPath()
        ctx.moveTo(fromNode.x, fromNode.y)
        ctx.lineTo(toNode.x, toNode.y)
        ctx.stroke()
      }
    })

    // Draw nodes
    nodes.forEach((node) => {
      // Node circle
      ctx.fillStyle = node.type === "paper" ? "#3b82f6" : "#10b981"
      ctx.beginPath()
      ctx.arc(node.x, node.y, 20, 0, 2 * Math.PI)
      ctx.fill()

      // Node label
      ctx.fillStyle = "#000"
      ctx.font = "12px Inter"
      ctx.textAlign = "center"
      ctx.fillText(node.label, node.x, node.y + 35)
    })
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <Input placeholder="Search graph..." className="w-64" />
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-1">
          <Button variant="outline" size="sm">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Graph Canvas */}
      <div className="flex-1 relative">
        <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm border rounded-lg p-3">
          <div className="text-sm font-medium mb-2">Legend</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span>Papers</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span>Concepts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
