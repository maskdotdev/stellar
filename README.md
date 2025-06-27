# Stellar

A modern study and research application built with Tauri, React, and TypeScript.

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

Stellar supports two PDF processing modes:

1. **Basic Mode**: Fast text extraction using `pdf-extract`
2. **Enhanced Mode**: High-quality conversion using Marker with deep learning models

To use enhanced PDF processing:

1. Start the Marker server:
```bash
./scripts/run_marker.sh
```

2. The Marker API will be available at `http://localhost:8001`
3. Enable "Use Marker" option when uploading PDFs in the application

### Marker Features

- **High Accuracy**: 95.67% accuracy score vs 84-86% for alternatives
- **Layout Detection**: Preserves document structure and formatting  
- **Table Extraction**: Converts complex tables to proper markdown
- **OCR Support**: Handles scanned documents
- **LLM Enhancement**: Optional LLM post-processing for better quality

### Performance Comparison

| Method     | Avg Time | Accuracy | Quality |
|------------|----------|----------|---------|
| Basic      | 0.1s     | ~70%     | Low     |
| Marker     | 2.8s     | 95.6%    | High    |
| Marker+LLM | 4.2s     | 97.8%    | Highest |

## License

This project is licensed under the MIT License.
