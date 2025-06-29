# Database Module

This directory contains the database layer for the Stellar application, organized into logical modules for better maintainability and separation of concerns.

## Structure

- **`mod.rs`** - Main module file that re-exports all types and the Database struct
- **`types.rs`** - All data structures, request/response types, and type definitions
- **`database.rs`** - Main Database struct, initialization, and helper functions
- **`documents.rs`** - Document-related database operations (CRUD)
- **`categories.rs`** - Category management database operations
- **`api_keys.rs`** - API key storage and encryption operations
- **`sessions.rs`** - Study sessions and user actions (Student Pro features)

## Key Types

### Core Entities
- `Document` - Represents a document with metadata, content, and categorization
- `Category` - Represents a document category with theming options
- `StudySession` - Represents a study session with timing and metadata
- `UserAction` - Represents user interactions for analytics

### Request Types
- `CreateDocumentRequest` - For creating new documents
- `CreateCategoryRequest` - For creating new categories
- `CreateSessionRequest` - For creating new study sessions
- `CreateActionRequest` - For recording user actions

### Statistics Types
- `ActionStats` - Aggregated statistics about user actions
- `StudyInsights` - Analytics about study patterns (planned)

## Database Schema

The database uses SQLite with the following main tables:

- `documents` - Stores document metadata and content
- `categories` - Stores category information
- `api_keys` - Stores encrypted API keys
- `study_sessions` - Stores study session data
- `user_actions` - Stores user action events

## Usage

```rust
use crate::database::{Database, Document, CreateDocumentRequest};

// Initialize database
let db = Database::new("sqlite:./stellar.db").await?;

// Create a document
let doc_request = CreateDocumentRequest {
    title: "My Document".to_string(),
    content: "Document content".to_string(),
    doc_type: "markdown".to_string(),
    tags: vec!["tag1".to_string()],
    status: Some("draft".to_string()),
    category_id: None,
    file_path: None,
};

let document = db.create_document(doc_request).await?;
```

## Features

- **Document Management**: Full CRUD operations for documents with categorization
- **Category System**: Hierarchical organization with custom theming
- **API Key Management**: Encrypted storage of provider API keys
- **Study Analytics**: Session tracking and user action recording
- **Migration Support**: Automatic schema updates and data migration 