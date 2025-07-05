# Icon Generation Guide for Stellar

This guide will help you generate all the required icon files from your `stellar.svg` for both PWA and Tauri app installation.

## Required Icon Files

### For PWA (Web App Installation)
- `public/stellar-192.png` - 192x192px
- `public/stellar-512.png` - 512x512px  
- `public/stellar-maskable-192.png` - 192x192px (with padding for safe area)
- `public/stellar-maskable-512.png` - 512x512px (with padding for safe area)

### For Tauri (Desktop App)
- `src-tauri/icons/32x32.png` - 32x32px
- `src-tauri/icons/128x128.png` - 128x128px
- `src-tauri/icons/128x128@2x.png` - 256x256px
- `src-tauri/icons/icon.png` - 512x512px (main icon)
- `src-tauri/icons/icon.ico` - Windows ICO format
- `src-tauri/icons/icon.icns` - macOS ICNS format

## Method 1: Using Online Tools (Easiest)

1. **Go to [RealFaviconGenerator](https://realfavicongenerator.net/)**
   - Upload your `public/stellar.svg`
   - Follow the wizard to generate all icon formats
   - Download and extract to appropriate folders

2. **Or use [Favicon.io](https://favicon.io/favicon-converter/)**
   - Upload `public/stellar.svg`
   - Generate multiple sizes
   - Download and organize files

## Method 2: Using ImageMagick (Command Line)

If you have ImageMagick installed:

```bash
# Install ImageMagick (if not already installed)
# macOS: brew install imagemagick
# Ubuntu: sudo apt install imagemagick

# Navigate to your project root
cd /path/to/stellar

# Generate PWA icons
magick public/stellar.svg -resize 192x192 public/stellar-192.png
magick public/stellar.svg -resize 512x512 public/stellar-512.png

# Generate maskable icons (with 20% padding for safe area)
magick public/stellar.svg -resize 154x154 -gravity center -extent 192x192 -background transparent public/stellar-maskable-192.png
magick public/stellar.svg -resize 410x410 -gravity center -extent 512x512 -background transparent public/stellar-maskable-512.png

# Generate Tauri icons
magick public/stellar.svg -resize 32x32 src-tauri/icons/32x32.png
magick public/stellar.svg -resize 128x128 src-tauri/icons/128x128.png
magick public/stellar.svg -resize 256x256 src-tauri/icons/128x128@2x.png
magick public/stellar.svg -resize 512x512 src-tauri/icons/icon.png

# Generate ICO (Windows)
magick public/stellar.svg -define icon:auto-resize="256,128,64,48,32,16" src-tauri/icons/icon.ico

# Generate ICNS (macOS) - requires additional steps
mkdir icon.iconset
magick public/stellar.svg -resize 16x16 icon.iconset/icon_16x16.png
magick public/stellar.svg -resize 32x32 icon.iconset/icon_16x16@2x.png
magick public/stellar.svg -resize 32x32 icon.iconset/icon_32x32.png
magick public/stellar.svg -resize 64x64 icon.iconset/icon_32x32@2x.png
magick public/stellar.svg -resize 128x128 icon.iconset/icon_128x128.png
magick public/stellar.svg -resize 256x256 icon.iconset/icon_128x128@2x.png
magick public/stellar.svg -resize 256x256 icon.iconset/icon_256x256.png
magick public/stellar.svg -resize 512x512 icon.iconset/icon_256x256@2x.png
magick public/stellar.svg -resize 512x512 icon.iconset/icon_512x512.png
magick public/stellar.svg -resize 1024x1024 icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset
mv icon.icns src-tauri/icons/icon.icns
rm -rf icon.iconset
```

## Method 3: Using Figma/Design Tools

1. Import `stellar.svg` into Figma, Sketch, or similar
2. Create frames for each required size
3. Export as PNG with transparent background
4. Save to appropriate directories

## Verification

After generating icons, verify they're working:

1. **PWA**: Open your app in Chrome, check if "Install" button appears in address bar
2. **Tauri**: Run `pnpm tauri build` and check the generated app icon
3. **Favicon**: Check browser tab for the teal stellar icon

## Optional: Generate Additional Platform Icons

For broader platform support, you can also generate:
- Apple touch icons (various sizes)
- Android adaptive icons
- Windows tile icons
- Notification icons

## Notes

- All icons should have transparent backgrounds
- Maskable icons need 20% padding on all sides for safe area
- ICO files should include multiple sizes (16, 32, 48, 64, 128, 256px)
- ICNS files are only needed for macOS builds
- Test icons on different backgrounds to ensure they look good

## Troubleshooting

- If SVG doesn't convert properly, try saving it as a high-resolution PNG first
- Ensure your SVG doesn't have any external dependencies
- Some online tools work better with simplified SVG markup
- For best results, your SVG should be square (1:1 aspect ratio)

Your `stellar.svg` is already optimized with the teal color scheme and should convert beautifully to all formats! 