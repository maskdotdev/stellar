import { FileText, BookOpen, Code, Headphones } from "lucide-react"

export const typeIcons = {
  pdf: FileText,
  paper: FileText,
  note: BookOpen,
  code: Code,
  audio: Headphones,
  markdown: BookOpen,
}

export const suggestedCategories = [
  { name: "Computer Science", icon: "code", color: "#3b82f6", description: "Programming, algorithms, software engineering" },
  { name: "Mathematics", icon: "calculator", color: "#ef4444", description: "Calculus, algebra, statistics, discrete math" },
  { name: "Physics", icon: "beaker", color: "#8b5cf6", description: "Classical mechanics, quantum physics, thermodynamics" },
  { name: "Literature", icon: "book-marked", color: "#f59e0b", description: "Novels, poetry, literary analysis" },
  { name: "History", icon: "globe", color: "#10b981", description: "World history, historical analysis" },
  { name: "Art & Design", icon: "palette", color: "#ec4899", description: "Visual arts, design principles, art history" },
] 