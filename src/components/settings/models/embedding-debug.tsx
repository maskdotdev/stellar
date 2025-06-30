"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  Database, 
  Search, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw,
  Bug,
  Info
} from "lucide-react"
import { EmbeddingService } from "@/lib/embedding-service"
import { useToast } from "@/hooks/use-toast"

interface EmbeddedDocument {
  document_id: string
  chunk_count: number
  first_embedded: string
  status: string
}

interface DatabaseInfo {
  db_path: string
  absolute_path: string
  exists: boolean
  env_var_set: boolean
}

export function EmbeddingDebug() {
  const [embeddingService] = useState(() => EmbeddingService.getInstance())
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [embeddedDocuments, setEmbeddedDocuments] = useState<EmbeddedDocument[]>([])
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseInfo | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null)
  const [documentDetails, setDocumentDetails] = useState<any>(null)

  const loadDebugInfo = async () => {
    setLoading(true)
    try {
      const [debug, documents, dbInfo] = await Promise.all([
        embeddingService.debug(),
        embeddingService.listEmbeddedDocuments(),
        embeddingService.getDatabaseInfo()
      ])
      
      setDebugInfo(debug)
      setEmbeddedDocuments(documents)
      setDatabaseInfo(dbInfo)
      
      console.log("Debug info:", debug)
      console.log("Embedded documents:", documents)
      console.log("Database info:", dbInfo)
      
    } catch (error) {
      console.error("Failed to load debug info:", error)
      toast({
        title: "Debug Error",
        description: "Failed to load embedding debug information",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadDocumentDetails = async (documentId: string) => {
    try {
      const details = await embeddingService.getDocumentEmbeddingInfo(documentId)
      setDocumentDetails(details)
      setSelectedDocument(documentId)
    } catch (error) {
      console.error("Failed to load document details:", error)
      toast({
        title: "Error",
        description: "Failed to load document details",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    loadDebugInfo()
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'initialized':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'not_initialized':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bug className="w-5 h-5" />
          <h3 className="text-lg font-medium">Embedding Service Debug</h3>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadDebugInfo} 
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="w-4 h-4" />
            <span>Service Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {debugInfo ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                {getStatusIcon(debugInfo.status)}
                <span className="font-medium">Status: {debugInfo.status}</span>
              </div>
              
              {debugInfo.stats && (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{debugInfo.stats.total_documents}</div>
                    <div className="text-sm text-muted-foreground">Documents</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-2xl font-bold">{debugInfo.stats.total_chunks}</div>
                    <div className="text-sm text-muted-foreground">Chunks</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-sm font-medium">{debugInfo.stats.provider}</div>
                    <div className="text-sm text-muted-foreground">Provider</div>
                  </div>
                </div>
              )}

              {debugInfo.message && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">{debugInfo.message}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground">Loading debug information...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Database Configuration */}
      {databaseInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Info className="w-4 h-4" />
              <span>Database Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Database Path:</label>
                <p className="text-sm text-muted-foreground font-mono">{databaseInfo.db_path}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Absolute Path:</label>
                <p className="text-sm text-muted-foreground font-mono break-all">{databaseInfo.absolute_path}</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {databaseInfo.exists ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="text-sm">File {databaseInfo.exists ? 'exists' : 'missing'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {databaseInfo.env_var_set ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                  )}
                  <span className="text-sm">Environment variable {databaseInfo.env_var_set ? 'set' : 'using default'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Embedded Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>Embedded Documents ({embeddedDocuments.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {embeddedDocuments.length > 0 ? (
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {embeddedDocuments.map((doc) => (
                  <div 
                    key={doc.document_id}
                    className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted"
                    onClick={() => loadDocumentDetails(doc.document_id)}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{doc.document_id}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.chunk_count} chunks • {new Date(doc.first_embedded).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="secondary">{doc.status}</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8">
              <Search className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No embedded documents found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Upload a PDF to see embedding information
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Details */}
      {selectedDocument && documentDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Document: {selectedDocument}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Total Chunks: {documentDetails.total_chunks}</p>
              </div>
              <Separator />
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {documentDetails.chunks.map((chunk: any) => (
                    <div key={chunk.chunk_id} className="flex items-center justify-between text-sm">
                      <span>Chunk {chunk.chunk_index}</span>
                      <span className="text-muted-foreground">{chunk.text_length} chars</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 