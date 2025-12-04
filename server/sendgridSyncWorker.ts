import { db } from './db';
import { users, schools, schoolUsers, sendgridSyncJobs } from '@shared/schema';
import { eq, isNull, isNotNull, and, asc, desc, or, lt, inArray, count } from 'drizzle-orm';
import { Client } from '@sendgrid/client';
import { normalizeCountryName } from './features/schools/utils/countryMapping';

const sgClient = new Client();
if (process.env.SENDGRID_API_KEY) {
  sgClient.setApiKey(process.env.SENDGRID_API_KEY);
}

interface SendGridContactData {
  email: string;
  first_name?: string;
  last_name?: string;
  city?: string;
  country?: string;
  custom_fields?: Record<string, string | number>;
}

interface EnrichedContactData {
  email: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  hasInteracted?: boolean;
  schoolName?: string;
  schoolStage?: string;
  schoolRole?: string;
  schoolType?: string;
  preferredLanguage?: string;
  inspireCompleted?: boolean;
  investigateCompleted?: boolean;
  actCompleted?: boolean;
  roundsCompleted?: number;
  isMigrated?: boolean;
  lastActiveAt?: Date | null;
  schoolLastActiveAt?: Date | null;
}

interface UserWithSchool {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  hasInteracted: boolean | null;
  preferredLanguage: string | null;
  lastActiveAt: Date | null;
  isMigrated: boolean | null;
  schoolName?: string | null;
  schoolCountry?: string | null;
  schoolStage?: string | null;
  schoolRole?: string | null;
  schoolType?: string | null;
  inspireCompleted?: boolean | null;
  investigateCompleted?: boolean | null;
  actCompleted?: boolean | null;
  roundsCompleted?: number | null;
  schoolLastActiveAt?: Date | null;
}

let cachedCustomFieldIds: Record<string, string> | null = null;
let customFieldIdsCacheTime: number = 0;
const CUSTOM_FIELD_CACHE_TTL = 60 * 60 * 1000;

async function getSendGridCustomFieldIds(): Promise<Record<string, string>> {
  if (cachedCustomFieldIds && (Date.now() - customFieldIdsCacheTime) < CUSTOM_FIELD_CACHE_TTL) {
    return cachedCustomFieldIds;
  }

  if (!process.env.SENDGRID_API_KEY) {
    return {};
  }

  try {
    const request = {
      url: '/v3/marketing/field_definitions' as '/v3/marketing/field_definitions',
      method: 'GET' as const,
    };

    const [response] = await sgClient.request(request);
    const body = response.body as any;
    
    const fieldMap: Record<string, string> = {};
    if (body.custom_fields) {
      for (const field of body.custom_fields) {
        fieldMap[field.name] = field.id;
      }
    }
    
    cachedCustomFieldIds = fieldMap;
    customFieldIdsCacheTime = Date.now();
    console.log('[SendGrid Worker] Cached custom field IDs:', Object.keys(fieldMap).join(', '));
    
    return fieldMap;
  } catch (error) {
    console.error('[SendGrid Worker] Error fetching custom field definitions:', error);
    return cachedCustomFieldIds || {};
  }
}

async function ensureSendGridCustomFields(): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    return false;
  }

  const fieldsToCreate = [
    { name: 'has_interacted', field_type: 'Text' },
    { name: 'school_name', field_type: 'Text' },
    { name: 'school_stage', field_type: 'Text' },
    { name: 'user_role', field_type: 'Text' },
    { name: 'is_active', field_type: 'Text' },
    { name: 'user_language', field_type: 'Text' },
    { name: 'school_type', field_type: 'Text' },
    { name: 'inspire_completed', field_type: 'Text' },
    { name: 'investigate_completed', field_type: 'Text' },
    { name: 'act_completed', field_type: 'Text' },
    { name: 'rounds_completed', field_type: 'Number' },
    { name: 'is_migrated', field_type: 'Text' },
  ];

  const existingFields = await getSendGridCustomFieldIds();
  
  for (const field of fieldsToCreate) {
    if (existingFields[field.name]) {
      continue;
    }

    try {
      const request = {
        url: '/v3/marketing/field_definitions' as '/v3/marketing/field_definitions',
        method: 'POST' as const,
        body: field,
      };

      await sgClient.request(request);
      console.log(`[SendGrid Worker] Created custom field: ${field.name}`);
    } catch (error: any) {
      if (error.response?.body?.errors?.[0]?.message?.includes('already exists')) {
        console.log(`[SendGrid Worker] Custom field '${field.name}' already exists`);
      } else {
        console.error(`[SendGrid Worker] Error creating field '${field.name}':`, error.response?.body || error);
      }
    }
  }

  cachedCustomFieldIds = null;
  return true;
}

