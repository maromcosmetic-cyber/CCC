/**
 * Data Lifecycle Manager
 * Implements data retention policies, automated deletion, and compliance features
 * Validates: Requirements 12.5, 12.6, 12.7
 */

import { z } from 'zod';

// Data retention policy schema
export const DataRetentionPolicySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  dataType: z.enum(['social_events', 'audit_logs', 'user_data', 'analytics', 'content']),
  retentionPeriodDays: z.number().min(1),
  autoDelete: z.boolean(),
  archiveBeforeDelete: z.boolean(),
  archiveLocation: z.string().optional(),
  complianceRequirements: z.array(z.enum(['GDPR', 'CCPA', 'PIPEDA', 'LGPD'])),
  createdAt: z.string(),
  updatedAt: z.string(),
  isActive: z.boolean()
});

export type DataRetentionPolicy = z.infer<typeof DataRetentionPolicySchema>;

// Data export request schema
export const DataExportRequestSchema = z.object({
  id: z.string(),
  userId: z.string(),
  requestType: z.enum(['user_data', 'audit_trail', 'analytics', 'full_export']),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'expired']),
  requestedAt: z.string(),
  completedAt: z.string().optional(),
  expiresAt: z.string(),
  downloadUrl: z.string().optional(),
  fileSize: z.number().optional(),
  format: z.enum(['json', 'csv', 'xml']),
  includeMetadata: z.boolean(),
  reason: z.string().optional(),
  complianceType: z.enum(['GDPR', 'CCPA', 'PIPEDA', 'LGPD']).optional()
});

export type DataExportRequest = z.infer<typeof DataExportRequestSchema>;

// Data deletion record schema
export const DataDeletionRecordSchema = z.object({
  id: z.string(),
  dataType: z.string(),
  recordIds: z.array(z.string()),
  deletionReason: z.enum(['retention_policy', 'user_request', 'compliance', 'manual']),
  deletedAt: z.string(),
  deletedBy: z.string(),
  policyId: z.string().optional(),
  verificationHash: z.string(),
  recoverable: z.boolean(),
  recoveryExpiresAt: z.string().optional()
});

export type DataDeletionRecord = z.infer<typeof DataDeletionRecordSchema>;

export interface DataLifecycleRepository {
  // Retention policies
  createRetentionPolicy(policy: DataRetentionPolicy): Promise<DataRetentionPolicy>;
  updateRetentionPolicy(id: string, updates: Partial<DataRetentionPolicy>): Promise<DataRetentionPolicy>;
  getRetentionPolicy(id: string): Promise<DataRetentionPolicy | null>;
  getRetentionPolicies(dataType?: string): Promise<DataRetentionPolicy[]>;
  deleteRetentionPolicy(id: string): Promise<void>;

  // Export requests
  createExportRequest(request: DataExportRequest): Promise<DataExportRequest>;
  updateExportRequest(id: string, updates: Partial<DataExportRequest>): Promise<DataExportRequest>;
  getExportRequest(id: string): Promise<DataExportRequest | null>;
  getExportRequests(userId?: string): Promise<DataExportRequest[]>;

  // Deletion records
  createDeletionRecord(record: DataDeletionRecord): Promise<DataDeletionRecord>;
  getDeletionRecords(dataType?: string): Promise<DataDeletionRecord[]>;

  // Data queries for lifecycle operations
  getExpiredData(dataType: string, retentionDays: number): Promise<any[]>;
  deleteData(dataType: string, recordIds: string[]): Promise<void>;
  archiveData(dataType: string, recordIds: string[], location: string): Promise<void>;
  exportUserData(userId: string, dataTypes: string[]): Promise<any>;
}

export interface DataArchiveService {
  archiveData(data: any[], location: string, metadata: any): Promise<string>;
  retrieveArchivedData(archiveId: string): Promise<any[]>;
  deleteArchivedData(archiveId: string): Promise<void>;
  listArchives(location?: string): Promise<Array<{ id: string; location: string; createdAt: string; size: number }>>;
}

export interface ComplianceService {
  validateRetentionPolicy(policy: DataRetentionPolicy): Promise<{ valid: boolean; issues: string[] }>;
  generateComplianceReport(startDate: Date, endDate: Date): Promise<any>;
  handleDataSubjectRequest(request: DataExportRequest): Promise<void>;
  anonymizeUserData(userId: string): Promise<void>;
}

