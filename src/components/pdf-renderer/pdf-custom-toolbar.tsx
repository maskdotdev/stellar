import React from 'react';
import { 
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Search,
  Maximize,
  ZoomIn,
  ZoomOut,
  RotateCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils/utils';
import type { ToolbarSlot } from '@react-pdf-viewer/toolbar';
import { RotateDirection } from '@react-pdf-viewer/core';

/**
 * Simple PDF Toolbar with Navigation, Zoom, and Actions
 */
export function CustomPdfToolbar() {
  return (slots: ToolbarSlot) => (
    <div className="flex items-center gap-2 px-4 py-2 bg-card text-card-foreground border-b border-border">
      {/* Navigation Controls */}
      <div className="flex items-center gap-1">
        <slots.GoToFirstPage>
          {(props) => (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    disabled={props.isDisabled}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>First page</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </slots.GoToFirstPage>
        
        <slots.GoToPreviousPage>
          {(props) => (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    disabled={props.isDisabled}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Previous page</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </slots.GoToPreviousPage>
        
        <slots.GoToNextPage>
          {(props) => (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    disabled={props.isDisabled}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Next page</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </slots.GoToNextPage>
        
        <slots.GoToLastPage>
          {(props) => (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    disabled={props.isDisabled}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Last page</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </slots.GoToLastPage>
      </div>
      
      <Separator orientation="vertical" className="h-6" />
      
      {/* Page Info */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Page</span>
        <slots.CurrentPageInput>
          {(props) => (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Input
                    type="number"
                    min={1}
                    max={props.numberOfPages || 1}
                    value={props.currentPage || 1}
                    onChange={(e) => {
                      const page = parseInt(e.target.value);
                      if (page >= 1 && page <= (props.numberOfPages || 1)) {
                        props.onChange?.(page - 1);
                      }
                    }}
                    className="h-8 w-16 text-center text-sm"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Enter page number (1-{props.numberOfPages || 1})</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </slots.CurrentPageInput>
        <span>of</span>
        <slots.NumberOfPages />
      </div>
      
      <Separator orientation="vertical" className="h-6" />
      
      {/* Zoom Controls */}
      <div className="flex items-center gap-1">
        <slots.ZoomOut>
          {(props) => (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    className="h-8 w-8 p-0"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Zoom out</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </slots.ZoomOut>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="min-w-16 text-center text-sm font-medium">
                <slots.CurrentScale />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Current zoom level</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <slots.ZoomIn>
          {(props) => (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    className="h-8 w-8 p-0"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Zoom in</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </slots.ZoomIn>
      </div>
      
      <Separator orientation="vertical" className="h-6" />
      
      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        <slots.ShowSearchPopover>
          {(props) => (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    className="h-8 w-8 p-0"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Search document</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </slots.ShowSearchPopover>
        
        <slots.Rotate direction={RotateDirection.Forward}>
          {(props) => (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    className="h-8 w-8 p-0"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Rotate document</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </slots.Rotate>
        
        <slots.Download>
          {(props) => (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    className="h-8 w-8 p-0"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Download PDF</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </slots.Download>
        
        <slots.EnterFullScreen>
          {(props) => (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    className="h-8 w-8 p-0"
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Enter fullscreen</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </slots.EnterFullScreen>
      </div>
    </div>
  );
}