/**
 * Sanitizes a string for SendGrid API compatibility.
 * - Normalizes Unicode characters (preserves valid international characters)
 * - Removes only control characters that could break JSON/API
 * - Trims and limits length
 * 
 * Note: SendGrid supports UTF-8, so we preserve valid Unicode.
 * We only remove characters that could cause API/JSON encoding issues.
 */
function sanitizeForSendGrid(value: string | null | undefined, maxLength: number = 255): string | undefined {
  if (!value) return undefined;
  
  try {
    // Normalize unicode (NFC form for consistency)
    let sanitized = value.normalize('NFC');
    
    // Remove only control characters that break JSON/API (NULL, etc.)
    // Keep tabs and newlines as they're valid in text
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Remove only UNPAIRED surrogates (invalid UTF-16)
    // This regex matches lone high surrogates not followed by low surrogates,
    // or lone low surrogates not preceded by high surrogates
    sanitized = sanitized.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Limit length (but don't cut in middle of a surrogate pair)
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
      // If we cut in the middle of a surrogate pair, remove the orphaned high surrogate
      if (sanitized.charCodeAt(sanitized.length - 1) >= 0xD800 && 
          sanitized.charCodeAt(sanitized.length - 1) <= 0xDBFF) {
        sanitized = sanitized.substring(0, sanitized.length - 1);
      }
    }
    
    return sanitized.length > 0 ? sanitized : undefined;
  } catch (error) {
    console.error('[SendGrid Worker] Error sanitizing string:', value, error);
    // If normalization fails, just trim and return
    return value.trim() || undefined;
  }
}

/**
 * Validates an email address for SendGrid compatibility
 */
function isValidSendGridEmail(email: string): boolean {
  if (!email || email.length === 0) return false;
  if (email.length > 254) return false; // RFC 5321 limit
  
  // Basic email regex - SendGrid is fairly lenient but we want to catch obvious issues
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;
  
  // Check for problematic characters that can break JSON/API
  if (/[\x00-\x1F\x7F]/.test(email)) return false;
  
  return true;
}

function determineActiveStatus(contact: EnrichedContactData): string {
  if (contact.hasInteracted) {
    return 'yes';
  }
  
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  
  if (contact.lastActiveAt && new Date(contact.lastActiveAt) > ninetyDaysAgo) {
    return 'yes';
  }
  
  if (contact.schoolLastActiveAt && new Date(contact.schoolLastActiveAt) > ninetyDaysAgo) {
    return 'yes';
  }
  
  return 'no';
}

