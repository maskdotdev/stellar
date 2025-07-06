import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Trash2, AlertTriangle, HardDrive, Database, FileText, Info } from "lucide-react"
import { invoke } from '@tauri-apps/api/core'
import { useToast } from "@/hooks/use-toast"

interface DataUsageInfo {
  dataDirectory: string
  exists: boolean
  totalSize: number
  databaseSize: number
  pdfSize: number
  pdfCount: number
  totalSizeFormatted: string
  databaseSizeFormatted: string
  pdfSizeFormatted: string
}

export function DataCleanupSettings() {
  const [dataUsage, setDataUsage] = useState<DataUsageInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingUsage, setIsLoadingUsage] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadDataUsageInfo()
  }, [])

  const loadDataUsageInfo = async () => {
    try {
      setIsLoadingUsage(true)
      const info = await invoke<DataUsageInfo>('get_data_usage_info')
      setDataUsage(info)
    } catch (error) {
      console.error('Failed to load data usage info:', error)
      toast({
        title: "Error",
        description: "Failed to load data usage information.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingUsage(false)
    }
  }

  const handleCleanupAll = async () => {
    try {
      setIsLoading(true)
      await invoke('cleanup_all_data', { confirmDeletion: true })
      
      // Clear localStorage data
      localStorage.clear()
      
      toast({
        title: "Success",
        description: "All app data has been permanently deleted.",
        variant: "default",
      })
      
      // Refresh data usage info
      await loadDataUsageInfo()
      
    } catch (error) {
      console.error('Failed to cleanup all data:', error)
      toast({
        title: "Error",
        description: "Failed to delete all app data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCleanupDatabaseOnly = async () => {
    try {
      setIsLoading(true)
      await invoke('cleanup_database_only', { confirmDeletion: true })
      
      // Clear localStorage data related to documents and settings
      const keysToKeep = ['stellar-settings', 'stellar-simple-settings', 'ai-store']
      const allKeys = Object.keys(localStorage)
      allKeys.forEach(key => {
        if (!keysToKeep.some(keepKey => key.startsWith(keepKey))) {
          localStorage.removeItem(key)
        }
      })
      
      toast({
        title: "Success",
        description: "Database has been reset. Your PDF files have been preserved.",
        variant: "default",
      })
      
      // Refresh data usage info
      await loadDataUsageInfo()
      
    } catch (error) {
      console.error('Failed to cleanup database:', error)
      toast({
        title: "Error",
        description: "Failed to reset database. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearBrowserData = () => {
    try {
      // Only clear Stellar-specific localStorage keys
      const stellarKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('stellar-') || 
        key.startsWith('ai-store') ||
        key.startsWith('study-store') ||
        key.startsWith('flashcard-store') ||
        key.startsWith('embedding-') ||
        key.startsWith('library-') ||
        key.includes('stellar') ||
        key.includes('Stellar')
      )
      
      stellarKeys.forEach(key => localStorage.removeItem(key))
      
      // Also clear sessionStorage for Stellar
      const stellarSessionKeys = Object.keys(sessionStorage).filter(key => 
        key.startsWith('stellar-') || 
        key.startsWith('ai-store') ||
        key.startsWith('study-store') ||
        key.startsWith('flashcard-store') ||
        key.startsWith('embedding-') ||
        key.startsWith('library-') ||
        key.includes('stellar') ||
        key.includes('Stellar')
      )
      
      stellarSessionKeys.forEach(key => sessionStorage.removeItem(key))
      
      toast({
        title: "Success",
        description: `Cleared ${stellarKeys.length + stellarSessionKeys.length} Stellar-specific browser data items. Please refresh the app.`,
        variant: "default",
      })
    } catch (error) {
      console.error('Failed to clear browser data:', error)
      toast({
        title: "Error",
        description: "Failed to clear browser data. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (isLoadingUsage) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Data Cleanup
          </CardTitle>
          <CardDescription>
            Loading data usage information...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Data Cleanup
        </CardTitle>
        <CardDescription>
          Manage your app data and prepare for uninstallation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Data Usage Information */}
        {dataUsage && dataUsage.exists && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Current Data Usage</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <HardDrive className="h-4 w-4 text-blue-500" />
                <div>
                  <div className="text-sm font-medium">Total Size</div>
                  <div className="text-xs text-muted-foreground">{dataUsage.totalSizeFormatted}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Database className="h-4 w-4 text-green-500" />
                <div>
                  <div className="text-sm font-medium">Database</div>
                  <div className="text-xs text-muted-foreground">{dataUsage.databaseSizeFormatted}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <FileText className="h-4 w-4 text-orange-500" />
                <div>
                  <div className="text-sm font-medium">PDFs</div>
                  <div className="text-xs text-muted-foreground">{dataUsage.pdfSizeFormatted} ({dataUsage.pdfCount} files)</div>
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Data location: {dataUsage.dataDirectory}
            </div>
            <Separator />
          </div>
        )}

        {/* Cleanup Options */}
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-3">Cleanup Options</h4>
            <div className="space-y-3">
              
              {/* Browser Data Only */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Clear Stellar Browser Data</span>
                    <Badge variant="outline" className="text-xs">Safe</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Clears only Stellar-specific settings and cached data from browser storage. Other websites' data remains untouched. Your documents and PDFs will remain intact.
                  </p>
                </div>
                                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearBrowserData}
                    disabled={isLoading}
                  >
                    Clear Stellar Data
                  </Button>
              </div>

              {/* Database Only */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Reset Database</span>
                    <Badge variant="secondary" className="text-xs">Partial</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Deletes all document metadata, settings, and database files. PDF files will be preserved.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLoading || !dataUsage?.exists}
                    >
                      Reset Database
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        Reset Database
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all your document metadata, categories, flashcards, and settings.
                        Your PDF files will be preserved but will need to be re-imported.
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCleanupDatabaseOnly}
                        className="bg-yellow-500 hover:bg-yellow-600"
                      >
                        Reset Database
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Complete Cleanup */}
              <div className="flex items-center justify-between p-4 border rounded-lg border-red-200">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Delete All Data</span>
                    <Badge variant="destructive" className="text-xs">Permanent</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Permanently deletes all app data including documents, PDFs, settings, and processing environments.
                    Use this before uninstalling the app.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isLoading || !dataUsage?.exists}
                    >
                      Delete All Data
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                        Delete All Data
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete ALL app data including:
                        <br />• All documents and PDFs
                        <br />• Database and settings
                        <br />• Python environments
                        <br />• Cached data and processing files
                        <br /><br />
                        This action cannot be undone and is typically used before uninstalling the app.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCleanupAll}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Delete All Data
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>

        {/* Information */}
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Browser Data Cleanup Details
          </h4>
          <p className="text-sm text-muted-foreground mb-2">
            The browser data cleanup only removes Stellar-specific data, including:
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 ml-4 mb-3">
            <li>• Keys starting with: <code className="bg-muted px-1 rounded text-xs">stellar-</code></li>
            <li>• Keys starting with: <code className="bg-muted px-1 rounded text-xs">ai-store</code>, <code className="bg-muted px-1 rounded text-xs">study-store</code>, <code className="bg-muted px-1 rounded text-xs">flashcard-store</code></li>
            <li>• Keys containing: <code className="bg-muted px-1 rounded text-xs">stellar</code> or <code className="bg-muted px-1 rounded text-xs">Stellar</code></li>
          </ul>
          <p className="text-sm text-muted-foreground font-medium">
            ✅ Data from other websites and applications remains untouched.
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Uninstall Instructions
          </h4>
          <p className="text-sm text-muted-foreground mb-2">
            To completely remove Stellar from your system:
          </p>
          <ol className="text-sm text-muted-foreground space-y-1 ml-4">
            <li>1. Use "Delete All Data" button above to clean up all app data</li>
            <li>2. Uninstall the app using your system's normal uninstall process</li>
            <li>3. Optionally, check that the data directory has been removed: <code className="bg-muted px-1 rounded text-xs">{dataUsage?.dataDirectory}</code></li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
} 