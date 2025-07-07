import React from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft, 
  ChevronRight, 
  RotateCw, 
  RotateCcw, 
  Download, 
  Search, 
  Maximize, 
  Printer,
  MoreHorizontal,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils/utils';
import type { PdfToolbarProps, ToolbarProps, ToolbarSlot } from './types';

export function PdfToolbar({ className }: PdfToolbarProps) {
  const renderToolbar = (Toolbar: (props: ToolbarProps) => React.ReactElement) => (
    <Toolbar>
      {(slots: ToolbarSlot) => {
        const {
          ZoomIn: ZoomInButton,
          ZoomOut: ZoomOutButton,
          Zoom,
          PreviousPage,
          NextPage,
          CurrentPageInput,
          NumberOfPages,
          GoToFirstPage,
          GoToLastPage,
          RotateClockwise,
          RotateCounterclockwise,
          FullScreen,
          Download: DownloadButton,
          Print,
          Search: SearchButton,
          MoreActions,
        } = slots;

        return (
          <div
            className={cn(
              "flex items-center gap-2 px-4 py-2 bg-card border-b border-border",
              "text-card-foreground shadow-sm",
              className
            )}
            style={{
              fontFamily: 'var(--font-sans)',
            }}
          >
            {/* Navigation Controls */}
            <div className="flex items-center gap-1">
              <GoToFirstPage>
                {(props) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    disabled={props.disabled}
                    className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                )}
              </GoToFirstPage>
              
              <PreviousPage>
                {(props) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    disabled={props.disabled}
                    className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
              </PreviousPage>
              
              <NextPage>
                {(props) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    disabled={props.disabled}
                    className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </NextPage>
              
              <GoToLastPage>
                {(props) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    disabled={props.disabled}
                    className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                )}
              </GoToLastPage>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Page Info */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Page</span>
              <CurrentPageInput>
                {(props) => (
                  <Input
                    className="h-8 w-12 text-center text-sm"
                    onChange={props.onChange}
                    value={props.value}
                  />
                )}
              </CurrentPageInput>
              <span>of</span>
              <NumberOfPages>
                {(props) => (
                  <Badge variant="secondary" className="h-6 text-xs">
                    {props.numberOfPages}
                  </Badge>
                )}
              </NumberOfPages>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <ZoomOutButton>
                {(props) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    disabled={props.disabled}
                    className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                )}
              </ZoomOutButton>
              
              <Zoom>
                {(props) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    className="h-8 px-2 text-sm hover:bg-accent hover:text-accent-foreground min-w-[60px]"
                  >
                    {Math.round((props.scale || 1) * 100)}%
                  </Button>
                )}
              </Zoom>
              
              <ZoomInButton>
                {(props) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    disabled={props.disabled}
                    className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                )}
              </ZoomInButton>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Document Actions */}
            <div className="flex items-center gap-1">
              <RotateCounterclockwise>
                {(props) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </RotateCounterclockwise>
              
              <RotateClockwise>
                {(props) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                )}
              </RotateClockwise>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Utility Actions */}
            <div className="flex items-center gap-1">
              <SearchButton>
                {(props) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                )}
              </SearchButton>
              
              <FullScreen>
                {(props) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                )}
              </FullScreen>
              
              <DownloadButton>
                {(props) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </DownloadButton>
              
              <Print>
                {(props) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={props.onClick}
                    className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                )}
              </Print>
            </div>

            {/* More Actions Menu */}
            <MoreActions>
              {(props) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={props.onToggleTheme}>
                      Switch Theme
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={props.onHandModeToggle}>
                      Hand Mode
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={props.onScrollModeToggle}>
                      Scroll Mode
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </MoreActions>
          </div>
        );
      }}
    </Toolbar>
  );

  return renderToolbar;
} 