function buildSendGridContactWithCustomFields(
  contact: EnrichedContactData, 
  customFieldIds: Record<string, string>
): SendGridContactData {
  // Sanitize all string fields to prevent API failures from bad data
  const sgContact: SendGridContactData = {
    email: contact.email.toLowerCase().trim(),
    first_name: sanitizeForSendGrid(contact.firstName, 50),
    last_name: sanitizeForSendGrid(contact.lastName, 50),
    country: sanitizeForSendGrid(normalizeCountryName(contact.country || null) || contact.country, 50),
  };

  if (Object.keys(customFieldIds).length > 0) {
    sgContact.custom_fields = {};
    
    if (customFieldIds['has_interacted']) {
      sgContact.custom_fields[customFieldIds['has_interacted']] = contact.hasInteracted ? 'yes' : 'no';
    }
    
    if (customFieldIds['is_active']) {
      sgContact.custom_fields[customFieldIds['is_active']] = determineActiveStatus(contact);
    }
    
    if (customFieldIds['user_language']) {
      sgContact.custom_fields[customFieldIds['user_language']] = sanitizeForSendGrid(contact.preferredLanguage, 10) || 'en';
    }
    
    // Sanitize school name - this is a common source of encoding issues
    const sanitizedSchoolName = sanitizeForSendGrid(contact.schoolName, 200);
    if (customFieldIds['school_name'] && sanitizedSchoolName) {
      sgContact.custom_fields[customFieldIds['school_name']] = sanitizedSchoolName;
    }
    
    if (customFieldIds['school_stage'] && contact.schoolStage) {
      sgContact.custom_fields[customFieldIds['school_stage']] = sanitizeForSendGrid(contact.schoolStage, 50) || '';
    }
    
    if (customFieldIds['user_role'] && contact.schoolRole) {
      sgContact.custom_fields[customFieldIds['user_role']] = sanitizeForSendGrid(contact.schoolRole, 50) || '';
    }
    
    if (customFieldIds['school_type'] && contact.schoolType) {
      sgContact.custom_fields[customFieldIds['school_type']] = sanitizeForSendGrid(contact.schoolType, 50) || '';
    }
    
    if (customFieldIds['inspire_completed']) {
      sgContact.custom_fields[customFieldIds['inspire_completed']] = contact.inspireCompleted ? 'yes' : 'no';
    }
    
    if (customFieldIds['investigate_completed']) {
      sgContact.custom_fields[customFieldIds['investigate_completed']] = contact.investigateCompleted ? 'yes' : 'no';
    }
    
    if (customFieldIds['act_completed']) {
      sgContact.custom_fields[customFieldIds['act_completed']] = contact.actCompleted ? 'yes' : 'no';
    }
    
    if (customFieldIds['rounds_completed']) {
      sgContact.custom_fields[customFieldIds['rounds_completed']] = contact.roundsCompleted || 0;
    }
    
    if (customFieldIds['is_migrated']) {
      sgContact.custom_fields[customFieldIds['is_migrated']] = contact.isMigrated ? 'yes' : 'no';
    }
  }

  return sgContact;
}

const BATCH_SIZE = 250;
const DELAY_BETWEEN_BATCHES_MS = 1000;
const SYNC_THRESHOLD_HOURS = 24;
const MAX_RETRIES = 3; // Reduced since we now have bisection fallback
const MAX_BISECTION_DEPTH = 8; // Allows isolating down to single contacts

interface BisectionResult {
  syncedCount: number;
  failedContacts: Array<{ email: string; error: string; payload: any }>;
}

/**
 * Attempts to sync a batch of contacts to SendGrid.
 * On failure, recursively bisects the batch to isolate problematic contacts
 * and sync the good ones.
 */