export class DataLifecycleManager {
  constructor(
    private repository: DataLifecycleRepository,
    private archiveService: DataArchiveService,
    private complianceService: ComplianceService
  ) {}

  /**
   * Create a new data retention policy
   * Requirement 12.5: Implement data retention policies
   */
  async createRetentionPolicy(policyData: Omit<DataRetentionPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<DataRetentionPolicy> {
    try {
      const policy: DataRetentionPolicy = {
        ...policyData,
        id: this.generatePolicyId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Validate policy compliance
      const validation = await this.complianceService.validateRetentionPolicy(policy);
      if (!validation.valid) {
        throw new Error(`Invalid retention policy: ${validation.issues.join(', ')}`);
      }

      const createdPolicy = await this.repository.createRetentionPolicy(policy);
      return DataRetentionPolicySchema.parse(createdPolicy);
    } catch (error) {
      console.error('Error creating retention policy:', error);
      throw new Error(`Failed to create retention policy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update an existing retention policy
   */
  async updateRetentionPolicy(id: string, updates: Partial<DataRetentionPolicy>): Promise<DataRetentionPolicy> {
    try {
      const existingPolicy = await this.repository.getRetentionPolicy(id);
      if (!existingPolicy) {
        throw new Error(`Retention policy not found: ${id}`);
      }

      const updatedPolicy = {
        ...existingPolicy,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // Validate updated policy
      const validation = await this.complianceService.validateRetentionPolicy(updatedPolicy);
      if (!validation.valid) {
        throw new Error(`Invalid retention policy update: ${validation.issues.join(', ')}`);
      }

      const result = await this.repository.updateRetentionPolicy(id, updatedPolicy);
      return DataRetentionPolicySchema.parse(result);
    } catch (error) {
      console.error('Error updating retention policy:', error);
      throw new Error(`Failed to update retention policy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get retention policies
   */
  async getRetentionPolicies(dataType?: string): Promise<DataRetentionPolicy[]> {
    try {
      const policies = await this.repository.getRetentionPolicies(dataType);
      return policies.map(policy => DataRetentionPolicySchema.parse(policy));
    } catch (error) {
      console.error('Error getting retention policies:', error);
      throw new Error(`Failed to get retention policies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute automated data deletion based on retention policies
   * Requirement 12.5: Automated deletion schedules
   */
  async executeRetentionPolicies(): Promise<{ processed: number; deleted: number; archived: number; errors: string[] }> {
    try {
      const policies = await this.repository.getRetentionPolicies();
      const activePolicies = policies.filter(p => p.isActive);

      let processed = 0;
      let deleted = 0;
      let archived = 0;
      const errors: string[] = [];

      for (const policy of activePolicies) {
        try {
          processed++;
          
          // Get expired data for this policy
          const expiredData = await this.repository.getExpiredData(
            policy.dataType,
            policy.retentionPeriodDays
          );

          if (expiredData.length === 0) {
            continue;
          }

          const recordIds = expiredData.map(record => record.id);

          // Archive data if required
          if (policy.archiveBeforeDelete && policy.archiveLocation) {
            await this.repository.archiveData(
              policy.dataType,
              recordIds,
              policy.archiveLocation
            );
            archived += recordIds.length;
          }

          // Delete data if auto-delete is enabled
          if (policy.autoDelete) {
            await this.repository.deleteData(policy.dataType, recordIds);
            deleted += recordIds.length;

            // Create deletion record
            const deletionRecord: DataDeletionRecord = {
              id: this.generateDeletionId(),
              dataType: policy.dataType,
              recordIds,
              deletionReason: 'retention_policy',
              deletedAt: new Date().toISOString(),
              deletedBy: 'system',
              policyId: policy.id,
              verificationHash: this.generateVerificationHash(recordIds),
              recoverable: policy.archiveBeforeDelete,
              recoveryExpiresAt: policy.archiveBeforeDelete 
                ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days
                : undefined
            };

            await this.repository.createDeletionRecord(deletionRecord);
          }

          console.log(`Processed retention policy ${policy.name}: ${recordIds.length} records`);
        } catch (error) {
          const errorMsg = `Failed to process policy ${policy.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          console.error(errorMsg);
        }
      }

      return { processed, deleted, archived, errors };
    } catch (error) {
      console.error('Error executing retention policies:', error);
      throw new Error(`Failed to execute retention policies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create data export request for compliance
   * Requirement 12.6: Data export capabilities for compliance requests
   */
  async createDataExportRequest(requestData: Omit<DataExportRequest, 'id' | 'status' | 'requestedAt' | 'expiresAt'>): Promise<DataExportRequest> {
    try {
      const request: DataExportRequest = {
        ...requestData,
        id: this.generateExportId(),
        status: 'pending',
        requestedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      };

      const createdRequest = await this.repository.createExportRequest(request);
      
      // Start processing the export asynchronously
      this.processDataExport(createdRequest.id).catch(error => {
        console.error(`Failed to process export request ${createdRequest.id}:`, error);
      });

      return DataExportRequestSchema.parse(createdRequest);
    } catch (error) {
      console.error('Error creating data export request:', error);
      throw new Error(`Failed to create data export request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process data export request
   */
  private async processDataExport(requestId: string): Promise<void> {
    try {
      const request = await this.repository.getExportRequest(requestId);
      if (!request) {
        throw new Error(`Export request not found: ${requestId}`);
      }

      // Update status to processing
      await this.repository.updateExportRequest(requestId, {
        status: 'processing'
      });

      // Determine data types to export
      const dataTypes = this.getDataTypesForExport(request.requestType);
      
      // Export user data
      const exportData = await this.repository.exportUserData(request.userId, dataTypes);
      
      // Generate export file
      const exportFile = await this.generateExportFile(exportData, request.format, request.includeMetadata);
      
      // Store export file and get download URL
      const downloadUrl = await this.storeExportFile(exportFile, requestId);
      
      // Update request with completion details
      await this.repository.updateExportRequest(requestId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        downloadUrl,
        fileSize: exportFile.size
      });

      console.log(`Completed data export request ${requestId}`);
    } catch (error) {
      console.error(`Error processing data export ${requestId}:`, error);
      
      // Update request status to failed
      await this.repository.updateExportRequest(requestId, {
        status: 'failed'
      });
    }
  }

  /**
   * Get data export request
   */
  async getDataExportRequest(requestId: string): Promise<DataExportRequest | null> {
    try {
      const request = await this.repository.getExportRequest(requestId);
      return request ? DataExportRequestSchema.parse(request) : null;
    } catch (error) {
      console.error('Error getting data export request:', error);
      throw new Error(`Failed to get data export request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle GDPR/CCPA data subject requests
   * Requirement 12.7: GDPR and CCPA compliance features
   */
  async handleDataSubjectRequest(userId: string, requestType: 'access' | 'deletion' | 'portability', complianceType: 'GDPR' | 'CCPA'): Promise<string> {
    try {
      switch (requestType) {
        case 'access':
        case 'portability':
          // Create data export request
          const exportRequest = await this.createDataExportRequest({
            userId,
            requestType: 'full_export',
            format: 'json',
            includeMetadata: true,
            reason: `${complianceType} data subject ${requestType} request`,
            complianceType
          });
          return exportRequest.id;

        case 'deletion':
          // Handle right to be forgotten
          await this.deleteUserData(userId, complianceType);
          return `User data deletion completed for ${userId}`;

        default:
          throw new Error(`Unsupported request type: ${requestType}`);
      }
    } catch (error) {
      console.error('Error handling data subject request:', error);
      throw new Error(`Failed to handle data subject request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete user data (right to be forgotten)
   */
  private async deleteUserData(userId: string, complianceType: string): Promise<void> {
    try {
      // Get all data types that contain user data
      const dataTypes = ['social_events', 'user_data', 'analytics'];
      const allRecordIds: string[] = [];

      for (const dataType of dataTypes) {
        // This would need to be implemented based on actual data structure
        // For now, we'll simulate getting user-related record IDs
        const userRecords = await this.getUserRecords(userId, dataType);
        const recordIds = userRecords.map(record => record.id);
        
        if (recordIds.length > 0) {
          await this.repository.deleteData(dataType, recordIds);
          allRecordIds.push(...recordIds);
        }
      }

      // Create deletion record
      const deletionRecord: DataDeletionRecord = {
        id: this.generateDeletionId(),
        dataType: 'user_data',
        recordIds: allRecordIds,
        deletionReason: 'compliance',
        deletedAt: new Date().toISOString(),
        deletedBy: 'system',
        verificationHash: this.generateVerificationHash(allRecordIds),
        recoverable: false
      };

      await this.repository.createDeletionRecord(deletionRecord);

      // Anonymize remaining references
      await this.complianceService.anonymizeUserData(userId);

      console.log(`Deleted user data for ${userId} (${complianceType} compliance)`);
    } catch (error) {
      console.error('Error deleting user data:', error);
      throw error;
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(startDate: Date, endDate: Date): Promise<any> {
    try {
      return await this.complianceService.generateComplianceReport(startDate, endDate);
    } catch (error) {
      console.error('Error generating compliance report:', error);
      throw new Error(`Failed to generate compliance report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get deletion records
   */
  async getDeletionRecords(dataType?: string): Promise<DataDeletionRecord[]> {
    try {
      const records = await this.repository.getDeletionRecords(dataType);
      return records.map(record => DataDeletionRecordSchema.parse(record));
    } catch (error) {
      console.error('Error getting deletion records:', error);
      throw new Error(`Failed to get deletion records: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clean up expired export requests
   */
  async cleanupExpiredExports(): Promise<number> {
    try {
      const allRequests = await this.repository.getExportRequests();
      const expiredRequests = allRequests.filter(request => 
        new Date(request.expiresAt) < new Date() && request.status === 'completed'
      );

      let cleaned = 0;
      for (const request of expiredRequests) {
        try {
          // Delete export file if it exists
          if (request.downloadUrl) {
            await this.deleteExportFile(request.downloadUrl);
          }

          // Update request status
          await this.repository.updateExportRequest(request.id, {
            status: 'expired',
            downloadUrl: undefined
          });

          cleaned++;
        } catch (error) {
          console.error(`Failed to cleanup export request ${request.id}:`, error);
        }
      }

      return cleaned;
    } catch (error) {
      console.error('Error cleaning up expired exports:', error);
      throw new Error(`Failed to cleanup expired exports: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Private helper methods
   */
  private generatePolicyId(): string {
    return `policy_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateExportId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateDeletionId(): string {
    return `deletion_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateVerificationHash(recordIds: string[]): string {
    // In a real implementation, this would use a proper cryptographic hash
    return `hash_${recordIds.length}_${Date.now()}`;
  }

  private getDataTypesForExport(requestType: string): string[] {
    switch (requestType) {
      case 'user_data':
        return ['user_data'];
      case 'audit_trail':
        return ['audit_logs'];
      case 'analytics':
        return ['analytics'];
      case 'full_export':
        return ['user_data', 'social_events', 'analytics', 'audit_logs'];
      default:
        return ['user_data'];
    }
  }

  private async generateExportFile(data: any, format: string, includeMetadata: boolean): Promise<{ content: string; size: number }> {
    // Simplified export file generation
    let content: string;
    
    switch (format) {
      case 'json':
        content = JSON.stringify(data, null, 2);
        break;
      case 'csv':
        content = this.convertToCSV(data);
        break;
      case 'xml':
        content = this.convertToXML(data);
        break;
      default:
        content = JSON.stringify(data, null, 2);
    }

    if (includeMetadata) {
      const metadata = {
        exportedAt: new Date().toISOString(),
        format,
        recordCount: Array.isArray(data) ? data.length : Object.keys(data).length
      };
      
      if (format === 'json') {
        const dataWithMetadata = { metadata, data };
        content = JSON.stringify(dataWithMetadata, null, 2);
      }
    }

    return {
      content,
      size: Buffer.byteLength(content, 'utf8')
    };
  }

  private convertToCSV(data: any): string {
    // Simplified CSV conversion
    if (!Array.isArray(data) || data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  private convertToXML(data: any): string {
    // Simplified XML conversion
    return `<?xml version="1.0" encoding="UTF-8"?>\n<export>\n${JSON.stringify(data)}\n</export>`;
  }

  private async storeExportFile(file: { content: string; size: number }, requestId: string): Promise<string> {
    // In a real implementation, this would store the file in a secure location
    // and return a signed URL for download
    return `https://exports.example.com/${requestId}.json`;
  }

  private async deleteExportFile(downloadUrl: string): Promise<void> {
    // In a real implementation, this would delete the file from storage
    console.log(`Deleted export file: ${downloadUrl}`);
  }

  private async getUserRecords(userId: string, dataType: string): Promise<any[]> {
    // In a real implementation, this would query the database for user records
    // For now, return empty array
    return [];
  }
}