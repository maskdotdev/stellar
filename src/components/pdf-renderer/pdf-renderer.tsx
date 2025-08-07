import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils/utils';
import { ScrollMode, Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { rotatePlugin } from '@react-pdf-viewer/rotate';
import { searchPlugin } from '@react-pdf-viewer/search';
import { toolbarPlugin } from '@react-pdf-viewer/toolbar';
import { zoomPlugin } from '@react-pdf-viewer/zoom';
import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { PDF_TOOLBAR_EXAMPLES } from './pdf-toolbar-examples';

import type { PdfRendererProps } from './types';

// Import CSS for React PDF Viewer
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import './pdf-renderer.css';

import { useThemeIntegration } from './theme-utils';

export function PdfRenderer({
  fileUrl,
  title,
  className,
  onError,
  onDocumentLoadSuccess
}: PdfRendererProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { theme: currentTheme, createStyle, getClasses, isDark } = useThemeIntegration();

  // Initialize plugins
  const searchPluginInstance = searchPlugin();
  const rotatePluginInstance = rotatePlugin();
  const zoomPluginInstance = zoomPlugin();

  // Create toolbar plugin instance
  const toolbarPluginInstance = toolbarPlugin();
  const { Toolbar } = toolbarPluginInstance;

  // Initialize default layout plugin without custom toolbar
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    // Customize the sidebar
    sidebarTabs: (defaultTabs) => [
      defaultTabs[0], // Thumbnails
      defaultTabs[1], // Bookmarks
      defaultTabs[2], // Attachments
    ],
  });

  // Dynamic theme-aware CSS variables using theme integration
  const themeVariables = useMemo(() => {
    return createStyle({
      '--rpv-color-primary': 'hsl(var(--primary))',
      '--rpv-color-primary-foreground': 'hsl(var(--primary-foreground))',
      '--rpv-color-secondary': 'hsl(var(--secondary))',
      '--rpv-color-secondary-foreground': 'hsl(var(--secondary-foreground))',
      '--rpv-color-muted': 'hsl(var(--muted))',
      '--rpv-color-muted-foreground': 'hsl(var(--muted-foreground))',
      '--rpv-color-accent': 'hsl(var(--accent))',
      '--rpv-color-accent-foreground': 'hsl(var(--accent-foreground))',
      '--rpv-color-background': 'hsl(var(--background))',
      '--rpv-color-foreground': 'hsl(var(--foreground))',
      '--rpv-color-card': 'hsl(var(--card))',
      '--rpv-color-card-foreground': 'hsl(var(--card-foreground))',
      '--rpv-color-border': 'hsl(var(--border))',
      '--rpv-color-input': 'hsl(var(--input))',
      '--rpv-color-ring': 'hsl(var(--ring))',
      '--rpv-color-destructive': 'hsl(var(--destructive))',
      '--rpv-color-destructive-foreground': 'hsl(var(--destructive-foreground))',
      '--rpv-border-radius': 'var(--radius)',
      '--rpv-font-family': 'var(--font-sans)',
      '--rpv-font-mono': 'var(--font-mono)',
      '--rpv-font-serif': 'var(--font-serif)',
      '--rpv-shadow-sm': 'var(--shadow-sm)',
      '--rpv-shadow-md': 'var(--shadow-md)',
      '--rpv-shadow-lg': 'var(--shadow-lg)',
      '--rpv-shadow-xl': 'var(--shadow-xl)',
      // Add sidebar-specific variables for themes that support them
      ...(currentTheme !== 'default' && {
        '--rpv-sidebar-background': 'hsl(var(--sidebar))',
        '--rpv-sidebar-foreground': 'hsl(var(--sidebar-foreground))',
        '--rpv-sidebar-primary': 'hsl(var(--sidebar-primary))',
        '--rpv-sidebar-primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
        '--rpv-sidebar-accent': 'hsl(var(--sidebar-accent))',
        '--rpv-sidebar-accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
        '--rpv-sidebar-border': 'hsl(var(--sidebar-border))',
        '--rpv-sidebar-ring': 'hsl(var(--sidebar-ring))',
      }),
    });
  }, [currentTheme, createStyle]);

  type DocumentLoadEvent = { doc: { numPages: number } }
  const handleDocumentLoadSuccess = useCallback(
    (e: DocumentLoadEvent) => {
      try {
        const pages = e.doc.numPages;
        setNumPages(pages);
        setIsLoading(false);
        onDocumentLoadSuccess?.(pages);

        toast({
          title: "PDF Loaded",
          description: `Successfully loaded ${pages} pages`,
        });
      } catch (error) {
        setIsLoading(false);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load PDF';
        onError?.(new Error(errorMessage));

        toast({
          title: "Error Loading PDF",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    [onDocumentLoadSuccess, onError, toast]
  );

  // Get theme-specific class names using theme integration
  const themeClasses = useMemo(() => {
    const baseClasses = [
      "flex flex-col h-full bg-background text-foreground",
      "border border-border rounded-lg overflow-hidden"
    ];

    return getClasses(baseClasses);
  }, [getClasses]);

  return (
    <div className={cn(...themeClasses, className, "h-full")}>
      {/* Enhanced Header with theme-aware styling */}
      {title && (
        <div className={cn(
          "flex items-center justify-between px-4 py-3",
          "bg-card/80 backdrop-blur-sm border-b border-border/50",
          "transition-all duration-200"
        )}>
          <h3 className="text-lg font-semibold text-card-foreground truncate">
            {title}
          </h3>
          {numPages > 0 && (
            <div className={cn(
              "text-sm text-muted-foreground px-2 py-1 rounded-md",
              "bg-secondary/50 border border-border/30",
              "transition-all duration-200"
            )}>
              {numPages} page{numPages !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {/* Custom PDF Toolbar with Icons and Tooltips */}
      <div className="border-b border-border">
        <Toolbar>
          {PDF_TOOLBAR_EXAMPLES.customInput()}
        </Toolbar>
      </div>

      {/* PDF Viewer with enhanced theming */}
      <div className="relative h-[calc(100vh-100px)]" >
        {isLoading && (
          <div className={cn(
            "absolute inset-0 flex items-center justify-center",
            "bg-background/90 backdrop-blur-md z-10",
            "transition-all duration-300"
          )}>
            <div className="flex items-center space-x-3">
              <div className={cn(
                "animate-spin rounded-full h-8 w-8 border-2 border-muted",
                "border-t-primary transition-colors duration-200"
              )} />
              <span className="text-sm text-muted-foreground font-medium">
                Loading PDF...
              </span>
            </div>
          </div>
        )}

        <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js" />
        <div
          className={cn(
            "h-full pdf-viewer-container",
            `pdf-theme-${currentTheme}`,
            // Add theme-specific modifier classes
            {
              'pdf-cosmic-glow': ['space', 'starfield', 'aurora'].includes(currentTheme),
              'pdf-minimal-style': ['pluto', 'dark-pluto'].includes(currentTheme),
              'pdf-stellar-glow': ['stellar', 'light-teal'].includes(currentTheme),
            }
          )}
          style={themeVariables as React.CSSProperties}
        >
          <Viewer
            fileUrl={fileUrl}
            plugins={[
              defaultLayoutPluginInstance,
              searchPluginInstance,
              rotatePluginInstance,
              zoomPluginInstance,
              toolbarPluginInstance,
            ]}
            onDocumentLoad={handleDocumentLoadSuccess}
            theme={isDark ? 'dark' : 'light'}
            defaultScale={1.0}
            scrollMode={ScrollMode.Vertical}
            renderError={(error) => (
              <div className={cn(
                "flex items-center justify-center h-full",
                "bg-destructive/10 border border-destructive/20 rounded-lg m-4",
                "text-destructive"
              )}>
                <div className="text-center p-6">
                  <div className="mb-4">
                    <svg
                      className="mx-auto h-12 w-12 text-destructive/50"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <title>PDF load error icon</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.82 16.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-destructive mb-2" aria-label="Failed to load PDF">
                    Failed to load PDF
                  </h3>
                  <p className="text-sm text-destructive/80">
                    {error.message || 'An error occurred while loading the PDF document.'}
                  </p>
                </div>
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
} 