async function syncBatchWithBisection(
  contacts: SendGridContactData[],
  batchLabel: string,
  depth: number = 0
): Promise<BisectionResult> {
  const result: BisectionResult = { syncedCount: 0, failedContacts: [] };
  
  if (contacts.length === 0) {
    return result;
  }
  
  // If we've reached a single contact and it fails, log it and give up on that contact
  if (contacts.length === 1 && depth > 0) {
    try {
      const request = {
        url: '/v3/marketing/contacts' as '/v3/marketing/contacts',
        method: 'PUT' as const,
        body: { contacts }
      };
      const [response] = await sgClient.request(request);
      if (response.statusCode === 202) {
        result.syncedCount = 1;
        console.log(`[SendGrid Worker] ${batchLabel}: Single contact sync succeeded for ${contacts[0].email}`);
      } else {
        result.failedContacts.push({
          email: contacts[0].email,
          error: `Unexpected status: ${response.statusCode}`,
          payload: contacts[0]
        });
        console.error(`[SendGrid Worker] ${batchLabel}: Single contact FAILED - ${contacts[0].email}`, {
          status: response.statusCode,
          payload: JSON.stringify(contacts[0])
        });
      }
    } catch (error: any) {
      const errorMsg = error.response?.body?.errors?.[0]?.message || error.message || 'Unknown error';
      result.failedContacts.push({
        email: contacts[0].email,
        error: errorMsg,
        payload: contacts[0]
      });
      console.error(`[SendGrid Worker] ${batchLabel}: Single contact FAILED - ${contacts[0].email}`, {
        error: errorMsg,
        fullError: JSON.stringify(error.response?.body || error.message),
        payload: JSON.stringify(contacts[0])
      });
    }
    return result;
  }
  
  // Try to sync the entire batch
  try {
    const request = {
      url: '/v3/marketing/contacts' as '/v3/marketing/contacts',
      method: 'PUT' as const,
      body: { contacts }
    };
    const [response] = await sgClient.request(request);
    if (response.statusCode === 202) {
      result.syncedCount = contacts.length;
      if (depth > 0) {
        console.log(`[SendGrid Worker] ${batchLabel}: Bisected batch of ${contacts.length} synced successfully`);
      }
      return result;
    }
    // Non-202 status, fall through to bisection
    console.log(`[SendGrid Worker] ${batchLabel}: Got status ${response.statusCode}, will bisect`);
  } catch (error: any) {
    const errorMsg = error.response?.body?.errors?.[0]?.message || error.message || 'Unknown error';
    console.log(`[SendGrid Worker] ${batchLabel}: Batch of ${contacts.length} failed with: ${errorMsg}, will bisect (depth ${depth})`);
    
    // Log specific error details from SendGrid if available
    if (error.response?.body?.errors) {
      console.log(`[SendGrid Worker] ${batchLabel}: SendGrid errors:`, JSON.stringify(error.response.body.errors));
    }
  }
  
  // Check bisection depth limit
  if (depth >= MAX_BISECTION_DEPTH) {
    console.error(`[SendGrid Worker] ${batchLabel}: Max bisection depth reached, failing ${contacts.length} contacts`);
    for (const contact of contacts) {
      result.failedContacts.push({
        email: contact.email,
        error: 'Max bisection depth reached',
        payload: contact
      });
    }
    return result;
  }
  
  // Bisect: split in half and try each half
  const midpoint = Math.floor(contacts.length / 2);
  const firstHalf = contacts.slice(0, midpoint);
  const secondHalf = contacts.slice(midpoint);
  
  console.log(`[SendGrid Worker] ${batchLabel}: Bisecting ${contacts.length} contacts into ${firstHalf.length} + ${secondHalf.length}`);
  
  // Add small delay between bisected requests
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const firstResult = await syncBatchWithBisection(firstHalf, `${batchLabel}.1`, depth + 1);
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const secondResult = await syncBatchWithBisection(secondHalf, `${batchLabel}.2`, depth + 1);
  
  result.syncedCount = firstResult.syncedCount + secondResult.syncedCount;
  result.failedContacts = [...firstResult.failedContacts, ...secondResult.failedContacts];
  
  return result;
}

class SendGridSyncQueue {
  private isProcessing = false;
  private processingJobId: string | null = null;

  async startJob(jobId: string): Promise<void> {
    if (this.isProcessing) {
      console.log(`[SendGrid Worker] Already processing job ${this.processingJobId}, skipping ${jobId}`);
      return;
    }

    this.isProcessing = true;
    this.processingJobId = jobId;

    setImmediate(() => {
      this.processJob(jobId).catch(error => {
        console.error(`[SendGrid Worker] Fatal error processing job ${jobId}:`, error);
        this.markJobFailed(jobId, error.message || 'Unknown error');
      }).finally(() => {
        this.isProcessing = false;
        this.processingJobId = null;
      });
    });
  }

