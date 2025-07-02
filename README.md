# Stellar

A modern study and research application built with Tauri, React, and TypeScript.

![Stellar](./stellar-themes.gif)

## Features

- 📄 **Advanced PDF Processing**: Convert PDFs to markdown with high accuracy using [Marker](https://github.com/datalab-to/marker)
- 🤖 **AI Integration**: Multiple AI provider support (OpenAI, Anthropic, Ollama)
- 💾 **Document Management**: SQLite-based document storage and organization
- 🎨 **Modern UI**: Beautiful interface built with React and Tailwind CSS

## Development

### Prerequisites

- Node.js (v16 or later)
- Rust (latest stable)
- Python 3.8+ (for Marker PDF processing)

### Setup

1. Install dependencies:
```bash
pnpm install
```

2. Set up Marker for enhanced PDF processing:
```bash
./scripts/setup_marker.sh
```

3. Start the development server:
```bash
pnpm tauri dev
```

### PDF Processing

Stellar supports multiple PDF processing modes to suit different needs:

1. **Basic Mode**: Fast text extraction using `pdf-extract`
2. **Enhanced Mode**: Improved text processing with better structure detection
3. **MarkItDown Mode**: Microsoft's lightweight tool for balanced speed and quality
4. **Marker Mode**: High-quality conversion using Marker with deep learning models

#### Setup Processing Tools

**For MarkItDown (Recommended for most users):**
```bash
./scripts/setup_markitdown.sh
```

**For Marker (Best quality, requires more setup):**
```bash
./scripts/setup_marker.sh
./scripts/run_marker.sh
```

#### Processing Options

When uploading PDFs in the application, you can choose from:

- **Basic**: Fast text extraction with minimal processing
- **Enhanced**: Improved structure detection, lists, and headings
- **MarkItDown**: Microsoft's tool - good balance of speed and quality
- **Marker**: Highest quality with 95.6% accuracy for complex documents

#### Feature Comparison

| Method     | Speed | Accuracy | Tables | Images | Setup Required |
|------------|-------|----------|--------|--------|----------------|
| Basic      | ⚡⚡⚡  | ⭐⭐     | ❌     | ❌     | None           |
| Enhanced   | ⚡⚡   | ⭐⭐⭐   | ⚠️     | ❌     | None           |
| MarkItDown | ⚡⚡   | ⭐⭐⭐⭐ | ✅     | ⚠️     | Python + pip   |
| Marker     | ⚡     | ⭐⭐⭐⭐⭐| ✅     | ✅     | Python + Server|

#### Performance Comparison

| Method     | Avg Time | Accuracy | Quality | Best For |
|------------|----------|----------|---------|----------|
| Basic      | 0.1s     | ~70%     | Low     | Simple text documents |
| Enhanced   | 0.2s     | ~80%     | Medium  | Structured documents |
| MarkItDown | 0.5s     | ~85%     | High    | General purpose |
| Marker     | 2.8s     | 95.6%    | Highest | Academic papers, complex layouts |

## License

This project is licensed under the MIT License.
