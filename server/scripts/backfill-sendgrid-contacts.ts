import { db } from '../db';
import { users, schools, schoolUsers } from '@shared/schema';
import { eq, isNull, isNotNull, and, asc } from 'drizzle-orm';
import { Client } from '@sendgrid/client';

const sgClient = new Client();
if (process.env.SENDGRID_API_KEY) {
  sgClient.setApiKey(process.env.SENDGRID_API_KEY);
}

interface SendGridContactData {
  email: string;
  first_name?: string;
  last_name?: string;
  country?: string;
  custom_fields?: Record<string, string>;
}

interface BackfillStats {
  totalUsers: number;
  processedUsers: number;
  syncedContacts: number;
  skippedNoEmail: number;
  failedBatches: number;
  startTime: Date;
}

const BATCH_SIZE = 1000;
const DELAY_BETWEEN_BATCHES_MS = 500;

async function getCustomFieldIds(): Promise<Record<string, string> | null> {
  if (!process.env.SENDGRID_API_KEY) {
    return null;
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
    
    return fieldMap;
  } catch (error) {
    console.error('[SendGrid] Error fetching custom field definitions:', error);
    return null;
  }
}

async function createCustomFields(): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    return false;
  }

  const fieldsToCreate = [
    { name: 'has_interacted', field_type: 'text' },
    { name: 'school_name', field_type: 'text' },
    { name: 'school_stage', field_type: 'text' },
    { name: 'user_role', field_type: 'text' },
  ];

  const existingFields = await getCustomFieldIds();
  
  for (const field of fieldsToCreate) {
    if (existingFields && existingFields[field.name]) {
      console.log(`[SendGrid] Custom field '${field.name}' already exists (ID: ${existingFields[field.name]})`);
      continue;
    }

    try {
      const request = {
        url: '/v3/marketing/field_definitions' as '/v3/marketing/field_definitions',
        method: 'POST' as const,
        body: field,
      };

      await sgClient.request(request);
      console.log(`[SendGrid] Created custom field: ${field.name}`);
    } catch (error: any) {
      if (error.response?.body?.errors?.[0]?.message?.includes('already exists')) {
        console.log(`[SendGrid] Custom field '${field.name}' already exists`);
      } else {
        console.error(`[SendGrid] Error creating field '${field.name}':`, error.response?.body || error);
      }
    }
  }

  return true;
}

async function syncContactsBatch(contacts: SendGridContactData[]): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY || contacts.length === 0) {
    return true;
  }

  try {
    const request = {
      url: '/v3/marketing/contacts' as '/v3/marketing/contacts',
      method: 'PUT' as const,
      body: {
        contacts
      }
    };

    const [response] = await sgClient.request(request);
    return response.statusCode === 202;
  } catch (error: any) {
    console.error('[SendGrid] Error syncing batch:', error.response?.body || error);
    return false;
  }
}

async function fetchUsersWithSchoolInfo(offset: number, limit: number) {
  const userResults = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      hasInteracted: users.hasInteracted,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(and(
      isNotNull(users.email),
      isNull(users.deletedAt)
    ))
    .orderBy(asc(users.id))
    .limit(limit)
    .offset(offset);

  const enrichedUsers = [];

  for (const user of userResults) {
    const schoolAssociation = await db
      .select({
        schoolName: schools.name,
        schoolCountry: schools.country,
        schoolStage: schools.currentStage,
        schoolRole: schoolUsers.role,
      })
      .from(schoolUsers)
      .innerJoin(schools, eq(schoolUsers.schoolId, schools.id))
      .where(eq(schoolUsers.userId, user.id))
      .limit(1);

    enrichedUsers.push({
      ...user,
      schoolName: schoolAssociation[0]?.schoolName || null,
      schoolCountry: schoolAssociation[0]?.schoolCountry || null,
      schoolStage: schoolAssociation[0]?.schoolStage || null,
      schoolRole: schoolAssociation[0]?.schoolRole || null,
    });
  }

  return enrichedUsers;
}

async function countTotalUsers(): Promise<number> {
  const result = await db
    .select({ id: users.id })
    .from(users)
    .where(and(
      isNotNull(users.email),
      isNull(users.deletedAt)
    ));
  
  return result.length;
}