  private async processJob(jobId: string): Promise<void> {
    console.log(`[SendGrid Worker] Starting job ${jobId}`);

    const job = await db
      .select()
      .from(sendgridSyncJobs)
      .where(eq(sendgridSyncJobs.id, jobId))
      .limit(1);

    if (job.length === 0) {
      console.error(`[SendGrid Worker] Job ${jobId} not found`);
      return;
    }

    const jobData = job[0];
    const forceSync = jobData.mode === 'full';

    if (!process.env.SENDGRID_API_KEY) {
      await this.markJobFailed(jobId, 'SendGrid API key not configured');
      return;
    }

    await db
      .update(sendgridSyncJobs)
      .set({ 
        status: 'processing',
        lastProgressAt: new Date()
      })
      .where(eq(sendgridSyncJobs.id, jobId));

    try {
      console.log('[SendGrid Worker] Ensuring custom fields exist...');
      await ensureSendGridCustomFields();
      await new Promise(resolve => setTimeout(resolve, 1000));

      const customFieldIds = await getSendGridCustomFieldIds();
      console.log('[SendGrid Worker] Custom field IDs:', Object.keys(customFieldIds).join(', '));

      const syncThreshold = new Date(Date.now() - SYNC_THRESHOLD_HOURS * 60 * 60 * 1000);
      
      const baseCondition = and(
        isNotNull(users.email),
        isNull(users.deletedAt)
      );
      
      const whereCondition = forceSync 
        ? baseCondition 
        : and(
            baseCondition,
            or(
              isNull(users.sendgridSyncedAt),
              lt(users.sendgridSyncedAt, syncThreshold)
            )
          );

      const eligibleResult = await db
        .select({ totalEligible: count() })
        .from(users)
        .where(baseCondition);
      
      const toSyncResult = await db
        .select({ totalToSync: count() })
        .from(users)
        .where(whereCondition);
      
      const totalEligibleCount = Number(eligibleResult[0]?.totalEligible ?? 0);
      const totalUsers = Number(toSyncResult[0]?.totalToSync ?? 0);
      const skippedAlreadySynced = Math.max(0, totalEligibleCount - totalUsers);
      const totalBatches = totalUsers === 0 ? 0 : Math.ceil(totalUsers / BATCH_SIZE);

      console.log(`[SendGrid Worker] Mode: ${forceSync ? 'FULL' : 'INCREMENTAL'}`);
      console.log(`[SendGrid Worker] Total eligible users: ${totalEligibleCount}`);
      console.log(`[SendGrid Worker] Users to sync: ${totalUsers}`);
      console.log(`[SendGrid Worker] Already synced (skipped): ${skippedAlreadySynced}`);

      if (totalUsers === 0) {
        await db
          .update(sendgridSyncJobs)
          .set({ 
            status: 'completed',
            totalContacts: 0,
            skippedAlreadySynced,
            totalBatches: 0,
            processedContacts: 0,
            syncedContacts: 0,
            completedAt: new Date(),
            lastProgressAt: new Date()
          })
          .where(eq(sendgridSyncJobs.id, jobId));
        console.log('[SendGrid Worker] No users need syncing. Job complete!');
        return;
      }

      const allUserIdsToSync = await db
        .select({ id: users.id })
        .from(users)
        .where(whereCondition)
        .orderBy(asc(users.id));
      
      const userIdList = allUserIdsToSync.map(u => u.id);
      
      await db
        .update(sendgridSyncJobs)
        .set({ 
          totalContacts: totalUsers,
          skippedAlreadySynced,
          totalBatches,
          lastProgressAt: new Date()
        })
        .where(eq(sendgridSyncJobs.id, jobId));

      let batchNumber = 1;
      let processedContacts = 0;
      let syncedContacts = 0;
      let skippedNoEmail = 0;
      let failedBatches = 0;

      for (let batchStart = 0; batchStart < userIdList.length; batchStart += BATCH_SIZE) {
        const batchUserIds = userIdList.slice(batchStart, batchStart + BATCH_SIZE);
        console.log(`[SendGrid Worker] Processing batch ${batchNumber}/${totalBatches} (${batchStart + 1} to ${Math.min(batchStart + BATCH_SIZE, userIdList.length)})...`);

        const userBatch = await db
          .select({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            hasInteracted: users.hasInteracted,
            preferredLanguage: users.preferredLanguage,
            lastActiveAt: users.lastActiveAt,
            isMigrated: users.isMigrated,
          })
          .from(users)
          .where(inArray(users.id, batchUserIds))
          .orderBy(asc(users.id));

        const userIds = userBatch.map(u => u.id);

        const schoolAssociations = userIds.length > 0 ? await db
          .select({
            userId: schoolUsers.userId,
            schoolName: schools.name,
            schoolCountry: schools.country,
            schoolStage: schools.currentStage,
            schoolRole: schoolUsers.role,
            schoolType: schools.type,
            inspireCompleted: schools.inspireCompleted,
            investigateCompleted: schools.investigateCompleted,
            actCompleted: schools.actCompleted,
            roundsCompleted: schools.roundsCompleted,
            schoolLastActiveAt: schools.lastActiveAt,
          })
          .from(schoolUsers)
          .innerJoin(schools, eq(schoolUsers.schoolId, schools.id))
          .where(inArray(schoolUsers.userId, userIds)) : [];

        const schoolMap = new Map<string, typeof schoolAssociations[0]>();
        for (const assoc of schoolAssociations) {
          if (!schoolMap.has(assoc.userId)) {
            schoolMap.set(assoc.userId, assoc);
          }
        }

        const contacts: SendGridContactData[] = [];
        const syncedUserIds: string[] = [];
        const skippedInBatch: string[] = []; // Track skipped emails for logging

        for (const user of userBatch) {
          processedContacts++;

          const email = user.email?.toLowerCase().trim();
          
          // Use stricter email validation to prevent batch failures
          if (!email || !isValidSendGridEmail(email)) {
            skippedNoEmail++;
            skippedInBatch.push(email || '(empty)');
            continue;
          }

          syncedUserIds.push(user.id);
          const schoolData = schoolMap.get(user.id);

          const enrichedContact: EnrichedContactData = {
            email,
            firstName: user.firstName || undefined,
            lastName: user.lastName || undefined,
            country: schoolData?.schoolCountry || undefined,
            hasInteracted: user.hasInteracted || false,
            schoolName: schoolData?.schoolName || undefined,
            schoolStage: schoolData?.schoolStage || undefined,
            schoolRole: schoolData?.schoolRole || undefined,
            schoolType: schoolData?.schoolType || undefined,
            preferredLanguage: user.preferredLanguage || 'en',
            inspireCompleted: schoolData?.inspireCompleted || false,
            investigateCompleted: schoolData?.investigateCompleted || false,
            actCompleted: schoolData?.actCompleted || false,
            roundsCompleted: schoolData?.roundsCompleted || 0,
            isMigrated: user.isMigrated || false,
            lastActiveAt: user.lastActiveAt,
            schoolLastActiveAt: schoolData?.schoolLastActiveAt || null,
          };

          contacts.push(buildSendGridContactWithCustomFields(enrichedContact, customFieldIds));
        }

        // Log skipped emails if any
        if (skippedInBatch.length > 0) {
          console.log(`[SendGrid Worker] Batch ${batchNumber}: Skipped ${skippedInBatch.length} invalid emails: ${skippedInBatch.slice(0, 5).join(', ')}${skippedInBatch.length > 5 ? '...' : ''}`);
        }

        if (contacts.length > 0) {
          // Use bisection approach: if batch fails, split and retry to isolate bad contacts
          console.log(`[SendGrid Worker] Batch ${batchNumber}: Attempting to sync ${contacts.length} contacts...`);
          
          const bisectionResult = await syncBatchWithBisection(contacts, `Batch${batchNumber}`, 0);
          
          // Update counters based on bisection results
          syncedContacts += bisectionResult.syncedCount;
          
          if (bisectionResult.failedContacts.length > 0) {
            // Log all failed contacts with details
            console.error(`[SendGrid Worker] Batch ${batchNumber}: ${bisectionResult.failedContacts.length} contacts failed:`);
            for (const failed of bisectionResult.failedContacts) {
              console.error(`  - ${failed.email}: ${failed.error}`);
              console.error(`    Payload: ${JSON.stringify(failed.payload)}`);
            }
            
            // Store failed contact details in job for visibility
            try {
              await db
                .update(sendgridSyncJobs)
                .set({ 
                  errorDetails: { 
                    batch: batchNumber, 
                    failedContacts: bisectionResult.failedContacts.map(f => ({
                      email: f.email,
                      error: f.error,
                      // Store the full payload - this contains all the data that was sent
                      // including first_name, last_name, country, and custom_fields with their IDs
                      payload: f.payload
                    })),
                    timestamp: new Date().toISOString()
                  }
                })
                .where(eq(sendgridSyncJobs.id, jobId));
            } catch (e) {
              console.error('[SendGrid Worker] Failed to store error details');
            }
            
            // Only count as failed batch if we couldn't sync ANY contacts
            if (bisectionResult.syncedCount === 0) {
              failedBatches++;
            }
          }
          
          // Log success summary
          if (bisectionResult.syncedCount > 0) {
            console.log(`[SendGrid Worker] Batch ${batchNumber}: Successfully synced ${bisectionResult.syncedCount}/${contacts.length} contacts`);
          }
          
          // Update sendgridSyncedAt for successfully synced users
          // We need to figure out which users succeeded - for now, update all if any succeeded
          // (the bisection isolates failures, so most should have synced)
          if (bisectionResult.syncedCount > 0 && syncedUserIds.length > 0) {
            // Build list of failed emails for exclusion
            const failedEmails = new Set(bisectionResult.failedContacts.map(f => f.email.toLowerCase()));
            
            // Filter syncedUserIds to only include those whose emails weren't in failedContacts
            // We need to match by email since that's what we have from bisection
            const contactEmailToUserId = new Map<string, string>();
            for (let i = 0; i < contacts.length; i++) {
              contactEmailToUserId.set(contacts[i].email.toLowerCase(), syncedUserIds[i]);
            }
            
            const successfulUserIds = syncedUserIds.filter((userId, index) => {
              const email = contacts[index]?.email.toLowerCase();
              return email && !failedEmails.has(email);
            });
            
            if (successfulUserIds.length > 0) {
              try {
                await db
                  .update(users)
                  .set({ sendgridSyncedAt: new Date() })
                  .where(inArray(users.id, successfulUserIds));
                console.log(`[SendGrid Worker] Batch ${batchNumber}: Marked ${successfulUserIds.length} users as synced in database`);
              } catch (dbError) {
                console.error(`[SendGrid Worker] Batch ${batchNumber}: Failed to update sendgridSyncedAt:`, dbError);
              }
            }
          }
        }

        // Update job progress (separate from user updates)
        try {
          await db
            .update(sendgridSyncJobs)
            .set({ 
              currentBatch: batchNumber,
              processedContacts,
              syncedContacts,
              skippedNoEmail,
              failedBatches,
              lastProgressAt: new Date()
            })
            .where(eq(sendgridSyncJobs.id, jobId));
        } catch (progressError) {
          console.error(`[SendGrid Worker] Failed to update job progress:`, progressError);
        }

        batchNumber++;

        if (batchStart + BATCH_SIZE < userIdList.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
        }
      }

      const expectedProcessed = syncedContacts + skippedNoEmail;
      const countsMatch = expectedProcessed === processedContacts && processedContacts === totalUsers;
      const jobSucceeded = failedBatches === 0 && countsMatch;

      let errorMessage: string | null = null;
      if (failedBatches > 0) {
        errorMessage = `Completed with ${failedBatches} failed batches`;
      } else if (!countsMatch) {
        errorMessage = `Count mismatch: processed ${processedContacts}, expected ${totalUsers}`;
      }

      await db
        .update(sendgridSyncJobs)
        .set({ 
          status: jobSucceeded ? 'completed' : 'failed',
          processedContacts,
          syncedContacts,
          skippedNoEmail,
          failedBatches,
          completedAt: new Date(),
          lastProgressAt: new Date(),
          errorMessage
        })
        .where(eq(sendgridSyncJobs.id, jobId));

      console.log(`[SendGrid Worker] Job ${jobSucceeded ? 'completed' : 'failed'}!`);
      console.log(`  Total contacts: ${totalUsers}`);
      console.log(`  Synced: ${syncedContacts}`);
      console.log(`  Skipped (already synced): ${skippedAlreadySynced}`);
      console.log(`  Skipped (no email): ${skippedNoEmail}`);
      console.log(`  Failed batches: ${failedBatches}`);
      if (errorMessage) {
        console.log(`  Error: ${errorMessage}`);
      }

    } catch (error: any) {
      console.error(`[SendGrid Worker] Error processing job ${jobId}:`, error);
      await this.markJobFailed(jobId, error.message || 'Unknown error');
    }
  }

