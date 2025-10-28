import { db } from '../server/db';
import { users, schools, schoolUsers, migrationLogs } from '../shared/schema';
import { MigrationUtils, CSVUserRow, SchoolInfo } from './migration-utils';
import { nanoid } from 'nanoid';
import bcrypt from 'bcrypt';
import { eq, and } from 'drizzle-orm';

export interface MigrationOptions {
  dryRun: boolean;
  csvContent: string;
  performedBy?: string;
  testEmailMode?: boolean;
  testEmail?: string;
}

export interface MigrationResult {
  logId: string;
  totalRows: number;
  validRows: number;
  skippedRows: number;
  processedRows: number;
  failedRows: number;
  usersCreated: number;
  schoolsCreated: number;
  errors: Array<{ row: number; email: string; reason: string }>;
  userCredentials: Array<{ email: string; temporaryPassword: string; schoolName: string }>;
}

interface SchoolLookup {
  [key: string]: { id: string; userCount: number };
}

export class MigrationScript {
  private options: MigrationOptions;
  private schoolsMap: SchoolLookup = {};
  private result: MigrationResult;

  constructor(options: MigrationOptions) {
    this.options = options;
    this.result = {
      logId: nanoid(),
      totalRows: 0,
      validRows: 0,
      skippedRows: 0,
      processedRows: 0,
      failedRows: 0,
      usersCreated: 0,
      schoolsCreated: 0,
      errors: [],
      userCredentials: [],
    };
  }

  async run(): Promise<MigrationResult> {
    const logId = await this.createMigrationLog();
    this.result.logId = logId;

    try {
      await this.updateMigrationStatus(logId, 'processing');

      const rows = MigrationUtils.parseCSV(this.options.csvContent);
      this.result.totalRows = rows.length;

      console.log(`[Migration] Parsed ${rows.length} rows from CSV`);

      const validRows = this.filterValidRows(rows);
      this.result.validRows = validRows.length;
      this.result.skippedRows = rows.length - validRows.length;

      console.log(`[Migration] ${validRows.length} valid rows, ${this.result.skippedRows} skipped`);

      if (!this.options.dryRun) {
        await this.processRows(validRows);
      } else {
        console.log('[Migration] Dry run mode - no data will be written');
        this.result.processedRows = validRows.length;
      }

      await this.updateMigrationStatus(logId, 'completed');
      await this.saveMigrationReport(logId);

      return this.result;
    } catch (error) {
      await this.updateMigrationStatus(logId, 'failed');
      throw error;
    }
  }

  private filterValidRows(rows: CSVUserRow[]): CSVUserRow[] {
    const validRows: CSVUserRow[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const validation = MigrationUtils.validateUser(row);

      if (validation.isValid) {
        validRows.push(row);
      } else {
        this.result.errors.push({
          row: i + 2,
          email: row.user_email || 'N/A',
          reason: validation.reason || 'Unknown',
        });
      }
    }

    return validRows;
  }

