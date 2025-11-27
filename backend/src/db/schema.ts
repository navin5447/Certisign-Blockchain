import { pgTable, varchar, text, timestamp, uuid, integer, boolean, jsonb, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table - Admin users and system users
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('admin'), // admin, super_admin
  walletAddress: varchar('wallet_address', { length: 42 }), // Ethereum address
  isActive: boolean('is_active').notNull().default(true),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Institutions table - Educational institutions
export const institutions = pgTable('institutions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull().unique(), // Institution code like "MIT", "HARVARD"
  email: varchar('email', { length: 255 }).notNull(),
  website: varchar('website', { length: 255 }),
  address: text('address'),
  logo: varchar('logo', { length: 500 }), // IPFS CID or URL
  walletAddress: varchar('wallet_address', { length: 42 }), // Institution's wallet
  isVerified: boolean('is_verified').notNull().default(false),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Certificates table - Individual certificates
export const certificates = pgTable('certificates', {
  id: uuid('id').primaryKey().defaultRandom(),
  tokenId: varchar('token_id', { length: 100 }).unique(), // NFT token ID
  studentName: varchar('student_name', { length: 255 }).notNull(),
  studentEmail: varchar('student_email', { length: 255 }).notNull(),
  rollNumber: varchar('roll_number', { length: 100 }).notNull(),
  course: varchar('course', { length: 255 }).notNull(),
  specialization: varchar('specialization', { length: 255 }),
  grade: varchar('grade', { length: 50 }),
  cgpa: decimal('cgpa', { precision: 4, scale: 2 }),
  issueDate: timestamp('issue_date').notNull(),
  graduationDate: timestamp('graduation_date').notNull(),
  institutionId: uuid('institution_id').notNull().references(() => institutions.id),
  
  // IPFS and blockchain data
  metadataIpfsCid: varchar('metadata_ipfs_cid', { length: 100 }), // JSON metadata CID
  pdfIpfsCid: varchar('pdf_ipfs_cid', { length: 100 }), // PDF file CID
  txHash: varchar('tx_hash', { length: 66 }), // Blockchain transaction hash
  blockNumber: integer('block_number'),
  
  // Status and verification
  status: varchar('status', { length: 50 }).notNull().default('draft'), // draft, pending, issued, revoked
  isRevoked: boolean('is_revoked').notNull().default(false),
  revokedAt: timestamp('revoked_at'),
  revokedBy: uuid('revoked_by').references(() => users.id),
  revokedReason: text('revoked_reason'),
  
  // Additional metadata
  metadata: jsonb('metadata'), // Additional certificate data
  verificationCode: varchar('verification_code', { length: 50 }).unique(), // Unique verification code
  
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Events table - System events and audit log
export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 100 }).notNull(), // certificate_issued, certificate_revoked, login, etc.
  entityType: varchar('entity_type', { length: 50 }).notNull(), // certificate, user, institution
  entityId: uuid('entity_id').notNull(),
  userId: uuid('user_id').references(() => users.id),
  
  // Event data
  data: jsonb('data'), // Event-specific data
  description: text('description'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// IPFS Pins table - Track IPFS pinning status
export const ipfsPins = pgTable('ipfs_pins', {
  id: uuid('id').primaryKey().defaultRandom(),
  cid: varchar('cid', { length: 100 }).notNull().unique(),
  type: varchar('type', { length: 50 }).notNull(), // metadata, pdf, image
  entityType: varchar('entity_type', { length: 50 }).notNull(), // certificate, institution
  entityId: uuid('entity_id').notNull(),
  
  // Pinning status
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, pinned, failed
  pinataResponse: jsonb('pinata_response'), // Full Pinata API response
  retryCount: integer('retry_count').notNull().default(0),
  lastRetryAt: timestamp('last_retry_at'),
  errorMessage: text('error_message'),
  
  // File information
  fileName: varchar('file_name', { length: 255 }),
  fileSize: integer('file_size'), // Size in bytes
  mimeType: varchar('mime_type', { length: 100 }),
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Batch Operations table - Track batch certificate operations
export const batchOperations = pgTable('batch_operations', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: varchar('type', { length: 50 }).notNull(), // csv_import, bulk_revoke
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, processing, completed, failed
  
  // Operation details
  totalRecords: integer('total_records').notNull().default(0),
  processedRecords: integer('processed_records').notNull().default(0),
  successfulRecords: integer('successful_records').notNull().default(0),
  failedRecords: integer('failed_records').notNull().default(0),
  
  // Data and results
  inputData: jsonb('input_data'), // Original input data
  results: jsonb('results'), // Processing results
  errorLog: jsonb('error_log'), // Errors encountered
  
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  createdInstitutions: many(institutions),
  createdCertificates: many(certificates),
  events: many(events),
  batchOperations: many(batchOperations),
}));

export const institutionsRelations = relations(institutions, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [institutions.createdBy],
    references: [users.id],
  }),
  certificates: many(certificates),
}));

export const certificatesRelations = relations(certificates, ({ one }) => ({
  institution: one(institutions, {
    fields: [certificates.institutionId],
    references: [institutions.id],
  }),
  createdBy: one(users, {
    fields: [certificates.createdBy],
    references: [users.id],
  }),
  revokedBy: one(users, {
    fields: [certificates.revokedBy],
    references: [users.id],
  }),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  user: one(users, {
    fields: [events.userId],
    references: [users.id],
  }),
}));

export const batchOperationsRelations = relations(batchOperations, ({ one }) => ({
  createdBy: one(users, {
    fields: [batchOperations.createdBy],
    references: [users.id],
  }),
}));

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Institution = typeof institutions.$inferSelect;
export type NewInstitution = typeof institutions.$inferInsert;
export type Certificate = typeof certificates.$inferSelect;
export type NewCertificate = typeof certificates.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type IpfsPin = typeof ipfsPins.$inferSelect;
export type NewIpfsPin = typeof ipfsPins.$inferInsert;
export type BatchOperation = typeof batchOperations.$inferSelect;
export type NewBatchOperation = typeof batchOperations.$inferInsert;
