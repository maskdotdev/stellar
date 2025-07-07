import { ReactElement } from 'react';

export interface PdfRendererProps {
  fileUrl: string;
  title?: string;
  className?: string;
  onError?: (error: Error) => void;
  onDocumentLoadSuccess?: (numPages: number) => void;
}

export interface PdfToolbarProps {
  className?: string;
}

export interface ToolbarSlot {
  ZoomIn: React.ComponentType<ToolbarActionProps>;
  ZoomOut: React.ComponentType<ToolbarActionProps>;
  Zoom: React.ComponentType<ToolbarActionProps>;
  PreviousPage: React.ComponentType<ToolbarActionProps>;
  NextPage: React.ComponentType<ToolbarActionProps>;
  CurrentPageInput: React.ComponentType<ToolbarActionProps>;
  NumberOfPages: React.ComponentType<ToolbarActionProps>;
  GoToFirstPage: React.ComponentType<ToolbarActionProps>;
  GoToLastPage: React.ComponentType<ToolbarActionProps>;
  RotateClockwise: React.ComponentType<ToolbarActionProps>;
  RotateCounterclockwise: React.ComponentType<ToolbarActionProps>;
  FullScreen: React.ComponentType<ToolbarActionProps>;
  Download: React.ComponentType<ToolbarActionProps>;
  Print: React.ComponentType<ToolbarActionProps>;
  Search: React.ComponentType<ToolbarActionProps>;
  MoreActions: React.ComponentType<ToolbarActionProps>;
}

export interface ToolbarActionProps {
  onClick?: () => void;
  disabled?: boolean;
  children?: (props: ToolbarActionProps) => ReactElement;
  // Page navigation props
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  value?: string | number;
  numberOfPages?: number;
  // Zoom props
  scale?: number;
  // More actions props
  onToggleTheme?: () => void;
  onHandModeToggle?: () => void;
  onScrollModeToggle?: () => void;
}

export interface ToolbarProps {
  children?: (slots: ToolbarSlot) => ReactElement;
} 