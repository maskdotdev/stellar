use sqlx::Row;
use chrono::Utc;
use super::Database;

fn canonical_provider_id(provider_id: &str) -> String {
    match provider_id {
        "openai" | "openai-default" => "openai-default".to_string(),
        "anthropic" | "anthropic-default" => "anthropic-default".to_string(),
        _ => provider_id.to_string(),
    }
}

fn provider_lookup_ids(provider_id: &str) -> Vec<String> {
    match canonical_provider_id(provider_id).as_str() {
        "openai-default" => vec!["openai-default".to_string(), "openai".to_string()],
        "anthropic-default" => vec!["anthropic-default".to_string(), "anthropic".to_string()],
        _ => vec![provider_id.to_string()],
    }
}

impl Database {
    /// Store an encrypted API key
    pub async fn store_api_key(&self, provider_id: &str, api_key: &str) -> Result<(), sqlx::Error> {
        let now = Utc::now().to_rfc3339();
        let encrypted_key = self.encrypt_api_key(api_key);
        let canonical_id = canonical_provider_id(provider_id);

        sqlx::query(
            r#"
            INSERT OR REPLACE INTO api_keys (provider_id, encrypted_key, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            "#,
        )
        .bind(canonical_id)
        .bind(&encrypted_key)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Retrieve and decrypt an API key
    pub async fn get_api_key(&self, provider_id: &str) -> Result<Option<String>, sqlx::Error> {
        for lookup_id in provider_lookup_ids(provider_id) {
            let row = sqlx::query("SELECT encrypted_key FROM api_keys WHERE provider_id = ?")
                .bind(lookup_id)
                .fetch_optional(&self.pool)
                .await?;

            if let Some(row) = row {
                let encrypted_key: String = row.get("encrypted_key");
                match self.decrypt_api_key(&encrypted_key) {
                    Ok(api_key) => return Ok(Some(api_key)),
                    Err(_) => return Ok(None), // Return None if decryption fails
                }
            }
        }

        Ok(None)
    }

    /// Delete an API key
    pub async fn delete_api_key(&self, provider_id: &str) -> Result<bool, sqlx::Error> {
        let mut deleted_any = false;

        for lookup_id in provider_lookup_ids(provider_id) {
            let result = sqlx::query("DELETE FROM api_keys WHERE provider_id = ?")
                .bind(lookup_id)
                .execute(&self.pool)
                .await?;

            if result.rows_affected() > 0 {
                deleted_any = true;
            }
        }

        Ok(deleted_any)
    }

    /// List all stored provider IDs (for debugging/management)
    pub async fn list_api_key_providers(&self) -> Result<Vec<String>, sqlx::Error> {
        let rows = sqlx::query("SELECT provider_id FROM api_keys ORDER BY updated_at DESC")
            .fetch_all(&self.pool)
            .await?;

        Ok(rows.into_iter().map(|row| row.get("provider_id")).collect())
    }
} 