async function runBackfill(dryRun: boolean = false) {
  console.log('='.repeat(60));
  console.log('[SendGrid Backfill] Starting contact sync...');
  console.log(`[SendGrid Backfill] Mode: ${dryRun ? 'DRY RUN (no API calls)' : 'LIVE'}`);
  console.log('='.repeat(60));

  if (!process.env.SENDGRID_API_KEY) {
    console.error('[SendGrid Backfill] ERROR: SENDGRID_API_KEY not set');
    process.exit(1);
  }

  console.log('[SendGrid Backfill] Setting up custom fields...');
  if (!dryRun) {
    await createCustomFields();
  }

  const customFieldIds = await getCustomFieldIds();
  console.log('[SendGrid Backfill] Custom field IDs:', customFieldIds);

  const requiredFields = ['has_interacted', 'school_name', 'school_stage', 'user_role'];
  const missingFields = requiredFields.filter(f => !customFieldIds || !customFieldIds[f]);
  
  if (missingFields.length > 0 && !dryRun) {
    console.warn(`[SendGrid Backfill] WARNING: Missing custom fields: ${missingFields.join(', ')}`);
    console.warn('[SendGrid Backfill] Contacts will be synced without these segmentation fields.');
    console.warn('[SendGrid Backfill] To fix: Create the fields manually in SendGrid or check API key permissions.');
  }

  const stats: BackfillStats = {
    totalUsers: await countTotalUsers(),
    processedUsers: 0,
    syncedContacts: 0,
    skippedNoEmail: 0,
    failedBatches: 0,
    startTime: new Date(),
  };

  console.log(`[SendGrid Backfill] Total users to process: ${stats.totalUsers}`);

  let offset = 0;
  let batchNumber = 1;

  while (offset < stats.totalUsers) {
    console.log(`\n[Batch ${batchNumber}] Processing users ${offset + 1} to ${Math.min(offset + BATCH_SIZE, stats.totalUsers)}...`);

    const userBatch = await fetchUsersWithSchoolInfo(offset, BATCH_SIZE);
    
    const contacts: SendGridContactData[] = [];

    for (const user of userBatch) {
      stats.processedUsers++;

      if (!user.email) {
        stats.skippedNoEmail++;
        continue;
      }

      const contact: SendGridContactData = {
        email: user.email.toLowerCase().trim(),
        first_name: user.firstName || undefined,
        last_name: user.lastName || undefined,
        country: user.schoolCountry || undefined,
      };

      if (customFieldIds) {
        contact.custom_fields = {};
        
        if (customFieldIds['has_interacted']) {
          contact.custom_fields[customFieldIds['has_interacted']] = user.hasInteracted ? 'yes' : 'no';
        }
        if (customFieldIds['school_name'] && user.schoolName) {
          contact.custom_fields[customFieldIds['school_name']] = user.schoolName;
        }
        if (customFieldIds['school_stage'] && user.schoolStage) {
          contact.custom_fields[customFieldIds['school_stage']] = user.schoolStage;
        }
        if (customFieldIds['user_role'] && user.schoolRole) {
          contact.custom_fields[customFieldIds['user_role']] = user.schoolRole;
        }
      }

      contacts.push(contact);
    }

    if (contacts.length > 0) {
      if (dryRun) {
        console.log(`[Batch ${batchNumber}] Would sync ${contacts.length} contacts`);
        console.log(`[Batch ${batchNumber}] Sample:`, JSON.stringify(contacts[0], null, 2));
        stats.syncedContacts += contacts.length;
      } else {
        const success = await syncContactsBatch(contacts);
        if (success) {
          stats.syncedContacts += contacts.length;
          console.log(`[Batch ${batchNumber}] Successfully queued ${contacts.length} contacts`);
        } else {
          stats.failedBatches++;
          console.error(`[Batch ${batchNumber}] FAILED to sync ${contacts.length} contacts`);
        }
      }
    }

    offset += BATCH_SIZE;
    batchNumber++;

    if (!dryRun && offset < stats.totalUsers) {
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
    }

    const elapsed = (Date.now() - stats.startTime.getTime()) / 1000;
    const rate = stats.processedUsers / elapsed;
    const remaining = (stats.totalUsers - stats.processedUsers) / rate;
    console.log(`[Progress] ${stats.processedUsers}/${stats.totalUsers} (${(stats.processedUsers/stats.totalUsers*100).toFixed(1)}%) - ETA: ${Math.ceil(remaining)}s`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('[SendGrid Backfill] COMPLETE');
  console.log('='.repeat(60));
  console.log(`Total users processed: ${stats.processedUsers}`);
  console.log(`Contacts synced: ${stats.syncedContacts}`);
  console.log(`Skipped (no email): ${stats.skippedNoEmail}`);
  console.log(`Failed batches: ${stats.failedBatches}`);
  console.log(`Duration: ${((Date.now() - stats.startTime.getTime()) / 1000).toFixed(1)}s`);
  console.log('='.repeat(60));

  if (stats.failedBatches > 0) {
    console.log('\n[WARNING] Some batches failed. You may want to re-run the script.');
    process.exit(1);
  }
}

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

runBackfill(isDryRun)
  .then(() => {
    console.log('\n[SendGrid Backfill] Script finished successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n[SendGrid Backfill] Script failed with error:', error);
    process.exit(1);
  });
