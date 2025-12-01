import { db } from './db';
import { users, schools, schoolUsers, sendgridSyncJobs } from '@shared/schema';
import { eq, isNull, isNotNull, and, asc, desc, or, lt, inArray, count } from 'drizzle-orm';
import { Client } from '@sendgrid/client';

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
  const sgContact: SendGridContactData = {
    email: contact.email.toLowerCase().trim(),
    first_name: contact.firstName || undefined,
    last_name: contact.lastName || undefined,
    country: contact.country || undefined,
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
      sgContact.custom_fields[customFieldIds['user_language']] = contact.preferredLanguage || 'en';
    }
    
    if (customFieldIds['school_name'] && contact.schoolName) {
      sgContact.custom_fields[customFieldIds['school_name']] = contact.schoolName;
    }
    
    if (customFieldIds['school_stage'] && contact.schoolStage) {
      sgContact.custom_fields[customFieldIds['school_stage']] = contact.schoolStage;
    }
    
    if (customFieldIds['user_role'] && contact.schoolRole) {
      sgContact.custom_fields[customFieldIds['user_role']] = contact.schoolRole;
    }
    
    if (customFieldIds['school_type'] && contact.schoolType) {
      sgContact.custom_fields[customFieldIds['school_type']] = contact.schoolType;
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
const MAX_RETRIES = 5;

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

        for (const user of userBatch) {
          processedContacts++;

          const email = user.email?.toLowerCase().trim();
          if (!email || email.length === 0 || !email.includes('@')) {
            skippedNoEmail++;
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

        if (contacts.length > 0) {
          let retryCount = 0;
          let batchSuccess = false;
          let lastError: any = null;

          while (retryCount < MAX_RETRIES && !batchSuccess) {
            try {
              const request = {
                url: '/v3/marketing/contacts' as '/v3/marketing/contacts',
                method: 'PUT' as const,
                body: { contacts }
              };

              const [response] = await sgClient.request(request);
              if (response.statusCode === 202) {
                syncedContacts += contacts.length;
                console.log(`[SendGrid Worker] Batch ${batchNumber}: Synced ${contacts.length} contacts`);
                batchSuccess = true;
              } else {
                retryCount++;
                lastError = { statusCode: response.statusCode, body: response.body };
                console.error(`[SendGrid Worker] Batch ${batchNumber}: Unexpected status ${response.statusCode}, retry ${retryCount}/${MAX_RETRIES}`);
                if (retryCount < MAX_RETRIES) {
                  const delay = 2000 * retryCount;
                  await new Promise(resolve => setTimeout(resolve, delay));
                }
              }
            } catch (error: any) {
              retryCount++;
              lastError = error.response?.body || error.message || error;
              console.error(`[SendGrid Worker] Batch ${batchNumber}: Error (attempt ${retryCount}/${MAX_RETRIES}) -`, lastError);
              if (retryCount < MAX_RETRIES) {
                const delay = 2000 * retryCount;
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
          }

          if (!batchSuccess) {
            failedBatches++;
            console.error(`[SendGrid Worker] Batch ${batchNumber}: Failed after ${MAX_RETRIES} retries`);
          } else if (syncedUserIds.length > 0) {
            // IMMEDIATELY update sendgridSyncedAt for this batch's users in a separate transaction
            // This ensures the update commits even if later batches fail
            try {
              await db
                .update(users)
                .set({ sendgridSyncedAt: new Date() })
                .where(inArray(users.id, syncedUserIds));
              console.log(`[SendGrid Worker] Batch ${batchNumber}: Marked ${syncedUserIds.length} users as synced in database`);
            } catch (dbError) {
              console.error(`[SendGrid Worker] Batch ${batchNumber}: Failed to update sendgridSyncedAt:`, dbError);
              // Don't fail the batch - the contacts were synced to SendGrid successfully
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
