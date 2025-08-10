use sqlx::Row;
use chrono::{DateTime, Utc};
use uuid::Uuid;
use super::{Database, types::{ProcessingJob, CreateProcessingJobRequest, ProcessingJobUpdate, ProcessingJobStats}};

impl Database {
    /// Create a new processing job
    pub async fn create_processing_job(&self, req: CreateProcessingJobRequest) -> Result<ProcessingJob, sqlx::Error> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now();
        let tags_json = serde_json::to_string(&req.tags).unwrap_or_else(|_| "[]".to_string());
        let processing_options_json = req.processing_options.as_ref()
            .map(|opts| serde_json::to_string(opts).unwrap_or_else(|_| "{}".to_string()));
        let metadata_json = req.metadata.as_ref()
            .map(|meta| serde_json::to_string(meta).unwrap_or_else(|_| "{}".to_string()));

        let job = ProcessingJob {
            id: id.clone(),
            job_type: req.job_type.clone(),
            status: "pending".to_string(),
            source_type: req.source_type.clone(),
            source_path: req.source_path.clone(),
            original_filename: req.original_filename.clone(),
            title: req.title.clone(),
            tags: req.tags.clone(),
            category_id: req.category_id.clone(),
            progress: 0,
            error_message: None,
            result_document_id: None,
            processing_options: req.processing_options.clone(),
            created_at: now,
            started_at: None,
            completed_at: None,
            metadata: req.metadata.clone(),
        };

        sqlx::query(
            r#"
            INSERT INTO processing_jobs (
                id, job_type, status, source_type, source_path, original_filename, title, tags, 
                category_id, progress, error_message, result_document_id, processing_options, 
                created_at, started_at, completed_at, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&req.job_type)
        .bind("pending")
        .bind(&req.source_type)
        .bind(&req.source_path)
        .bind(&req.original_filename)
        .bind(&req.title)
        .bind(&tags_json)
        .bind(&req.category_id)
        .bind(0) // progress
        .bind(None::<String>) // error_message
        .bind(None::<String>) // result_document_id
        .bind(processing_options_json)
        .bind(now.to_rfc3339())
        .bind(None::<String>) // started_at
        .bind(None::<String>) // completed_at
        .bind(metadata_json)
        .execute(&self.pool)
        .await?;

        Ok(job)
    }

    /// Get all processing jobs with pagination
    pub async fn get_processing_jobs(&self, limit: Option<i64>, offset: Option<i64>) -> Result<Vec<ProcessingJob>, sqlx::Error> {
        let limit = limit.unwrap_or(50);
        let offset = offset.unwrap_or(0);

        let rows = sqlx::query("SELECT * FROM processing_jobs ORDER BY created_at DESC LIMIT ? OFFSET ?")
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.pool)
            .await?;

        let mut jobs = Vec::new();
        for row in rows {
            jobs.push(self.row_to_processing_job(row)?);
        }

