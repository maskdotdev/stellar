use sqlx::Row;
use chrono::Utc;
use super::Database;

impl Database {
    /// Store an encrypted API key
    pub async fn store_api_key(&self, provider_id: &str, api_key: &str) -> Result<(), sqlx::Error> {
        let now = Utc::now().to_rfc3339();
        let encrypted_key = self.encrypt_api_key(api_key);

        sqlx::query(
            r#"
            INSERT OR REPLACE INTO api_keys (provider_id, encrypted_key, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            "#,
        )
        .bind(provider_id)
        .bind(&encrypted_key)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Retrieve and decrypt an API key
    pub async fn get_api_key(&self, provider_id: &str) -> Result<Option<String>, sqlx::Error> {
        let row = sqlx::query("SELECT encrypted_key FROM api_keys WHERE provider_id = ?")
            .bind(provider_id)
            .fetch_optional(&self.pool)
            .await?;

        if let Some(row) = row {
            let encrypted_key: String = row.get("encrypted_key");
            match self.decrypt_api_key(&encrypted_key) {
                Ok(api_key) => Ok(Some(api_key)),
                Err(_) => Ok(None), // Return None if decryption fails
            }
        } else {
            Ok(None)
        }
    }

    /// Delete an API key
    pub async fn delete_api_key(&self, provider_id: &str) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM api_keys WHERE provider_id = ?")
            .bind(provider_id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    /// List all stored provider IDs (for debugging/management)
    pub async fn list_api_key_providers(&self) -> Result<Vec<String>, sqlx::Error> {
        let rows = sqlx::query("SELECT provider_id FROM api_keys ORDER BY updated_at DESC")
            .fetch_all(&self.pool)
            .await?;

        Ok(rows.into_iter().map(|row| row.get("provider_id")).collect())
    }
} 