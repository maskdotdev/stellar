"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BarChart3, Database } from "lucide-react"
import { useAIStore } from "@/lib/ai-store"
import { getCapabilityIcon } from "./utils"

export function Statistics() {
  const {
    getCatalogStatistics,
    buildFullCatalog,
    catalogState,
    isLoading
  } = useAIStore()

  const [catalogStats, setCatalogStats] = useState<any>(null)

  useEffect(() => {
    loadCatalogStats()
  }, [])

  const loadCatalogStats = async () => {
    try {
      const stats = await getCatalogStatistics()
      setCatalogStats(stats)
    } catch (error) {
      console.error("Failed to load catalog stats:", error)
    }
  }

  const handleBuildCatalog = async () => {
    try {
      await buildFullCatalog(false)
      await loadCatalogStats()
    } catch (error) {
      console.error("Failed to build catalog:", error)
    }
  }

  if (!catalogStats) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="text-muted-foreground">
            No catalog statistics available. Build the catalog first to see statistics.
          </div>
          <Button 
            className="mt-4"
            onClick={handleBuildCatalog}
            disabled={isLoading || catalogState.isBuilding}
          >
            <Database className="h-4 w-4 mr-2" />
            Build Catalog
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Catalog Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{catalogStats.totalProviders || 0}</div>
              <div className="text-sm text-muted-foreground">Total Providers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{catalogStats.totalModels || 0}</div>
              <div className="text-sm text-muted-foreground">Total Models</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {catalogStats.avgContextWindow ? catalogStats.avgContextWindow.toLocaleString() : '0'}
              </div>
              <div className="text-sm text-muted-foreground">Avg Context Window</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                ${catalogStats.avgCost ? catalogStats.avgCost.toFixed(4) : '0.0000'}
              </div>
              <div className="text-sm text-muted-foreground">Avg Cost per 1K</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Capabilities Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {catalogStats.capabilityBreakdown ? Object.entries(catalogStats.capabilityBreakdown).map(([capability, count]) => (
                <div key={capability} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {getCapabilityIcon(capability)}
                    <span className="capitalize">{capability}</span>
                  </div>
                  <Badge variant="secondary">{count as number}</Badge>
                </div>
              )) : (
                <div className="text-sm text-muted-foreground">No capability data available</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cost Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {catalogStats.costBreakdown ? (
                <>
                  <div className="flex justify-between items-center">
                    <span>💰 Free Models</span>
                    <Badge variant="secondary">{catalogStats.costBreakdown.free || 0}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>💵 Cheap (&lt; $0.001)</span>
                    <Badge variant="secondary">{catalogStats.costBreakdown.cheap || 0}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>💴 Moderate ($0.001-$0.01)</span>
                    <Badge variant="secondary">{catalogStats.costBreakdown.moderate || 0}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>💸 Expensive (&gt; $0.01)</span>
                    <Badge variant="secondary">{catalogStats.costBreakdown.expensive || 0}</Badge>
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">No cost data available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 