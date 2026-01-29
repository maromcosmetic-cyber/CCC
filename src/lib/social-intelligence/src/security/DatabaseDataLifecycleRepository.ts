/**
 * Database Data Lifecycle Repository
 * Database implementation for data lifecycle operations
 */

import { 
  DataLifecycleRepository, 
  DataRetentionPolicy, 
  DataExportRequest, 
  DataDeletionRecord 
} from './DataLifecycleManager';

export class DatabaseDataLifecycleRepository implements DataLifecycleRepository {
  constructor(private db: any) {} // Database connection

  // Retention policies
  async createRetentionPolicy(policy: DataRetentionPolicy): Promise<DataRetentionPolicy> {
    try {
      const query = `
        INSERT INTO data_retention_policies (
          id, name, description, data_type, retention_period_days,
          auto_delete, archive_before_delete, archive_location,
          compliance_requirements, created_at, updated_at, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const values = [
        policy.id,
        policy.name,
        policy.description,
        policy.dataType,
        policy.retentionPeriodDays,
        policy.autoDelete,
        policy.archiveBeforeDelete,
        policy.archiveLocation,
        JSON.stringify(policy.complianceRequirements),
        policy.createdAt,
        policy.updatedAt,
        policy.isActive
      ];

      const result = await this.db.query(query, values);
      return this.mapRetentionPolicyRow(result.rows[0]);
    } catch (error) {
      console.error('Error creating retention policy:', error);
      throw error;
    }
  }

  async updateRetentionPolicy(id: string, updates: Partial<DataRetentionPolicy>): Promise<DataRetentionPolicy> {
    try {
      const setParts: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbColumn = this.camelToSnake(key);
          setParts.push(`${dbColumn} = $${paramIndex}`);
          values.push(key === 'complianceRequirements' ? JSON.stringify(value) : value);
          paramIndex++;
        }
      });

      if (setParts.length === 0) {
        throw new Error('No updates provided');
      }

      const query = `
        UPDATE data_retention_policies 
        SET ${setParts.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      values.push(id);
      const result = await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error(`Retention policy not found: ${id}`);
      }

      return this.mapRetentionPolicyRow(result.rows[0]);
    } catch (error) {
      console.error('Error updating retention policy:', error);
      throw error;
    }
  }

  async getRetentionPolicy(id: string): Promise<DataRetentionPolicy | null> {
    try {
      const query = 'SELECT * FROM data_retention_policies WHERE id = $1';
      const result = await this.db.query(query, [id]);
      
      return result.rows.length > 0 ? this.mapRetentionPolicyRow(result.rows[0]) : null;
    } catch (error) {
      console.error('Error getting retention policy:', error);
      throw error;
    }
  }

  async getRetentionPolicies(dataType?: string): Promise<DataRetentionPolicy[]> {
    try {
      let query = 'SELECT * FROM data_retention_policies';
      const values: any[] = [];

      if (dataType) {
        query += ' WHERE data_type = $1';
        values.push(dataType);
      }

      query += ' ORDER BY created_at DESC';

      const result = await this.db.query(query, values);
      return result.rows.map((row: any) => this.mapRetentionPolicyRow(row));
    } catch (error) {
      console.error('Error getting retention policies:', error);
      throw error;
    }
  }

  async deleteRetentionPolicy(id: string): Promise<void> {
    try {
      const query = 'DELETE FROM data_retention_policies WHERE id = $1';
      await this.db.query(query, [id]);
    } catch (error) {
      console.error('Error deleting retention policy:', error);
      throw error;
    }
  }

