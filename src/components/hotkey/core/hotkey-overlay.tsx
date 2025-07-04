import React from 'react';
import { useHotkeyContext } from './hotkey-provider';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';


export const HotkeyOverlay: React.FC = () => {
  const { mode, prefixes, currentBuffer, showOverlay } = useHotkeyContext();

  // Don't show overlay popup - indicators on elements are less intrusive
  return null;
  
  // Only show overlay when actively typing and after delay
  if (!showOverlay || mode === 'inactive') {
    return null;
  }

  // Get all currently visible and interactive elements with their hotkeys
  const activeHotkeys = Object.entries(prefixes)
    .map(([label, prefix]) => {
      // Find the element by looking for registered refs
      // Note: In a real implementation, we'd need access to the registered items
      // For now, we'll show the prefixes that are available
      return { label, prefix };
    })
    .filter(({ prefix }) => {
      // Show all if no buffer, or show matches if there's a partial buffer
      return !currentBuffer || prefix.startsWith(currentBuffer);
    })
    .sort((a, b) => a.prefix.length - b.prefix.length); // Shorter prefixes first

  if (activeHotkeys.length === 0) {
    return null;
  }

  // The first potential selection is the item with the shortest matching prefix
  const firstPotentialMatch = activeHotkeys[0];

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
      
      {/* Hotkey display */}
      <div className="absolute top-4 right-4 max-w-sm">
        <Card className="p-4 shadow-lg border-2 border-primary/20 bg-background/95 backdrop-blur">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm font-medium">Hotkey Mode</span>
            {currentBuffer && (
              <Badge variant="outline" className="font-mono">
                {currentBuffer}
              </Badge>
            )}
          </div>
          
          <div className="space-y-1">
            {activeHotkeys.slice(0, 8).map(({ label, prefix }, index) => {
              const isFirstPotential = index === 0 && firstPotentialMatch && prefix === firstPotentialMatch.prefix;
              const isExactMatch = prefix === currentBuffer;
              const isPartialMatch = prefix.startsWith(currentBuffer);
              
              return (
                <div 
                  key={label}
                  className={`flex items-center justify-between text-sm p-2 rounded transition-all duration-200 ${
                    isExactMatch
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : isFirstPotential && currentBuffer
                      ? 'bg-gradient-to-r from-yellow-500/20 to-yellow-400/10 border border-yellow-500/50 text-foreground ring-2 ring-yellow-500/30 shadow-md scale-105'
                      : isPartialMatch
                      ? 'bg-muted hover:bg-muted/80'
                      : 'opacity-60'
                  }`}
                >
                  <span className="truncate flex-1">{label}</span>
                  <Badge 
                    variant={
                      isExactMatch 
                        ? "secondary" 
                        : isFirstPotential && currentBuffer
                        ? "default"
                        : "outline"
                    }
                    className={`font-mono ml-2 transition-all duration-200 ${
                      isFirstPotential && currentBuffer 
                        ? 'bg-yellow-500 text-yellow-950 shadow-md ring-1 ring-yellow-600/50 animate-pulse' 
                        : ''
                    }`}
                  >
                    {prefix}
                  </Badge>
                </div>
              );
            })}
            
            {activeHotkeys.length > 8 && (
              <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                +{activeHotkeys.length - 8} more...
              </div>
            )}
          </div>
          
          <div className="mt-3 pt-2 border-t text-xs text-muted-foreground">
            Type letters to filter • Enter to select • Esc to cancel
          </div>
        </Card>
      </div>
    </div>
  );
};

// Individual hotkey indicator that appears next to elements
export const HotkeyIndicator: React.FC<{ 
  prefix: string; 
  isActive?: boolean;
  className?: string;
}> = ({ prefix, isActive, className = "" }) => {
  if (!prefix) return null;

  return (
    <Badge 
      variant={isActive ? "default" : "secondary"} 
      className={`font-mono text-xs ${className}`}
    >
      {prefix}
    </Badge>
  );
};

// Hook to get the prefix for a specific label
export const useHotkeyPrefix = (label: string) => {
  const { prefixes } = useHotkeyContext();
  return prefixes[label] || '';
}; 
