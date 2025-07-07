import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils/utils";
import { Check, Palette } from "lucide-react";

interface ColorPickerProps {
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

const predefinedColors = [
  "#3B82F6", // blue
  "#10B981", // green
  "#8B5CF6", // purple
  "#F97316", // orange
  "#06B6D4", // cyan
  "#EAB308", // yellow
  "#EC4899", // pink
  "#6366F1", // indigo
  "#71717A", // grey
  "#000000", // black
  "#EF4444", // red
  "#475569", // slate
];

function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

export function ColorPicker({
  defaultValue = "#3B82F6",
  value,
  onChange,
  className,
}: ColorPickerProps) {
  // Always use a valid color value, falling back to defaultValue if value is undefined
  const currentValue = value ?? defaultValue;
  const [selectedColor, setSelectedColor] = React.useState(currentValue);
  const [customColor, setCustomColor] = React.useState(currentValue);
  const [isOpen, setIsOpen] = React.useState(false);
  const colorInputRef = React.useRef<HTMLInputElement>(null);

  // Add effect to sync with external value changes
  React.useEffect(() => {
    const newValue = value ?? defaultValue;
    setSelectedColor(newValue);
    setCustomColor(newValue);
  }, [value, defaultValue]);

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setCustomColor(color);
    onChange?.(color);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setCustomColor(newColor);
    
    // If it's a valid hex color, update the selected color
    if (isValidHexColor(newColor)) {
      handleColorSelect(newColor);
    }
  };

  const handleCustomColorBlur = () => {
    if (!isValidHexColor(customColor)) {
      setCustomColor(selectedColor);
    }
  };

  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    handleColorSelect(newColor);
  };

  const openColorPicker = () => {
    colorInputRef.current?.click();
  };

  // Ensure we always have a valid color to display
  const displayColor = selectedColor || defaultValue;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-between", className)}
        >
          <div className="flex items-center gap-2">
            <div
              className="h-4 w-4 rounded-full border"
              style={{ backgroundColor: displayColor }}
            />
            <span className="text-sm">{displayColor}</span>
          </div>
          {predefinedColors.includes(displayColor) && (
            <Check className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Predefined Colors</Label>
            <div className="grid grid-cols-4 gap-2">
              {predefinedColors.map((color) => (
                <button
                  key={color}
                  className={cn(
                    "h-8 w-8 rounded-full border transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2",
                    selectedColor === color && "ring-2 ring-offset-2"
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorSelect(color)}
                />
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Custom Color</Label>
            <div className="flex items-center gap-2">
              <button
                className={cn(
                  "group relative h-8 w-8 rounded-full border transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2",
                  "hover:shadow-lg"
                )}
                style={{ 
                  backgroundColor: isValidHexColor(customColor) ? customColor : selectedColor 
                }}
                onClick={openColorPicker}
              >
                <Palette className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 transform opacity-0 transition-opacity group-hover:opacity-100" />
                <input
                  ref={colorInputRef}
                  type="color"
                  className="invisible absolute h-0 w-0"
                  value={selectedColor}
                  onChange={handleColorPickerChange}
                />
              </button>
              <Input
                value={customColor}
                onChange={handleCustomColorChange}
                onBlur={handleCustomColorBlur}
                placeholder="#000000"
                className="flex-1"
                maxLength={7}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Click the color circle to open the color wheel, or enter a hex color (e.g., #FF0000)
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
} 