  private async markJobFailed(jobId: string, errorMessage: string): Promise<void> {
    await db
      .update(sendgridSyncJobs)
      .set({ 
        status: 'failed',
        errorMessage,
        completedAt: new Date(),
        lastProgressAt: new Date()
      })
      .where(eq(sendgridSyncJobs.id, jobId));
  }

  isJobRunning(): boolean {
    return this.isProcessing;
  }

  getCurrentJobId(): string | null {
    return this.processingJobId;
  }
}

export const sendgridSyncQueue = new SendGridSyncQueue();

export async function createSendGridSyncJob(mode: 'incremental' | 'full', triggeredBy: string): Promise<string> {
  console.log(`[SendGrid Worker] createSendGridSyncJob called with mode: ${mode}, triggeredBy: ${triggeredBy}`);
  
  try {
    const existingRunning = await db
      .select()
      .from(sendgridSyncJobs)
      .where(eq(sendgridSyncJobs.status, 'processing'))
      .limit(1);

    console.log(`[SendGrid Worker] Existing running jobs: ${existingRunning.length}`);

    if (existingRunning.length > 0) {
      throw new Error('A sync job is already running. Please wait for it to complete.');
    }

    console.log('[SendGrid Worker] Inserting new job into database...');
    const [job] = await db
      .insert(sendgridSyncJobs)
      .values({
        mode,
        triggeredBy,
        status: 'pending',
      })
      .returning();

    if (!job || !job.id) {
      throw new Error('Failed to create sync job - no job returned from database insert');
    }

    console.log(`[SendGrid Worker] Created sync job ${job.id} (mode: ${mode})`);

    // Verify the job was persisted
    const verifyJob = await db
      .select()
      .from(sendgridSyncJobs)
      .where(eq(sendgridSyncJobs.id, job.id))
      .limit(1);
    
    if (verifyJob.length === 0) {
      throw new Error(`Job ${job.id} was not persisted to database`);
    }
    
    console.log(`[SendGrid Worker] Verified job ${job.id} exists in database`);

    sendgridSyncQueue.startJob(job.id);

    return job.id;
  } catch (error: any) {
    console.error('[SendGrid Worker] Error in createSendGridSyncJob:', error);
    throw error;
  }
}

export async function getSendGridSyncJobStatus(jobId: string) {
  const job = await db
    .select()
    .from(sendgridSyncJobs)
    .where(eq(sendgridSyncJobs.id, jobId))
    .limit(1);

  return job[0] || null;
}

export async function getLatestSendGridSyncJob() {
  const jobs = await db
    .select()
    .from(sendgridSyncJobs)
    .orderBy(desc(sendgridSyncJobs.startedAt))
    .limit(1);

  return jobs[0] || null;
}

export async function getActiveOrLatestJob() {
  const activeJob = await db
    .select()
    .from(sendgridSyncJobs)
    .where(or(
      eq(sendgridSyncJobs.status, 'processing'),
      eq(sendgridSyncJobs.status, 'pending')
    ))
    .orderBy(desc(sendgridSyncJobs.startedAt))
    .limit(1);

  if (activeJob.length > 0) {
    return { job: activeJob[0], isActive: true };
  }

  const latestJob = await getLatestSendGridSyncJob();
  return { job: latestJob, isActive: false };
}
