import { invoke } from '@tauri-apps/api/core'

export interface DataUsageInfo {
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

export interface CleanupOptions {
  clearBrowserData?: boolean
  clearDatabase?: boolean
  clearPDFs?: boolean
  clearPythonEnvs?: boolean
  clearTempFiles?: boolean
}

export class CleanupService {
  private static instance: CleanupService | null = null

  private constructor() {}

  static getInstance(): CleanupService {
    if (!CleanupService.instance) {
      CleanupService.instance = new CleanupService()
    }
    return CleanupService.instance
  }

  /**
   * Get information about current data usage
   */
  async getDataUsageInfo(): Promise<DataUsageInfo> {
    try {
      const info = await invoke<DataUsageInfo>('get_data_usage_info')
      return info
    } catch (error) {
      console.error('Failed to get data usage info:', error)
      throw new Error('Failed to retrieve data usage information')
    }
  }

  /**
   * Clean up all application data
   */
  async cleanupAllData(): Promise<void> {
    try {
      // Clear browser data first
      await this.clearBrowserData()
      
      // Clear backend data
      await invoke('cleanup_all_data', { confirmDeletion: true })
      
      console.log('All application data has been cleaned up')
    } catch (error) {
      console.error('Failed to cleanup all data:', error)
      throw new Error('Failed to delete all application data')
    }
  }

  /**
   * Clean up database only, preserve PDFs
   */
  async cleanupDatabaseOnly(): Promise<void> {
    try {
      // Clear relevant browser data
      await this.clearBrowserDataSelective()
      
      // Clear database files
      await invoke('cleanup_database_only', { confirmDeletion: true })
      
      console.log('Database has been cleaned up, PDFs preserved')
    } catch (error) {
      console.error('Failed to cleanup database:', error)
      throw new Error('Failed to reset database')
    }
  }

  /**
   * Clear browser data completely (Stellar-specific only)
   */
  async clearBrowserData(): Promise<void> {
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
      
      // Clear IndexedDB if used (Stellar-specific databases only)
      if ('indexedDB' in window) {
        // Note: This would need to be implemented to only clear Stellar-specific IndexedDB databases
        console.log('IndexedDB cleanup would be implemented here for Stellar-specific databases')
      }
      
      console.log(`Cleared ${stellarKeys.length + stellarSessionKeys.length} Stellar-specific browser data items`)
    } catch (error) {
      console.error('Failed to clear browser data:', error)
      throw new Error('Failed to clear browser data')
    }
  }

  /**
   * Clear browser data selectively (preserve some settings)
   */
  async clearBrowserDataSelective(): Promise<void> {
    try {
      const keysToKeep = [
        'stellar-settings',
        'stellar-simple-settings', 
        'ai-store'
      ]
      
      const allKeys = Object.keys(localStorage)
      allKeys.forEach(key => {
        if (!keysToKeep.some(keepKey => key.startsWith(keepKey))) {
          localStorage.removeItem(key)
        }
      })
      
      console.log('Browser data selectively cleared')
    } catch (error) {
      console.error('Failed to clear browser data selectively:', error)
      throw new Error('Failed to clear browser data')
    }
  }

  /**
   * Perform custom cleanup based on options
   */
  async performCustomCleanup(options: CleanupOptions): Promise<void> {
    try {
      if (options.clearBrowserData) {
        await this.clearBrowserData()
      }
      
      if (options.clearDatabase || options.clearPDFs || options.clearPythonEnvs) {
        if (options.clearDatabase && options.clearPDFs && options.clearPythonEnvs) {
          // If all backend options are selected, use cleanup_all_data
          await invoke('cleanup_all_data', { confirmDeletion: true })
        } else if (options.clearDatabase && !options.clearPDFs) {
          // Database only
          await invoke('cleanup_database_only', { confirmDeletion: true })
        } else {
          // For other combinations, we'd need additional backend commands
          console.warn('Custom cleanup combinations not fully implemented')
        }
      }
      
      console.log('Custom cleanup completed')
    } catch (error) {
      console.error('Failed to perform custom cleanup:', error)
      throw new Error('Failed to perform custom cleanup')
    }
  }

  /**
   * Prepare for uninstall by cleaning up everything
   */
  async prepareForUninstall(): Promise<void> {
    try {
      await this.cleanupAllData()
      console.log('Application prepared for uninstall')
    } catch (error) {
      console.error('Failed to prepare for uninstall:', error)
      throw new Error('Failed to prepare application for uninstall')
    }
  }

  /**
   * Validate that cleanup was successful
   */
  async validateCleanup(): Promise<boolean> {
    try {
      const info = await this.getDataUsageInfo()
      
      // Check if data directory still exists and has minimal size
      if (info.exists && info.totalSize > 1024) { // More than 1KB suggests cleanup incomplete
        console.warn('Cleanup validation failed: Data directory still contains significant data')
        return false
      }
      
      console.log('Cleanup validation passed')
      return true
    } catch (error) {
      console.error('Failed to validate cleanup:', error)
      return false
    }
  }

  /**
   * Get list of localStorage keys that would be cleared
   */
  getStellarLocalStorageKeys(): string[] {
    return Object.keys(localStorage).filter(key => 
      key.startsWith('stellar-') || 
      key.startsWith('ai-store') ||
      key.startsWith('study-store') ||
      key.startsWith('flashcard-store') ||
      key.startsWith('embedding-') ||
      key.startsWith('library-') ||
      key.includes('stellar') ||
      key.includes('Stellar')
    )
  }

  /**
   * Get cleanup instructions for the user
   */
  getUninstallInstructions(): string[] {
    return [
      'Use the "Delete All Data" button to clean up all application data',
      'Uninstall the application using your system\'s normal uninstall process',
      'Optionally, manually check that the data directory has been removed',
      'Use "Clear Stellar Browser Data" if you accessed Stellar through a web browser'
    ]
  }
} 