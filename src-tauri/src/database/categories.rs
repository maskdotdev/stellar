use sqlx::Row;
use chrono::{DateTime, Utc};
use uuid::Uuid;
use super::{Database, types::{Category, CreateCategoryRequest}};

impl Database {
    pub async fn create_category(&self, req: CreateCategoryRequest) -> Result<Category, sqlx::Error> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();

        let category = Category {
            id: id.clone(),
            name: req.name.clone(),
            description: req.description.clone(),
            color: req.color.clone(),
            icon: req.icon.clone(),
            created_at: now,
            updated_at: now,
            document_count: 0,
        };

        sqlx::query(
            r#"
            INSERT INTO categories (id, name, description, color, icon, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&req.name)
        .bind(&req.description)
        .bind(&req.color)
        .bind(&req.icon)
        .bind(now.to_rfc3339())
        .bind(now.to_rfc3339())
        .execute(&self.pool)
        .await?;

        Ok(category)
    }

    pub async fn get_all_categories(&self) -> Result<Vec<Category>, sqlx::Error> {
        let rows = sqlx::query(
            r#"
            SELECT c.*, COUNT(d.id) as document_count 
            FROM categories c 
            LEFT JOIN documents d ON c.id = d.category_id 
            GROUP BY c.id 
            ORDER BY c.name ASC
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        let mut categories = Vec::new();
        for row in rows {
            let created_at: String = row.get("created_at");
            let updated_at: String = row.get("updated_at");
            let document_count: i64 = row.get("document_count");

            categories.push(Category {
                id: row.get("id"),
                name: row.get("name"),
                description: row.get("description"),
                color: row.get("color"),
                icon: row.get("icon"),
                created_at: DateTime::parse_from_rfc3339(&created_at)
                    .unwrap_or_else(|_| Utc::now().into())
                    .with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&updated_at)
                    .unwrap_or_else(|_| Utc::now().into())
                    .with_timezone(&Utc),
                document_count,
            });
        }

        Ok(categories)
    }

    pub async fn get_category(&self, id: &str) -> Result<Option<Category>, sqlx::Error> {
        let row = sqlx::query(
            r#"
            SELECT c.*, COUNT(d.id) as document_count 
            FROM categories c 
            LEFT JOIN documents d ON c.id = d.category_id 
            WHERE c.id = ? 
            GROUP BY c.id
            "#
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(row) = row {
            let created_at: String = row.get("created_at");
            let updated_at: String = row.get("updated_at");
            let document_count: i64 = row.get("document_count");

            Ok(Some(Category {
                id: row.get("id"),
                name: row.get("name"),
                description: row.get("description"),
                color: row.get("color"),
                icon: row.get("icon"),
                created_at: DateTime::parse_from_rfc3339(&created_at)
                    .unwrap_or_else(|_| Utc::now().into())
                    .with_timezone(&Utc),
                updated_at: DateTime::parse_from_rfc3339(&updated_at)
                    .unwrap_or_else(|_| Utc::now().into())
                    .with_timezone(&Utc),
                document_count,
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn update_category(&self, id: &str, req: CreateCategoryRequest) -> Result<Option<Category>, sqlx::Error> {
        let now = Utc::now();

        let result = sqlx::query(
            r#"
            UPDATE categories 
            SET name = ?, description = ?, color = ?, icon = ?, updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(&req.name)
        .bind(&req.description)
        .bind(&req.color)
        .bind(&req.icon)
        .bind(now.to_rfc3339())
        .bind(id)
        .execute(&self.pool)
        .await?;

        if result.rows_affected() > 0 {
            self.get_category(id).await
        } else {
            Ok(None)
        }
    }

    pub async fn delete_category(&self, id: &str) -> Result<bool, sqlx::Error> {
        // First, set category_id to NULL for all documents in this category
        sqlx::query("UPDATE documents SET category_id = NULL WHERE category_id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        // Then delete the category
        let result = sqlx::query("DELETE FROM categories WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
} 