  private async processRows(rows: CSVUserRow[]): Promise<void> {
    for (const row of rows) {
      try {
        await this.processUser(row);
        this.result.processedRows++;
      } catch (error) {
        this.result.failedRows++;
        this.result.errors.push({
          row: this.result.processedRows + 2,
          email: row.user_email,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  private async processUser(row: CSVUserRow): Promise<void> {
    const schoolInfo = MigrationUtils.extractSchoolInfo(row);
    if (!schoolInfo) {
      throw new Error('Failed to extract school information');
    }

    const schoolId = await this.getOrCreateSchool(schoolInfo, row);

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, row.user_email),
    });

    if (existingUser) {
      console.log(`[Migration] User already exists: ${row.user_email}`);
      return;
    }

    const userId = nanoid();
    const temporaryPassword = MigrationUtils.generateRandomPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const stage1Complete = MigrationUtils.parseStageData(row.stage_1);
    const stage2Complete = MigrationUtils.parseStageData(row.stage_2);
    const stage3Complete = MigrationUtils.parseStageData(row.stage_3);

    let currentStage: 'inspire' | 'investigate' | 'act' = 'inspire';
    if (stage3Complete) currentStage = 'act';
    else if (stage2Complete) currentStage = 'investigate';

    const hasEvidence = stage1Complete || stage2Complete || stage3Complete;

    await db.insert(users).values({
      id: userId,
      email: row.user_email,
      emailVerified: false,
      passwordHash,
      firstName: row.first_name || 'Team',
      lastName: row.last_name || schoolInfo.name,
      role: 'teacher',
      isMigrated: true,
      legacyUserId: row.source_user_id,
      needsEvidenceResubmission: hasEvidence,
      migratedAt: new Date(),
      hasSeenOnboarding: false,
    });

    this.result.usersCreated++;

    const schoolKey = this.getSchoolKey(schoolInfo);
    this.schoolsMap[schoolKey].userCount++;

    const isHeadTeacher = this.schoolsMap[schoolKey].userCount === 1;

    await db.insert(schoolUsers).values({
      id: nanoid(),
      schoolId,
      userId,
      role: isHeadTeacher ? 'head_teacher' : 'teacher',
      isVerified: true,
      verifiedAt: new Date(),
      verificationMethod: 'migration',
    });

    await this.updateSchoolProgress(schoolId, {
      stage1Complete,
      stage2Complete,
      stage3Complete,
      currentStage,
      round: MigrationUtils.extractRound(row),
    });

    this.result.userCredentials.push({
      email: row.user_email,
      temporaryPassword,
      schoolName: schoolInfo.name,
    });

    console.log(`[Migration] Created user: ${row.user_email} for school: ${schoolInfo.name}`);
  }

  private async getOrCreateSchool(schoolInfo: SchoolInfo, row: CSVUserRow): Promise<string> {
    const schoolKey = this.getSchoolKey(schoolInfo);

    if (this.schoolsMap[schoolKey]) {
      return this.schoolsMap[schoolKey].id;
    }

    const normalizedName = MigrationUtils.normalizeSchoolName(schoolInfo.name);

    const existing = await db.query.schools.findFirst({
      where: and(
        eq(schools.name, schoolInfo.name),
        eq(schools.legacyDistrict, schoolInfo.district),
        eq(schools.country, schoolInfo.country)
      ),
    });

    if (existing) {
      this.schoolsMap[schoolKey] = { id: existing.id, userCount: 0 };
      return existing.id;
    }

    const schoolId = nanoid();
    
    await db.insert(schools).values({
      id: schoolId,
      name: schoolInfo.name,
      country: schoolInfo.country,
      address: '',
      latitude: schoolInfo.latitude || null,
      longitude: schoolInfo.longitude || null,
      legacyDistrict: schoolInfo.district,
      isMigrated: true,
      migratedAt: new Date(),
      registrationCompleted: true,
      showOnMap: true,
    });

    this.schoolsMap[schoolKey] = { id: schoolId, userCount: 0 };
    this.result.schoolsCreated++;

    console.log(`[Migration] Created school: ${schoolInfo.name} (${schoolInfo.country})`);

    return schoolId;
  }

  private getSchoolKey(schoolInfo: SchoolInfo): string {
    const normalized = MigrationUtils.normalizeSchoolName(schoolInfo.name);
    const normalizedDistrict = (schoolInfo.district || '').toLowerCase().trim();
    return `${normalized}|${normalizedDistrict}|${schoolInfo.country}`;
  }

  private async updateSchoolProgress(
    schoolId: string,
    progress: {
      stage1Complete: boolean;
      stage2Complete: boolean;
      stage3Complete: boolean;
      currentStage: 'inspire' | 'investigate' | 'act';
      round: number;
    }
  ): Promise<void> {
    const existing = await db.query.schools.findFirst({
      where: eq(schools.id, schoolId),
    });

    if (!existing) return;

    const updates: any = {
      currentRound: Math.max(existing.currentRound || 1, progress.round),
    };

    if (progress.stage1Complete && !existing.inspireCompleted) {
      updates.inspireCompleted = true;
    }
    if (progress.stage2Complete && !existing.investigateCompleted) {
      updates.investigateCompleted = true;
    }
    if (progress.stage3Complete && !existing.actCompleted) {
      updates.actCompleted = true;
    }

    const currentStageOrder = { inspire: 1, investigate: 2, act: 3 };
    const existingStageOrder = currentStageOrder[existing.currentStage || 'inspire'];
    const newStageOrder = currentStageOrder[progress.currentStage];

    if (newStageOrder > existingStageOrder) {
      updates.currentStage = progress.currentStage;
    }

    if (Object.keys(updates).length > 0) {
      await db.update(schools).set(updates).where(eq(schools.id, schoolId));
    }
  }

  private async createMigrationLog(): Promise<string> {
    const logId = nanoid();

    await db.insert(migrationLogs).values({
      id: logId,
      status: 'pending',
      dryRun: this.options.dryRun,
      csvFileName: 'user-export_1761641883683.csv',
      performedBy: this.options.performedBy,
    });

    return logId;
  }

  private async updateMigrationStatus(
    logId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed'
  ): Promise<void> {
    const updates: any = { status };

    if (status === 'completed' || status === 'failed') {
      updates.completedAt = new Date();
    }

    await db.update(migrationLogs).set(updates).where(eq(migrationLogs.id, logId));
  }

  private async saveMigrationReport(logId: string): Promise<void> {
    await db.update(migrationLogs).set({
      totalRows: this.result.totalRows,
      validRows: this.result.validRows,
      skippedRows: this.result.skippedRows,
      processedRows: this.result.processedRows,
      failedRows: this.result.failedRows,
      usersCreated: this.result.usersCreated,
      schoolsCreated: this.result.schoolsCreated,
      errorLog: this.result.errors,
      reportData: {
        userCredentials: this.options.dryRun ? [] : this.result.userCredentials,
        summary: {
          totalRows: this.result.totalRows,
          validRows: this.result.validRows,
          skippedRows: this.result.skippedRows,
          usersCreated: this.result.usersCreated,
          schoolsCreated: this.result.schoolsCreated,
        },
      },
    }).where(eq(migrationLogs.id, logId));
  }
}