        Ok(jobs)
    }

    /// Get a specific processing job by ID
    pub async fn get_processing_job(&self, id: &str) -> Result<Option<ProcessingJob>, sqlx::Error> {
        let row = sqlx::query("SELECT * FROM processing_jobs WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;

        if let Some(row) = row {
            Ok(Some(self.row_to_processing_job(row)?))
        } else {
            Ok(None)
        }
    }

    /// Update a processing job
    pub async fn update_processing_job(&self, update: ProcessingJobUpdate) -> Result<Option<ProcessingJob>, sqlx::Error> {
        let mut query = String::from("UPDATE processing_jobs SET ");
        let mut values = Vec::new();
        let mut update_fields = Vec::new();

        if let Some(status) = &update.status {
            update_fields.push("status = ?");
            values.push(status.clone());
        }

        if let Some(progress) = update.progress {
            update_fields.push("progress = ?");
            values.push(progress.to_string());
        }

        if let Some(error_message) = &update.error_message {
            update_fields.push("error_message = ?");
            values.push(error_message.clone());
        }

        if let Some(result_document_id) = &update.result_document_id {
            update_fields.push("result_document_id = ?");
            values.push(result_document_id.clone());
        }

        if let Some(started_at) = &update.started_at {
            update_fields.push("started_at = ?");
            values.push(started_at.to_rfc3339());
        }

        if let Some(completed_at) = &update.completed_at {
            update_fields.push("completed_at = ?");
            values.push(completed_at.to_rfc3339());
        }

        if let Some(metadata) = &update.metadata {
            update_fields.push("metadata = ?");
            values.push(serde_json::to_string(metadata).unwrap_or_else(|_| "{}".to_string()));
        }

        if update_fields.is_empty() {
            return self.get_processing_job(&update.id).await;
        }

        query.push_str(&update_fields.join(", "));
        query.push_str(" WHERE id = ?");
        values.push(update.id.clone());

        // Build the query dynamically
        let mut sql_query = sqlx::query(&query);
        for value in values {
            sql_query = sql_query.bind(value);
        }

        let result = sql_query.execute(&self.pool).await?;

        if result.rows_affected() > 0 {
            self.get_processing_job(&update.id).await
        } else {
            Ok(None)
        }
    }

    /// Get processing jobs by status
    pub async fn get_processing_jobs_by_status(&self, status: &str) -> Result<Vec<ProcessingJob>, sqlx::Error> {
        let rows = sqlx::query("SELECT * FROM processing_jobs WHERE status = ? ORDER BY created_at DESC")
            .bind(status)
            .fetch_all(&self.pool)
            .await?;

        let mut jobs = Vec::new();
        for row in rows {
            jobs.push(self.row_to_processing_job(row)?);
        }

        Ok(jobs)
    }

    /// Get processing jobs by result document ID
    pub async fn get_processing_jobs_by_result_document_id(&self, document_id: &str) -> Result<Vec<ProcessingJob>, sqlx::Error> {
        let rows = sqlx::query("SELECT * FROM processing_jobs WHERE result_document_id = ? ORDER BY created_at DESC")
            .bind(document_id)
            .fetch_all(&self.pool)
            .await?;

        let mut jobs = Vec::new();
        for row in rows {
            jobs.push(self.row_to_processing_job(row)?);
        }

        Ok(jobs)
    }

    /// Get next pending job for processing
    pub async fn get_next_pending_job(&self) -> Result<Option<ProcessingJob>, sqlx::Error> {
        let row = sqlx::query("SELECT * FROM processing_jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1")
            .fetch_optional(&self.pool)
            .await?;

        if let Some(row) = row {
            Ok(Some(self.row_to_processing_job(row)?))
        } else {
            Ok(None)
        }
    }

    /// Delete a processing job
    pub async fn delete_processing_job(&self, id: &str) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM processing_jobs WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Get processing job statistics
    pub async fn get_processing_job_stats(&self) -> Result<ProcessingJobStats, sqlx::Error> {
        let total_jobs: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM processing_jobs")
            .fetch_one(&self.pool)
            .await?;

        let pending_jobs: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM processing_jobs WHERE status = 'pending'")
            .fetch_one(&self.pool)
            .await?;

        let processing_jobs: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM processing_jobs WHERE status = 'processing'")
            .fetch_one(&self.pool)
            .await?;

        let completed_jobs: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM processing_jobs WHERE status = 'completed'")
            .fetch_one(&self.pool)
            .await?;

        let failed_jobs: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM processing_jobs WHERE status = 'failed'")
            .fetch_one(&self.pool)
            .await?;

        // Calculate average processing time for completed jobs
        let avg_time_result: Option<f64> = sqlx::query_scalar(
            r#"
            SELECT AVG(
                CASE 
                    WHEN started_at IS NOT NULL AND completed_at IS NOT NULL 
                    THEN (julianday(completed_at) - julianday(started_at)) * 86400 
                    ELSE NULL 
                END
            ) FROM processing_jobs WHERE status = 'completed'
            "#
        )
        .fetch_one(&self.pool)
        .await?;

        let average_processing_time = avg_time_result.unwrap_or(0.0);

        Ok(ProcessingJobStats {
            total_jobs,
            pending_jobs,
            processing_jobs,
            completed_jobs,
            failed_jobs,
            average_processing_time,
        })
    }

    /// Convert database row to ProcessingJob
    pub fn row_to_processing_job(&self, row: sqlx::sqlite::SqliteRow) -> Result<ProcessingJob, sqlx::Error> {
        let tags_json: String = row.get("tags");
        let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

        let processing_options: Option<serde_json::Value> = row.get::<Option<String>, _>("processing_options")
            .map(|opts| serde_json::from_str(&opts).unwrap_or_default());

        let metadata: Option<serde_json::Value> = row.get::<Option<String>, _>("metadata")
            .map(|meta| serde_json::from_str(&meta).unwrap_or_default());

        let created_at: String = row.get("created_at");
        let started_at: Option<String> = row.get("started_at");
        let completed_at: Option<String> = row.get("completed_at");

        Ok(ProcessingJob {
            id: row.get("id"),
            job_type: row.get("job_type"),
            status: row.get("status"),
            source_type: row.get("source_type"),
            source_path: row.get("source_path"),
            original_filename: row.get("original_filename"),
            title: row.get("title"),
            tags,
            category_id: row.get("category_id"),
            progress: row.get("progress"),
            error_message: row.get("error_message"),
            result_document_id: row.get("result_document_id"),
            processing_options,
            created_at: DateTime::parse_from_rfc3339(&created_at)
                .unwrap_or_else(|_| Utc::now().into())
                .with_timezone(&Utc),
            started_at: started_at.map(|s| DateTime::parse_from_rfc3339(&s)
                .unwrap_or_else(|_| Utc::now().into())
                .with_timezone(&Utc)),
            completed_at: completed_at.map(|s| DateTime::parse_from_rfc3339(&s)
                .unwrap_or_else(|_| Utc::now().into())
                .with_timezone(&Utc)),
            metadata,
        })
    }
} 