  // Export requests
  async createExportRequest(request: DataExportRequest): Promise<DataExportRequest> {
    try {
      const query = `
        INSERT INTO data_export_requests (
          id, user_id, request_type, status, requested_at, expires_at,
          download_url, file_size, format, include_metadata, reason, compliance_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const values = [
        request.id,
        request.userId,
        request.requestType,
        request.status,
        request.requestedAt,
        request.expiresAt,
        request.downloadUrl,
        request.fileSize,
        request.format,
        request.includeMetadata,
        request.reason,
        request.complianceType
      ];

      const result = await this.db.query(query, values);
      return this.mapExportRequestRow(result.rows[0]);
    } catch (error) {
      console.error('Error creating export request:', error);
      throw error;
    }
  }

  async updateExportRequest(id: string, updates: Partial<DataExportRequest>): Promise<DataExportRequest> {
    try {
      const setParts: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbColumn = this.camelToSnake(key);
          setParts.push(`${dbColumn} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (setParts.length === 0) {
        throw new Error('No updates provided');
      }

      const query = `
        UPDATE data_export_requests 
        SET ${setParts.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      values.push(id);
      const result = await this.db.query(query, values);
      
      if (result.rows.length === 0) {
        throw new Error(`Export request not found: ${id}`);
      }

      return this.mapExportRequestRow(result.rows[0]);
    } catch (error) {
      console.error('Error updating export request:', error);
      throw error;
    }
  }

  async getExportRequest(id: string): Promise<DataExportRequest | null> {
    try {
      const query = 'SELECT * FROM data_export_requests WHERE id = $1';
      const result = await this.db.query(query, [id]);
      
      return result.rows.length > 0 ? this.mapExportRequestRow(result.rows[0]) : null;
    } catch (error) {
      console.error('Error getting export request:', error);
      throw error;
    }
  }

  async getExportRequests(userId?: string): Promise<DataExportRequest[]> {
    try {
      let query = 'SELECT * FROM data_export_requests';
      const values: any[] = [];

      if (userId) {
        query += ' WHERE user_id = $1';
        values.push(userId);
      }

      query += ' ORDER BY requested_at DESC';

      const result = await this.db.query(query, values);
      return result.rows.map((row: any) => this.mapExportRequestRow(row));
    } catch (error) {
      console.error('Error getting export requests:', error);
      throw error;
    }
  }

  // Deletion records
  async createDeletionRecord(record: DataDeletionRecord): Promise<DataDeletionRecord> {
    try {
      const query = `
        INSERT INTO data_deletion_records (
          id, data_type, record_ids, deletion_reason, deleted_at, deleted_by,
          policy_id, verification_hash, recoverable, recovery_expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const values = [
        record.id,
        record.dataType,
        JSON.stringify(record.recordIds),
        record.deletionReason,
        record.deletedAt,
        record.deletedBy,
        record.policyId,
        record.verificationHash,
        record.recoverable,
        record.recoveryExpiresAt
      ];

      const result = await this.db.query(query, values);
      return this.mapDeletionRecordRow(result.rows[0]);
    } catch (error) {
      console.error('Error creating deletion record:', error);
      throw error;
    }
  }

  async getDeletionRecords(dataType?: string): Promise<DataDeletionRecord[]> {
    try {
      let query = 'SELECT * FROM data_deletion_records';
      const values: any[] = [];

      if (dataType) {
        query += ' WHERE data_type = $1';
        values.push(dataType);
      }

      query += ' ORDER BY deleted_at DESC';

      const result = await this.db.query(query, values);
      return result.rows.map((row: any) => this.mapDeletionRecordRow(row));
    } catch (error) {
      console.error('Error getting deletion records:', error);
      throw error;
    }
  }

  // Data lifecycle operations
  async getExpiredData(dataType: string, retentionDays: number): Promise<any[]> {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      
      // This would need to be customized based on actual table structures
      let query: string;
      switch (dataType) {
        case 'social_events':
          query = 'SELECT id FROM social_events WHERE created_at < $1';
          break;
        case 'audit_logs':
          query = 'SELECT id FROM audit_logs WHERE created_at < $1';
          break;
        case 'user_data':
          query = 'SELECT id FROM user_data WHERE created_at < $1';
          break;
        case 'analytics':
          query = 'SELECT id FROM analytics_data WHERE created_at < $1';
          break;
        default:
          throw new Error(`Unsupported data type: ${dataType}`);
      }

      const result = await this.db.query(query, [cutoffDate.toISOString()]);
      return result.rows;
    } catch (error) {
      console.error('Error getting expired data:', error);
      throw error;
    }
  }

  async deleteData(dataType: string, recordIds: string[]): Promise<void> {
    try {
      if (recordIds.length === 0) return;

      // This would need to be customized based on actual table structures
      let tableName: string;
      switch (dataType) {
        case 'social_events':
          tableName = 'social_events';
          break;
        case 'audit_logs':
          tableName = 'audit_logs';
          break;
        case 'user_data':
          tableName = 'user_data';
          break;
        case 'analytics':
          tableName = 'analytics_data';
          break;
        default:
          throw new Error(`Unsupported data type: ${dataType}`);
      }

      const placeholders = recordIds.map((_, index) => `$${index + 1}`).join(',');
      const query = `DELETE FROM ${tableName} WHERE id IN (${placeholders})`;
      
      await this.db.query(query, recordIds);
    } catch (error) {
      console.error('Error deleting data:', error);
      throw error;
    }
  }

  async archiveData(dataType: string, recordIds: string[], location: string): Promise<void> {
    try {
      // In a real implementation, this would move data to archive storage
      console.log(`Archiving ${recordIds.length} ${dataType} records to ${location}`);
    } catch (error) {
      console.error('Error archiving data:', error);
      throw error;
    }
  }

  async exportUserData(userId: string, dataTypes: string[]): Promise<any> {
    try {
      const exportData: any = {};

      for (const dataType of dataTypes) {
        let query: string;
        switch (dataType) {
          case 'user_data':
            query = 'SELECT * FROM user_data WHERE user_id = $1';
            break;
          case 'social_events':
            query = 'SELECT * FROM social_events WHERE author_id = $1';
            break;
          case 'analytics':
            query = 'SELECT * FROM analytics_data WHERE user_id = $1';
            break;
          case 'audit_logs':
            query = 'SELECT * FROM audit_logs WHERE user_id = $1';
            break;
          default:
            continue;
        }

        const result = await this.db.query(query, [userId]);
        exportData[dataType] = result.rows;
      }

      return exportData;
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  }

  // Helper methods
  private mapRetentionPolicyRow(row: any): DataRetentionPolicy {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      dataType: row.data_type,
      retentionPeriodDays: row.retention_period_days,
      autoDelete: row.auto_delete,
      archiveBeforeDelete: row.archive_before_delete,
      archiveLocation: row.archive_location,
      complianceRequirements: JSON.parse(row.compliance_requirements || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isActive: row.is_active
    };
  }

  private mapExportRequestRow(row: any): DataExportRequest {
    return {
      id: row.id,
      userId: row.user_id,
      requestType: row.request_type,
      status: row.status,
      requestedAt: row.requested_at,
      completedAt: row.completed_at,
      expiresAt: row.expires_at,
      downloadUrl: row.download_url,
      fileSize: row.file_size,
      format: row.format,
      includeMetadata: row.include_metadata,
      reason: row.reason,
      complianceType: row.compliance_type
    };
  }

  private mapDeletionRecordRow(row: any): DataDeletionRecord {
    return {
      id: row.id,
      dataType: row.data_type,
      recordIds: JSON.parse(row.record_ids || '[]'),
      deletionReason: row.deletion_reason,
      deletedAt: row.deleted_at,
      deletedBy: row.deleted_by,
      policyId: row.policy_id,
      verificationHash: row.verification_hash,
      recoverable: row.recoverable,
      recoveryExpiresAt: row.recovery_expires_at
    };
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}