import { parse } from 'csv-parse/sync';
import crypto from 'crypto';

export interface CSVUserRow {
  user_login: string;
  user_email: string;
  source_user_id: string;
  user_registered: string;
  display_name: string;
  first_name: string;
  last_name: string;
  district: string;
  la_name: string;
  country: string;
  latitude: string;
  longitude: string;
  phone_number: string;
  stage_0?: string;
  stage_1?: string;
  stage_2?: string;
  stage_3?: string;
  stage_1_completed_date?: string;
  stage_2_completed_date?: string;
  stage_3_completed_date?: string;
  round?: string;
  [key: string]: string | undefined;
}

export interface SchoolInfo {
  name: string;
  district: string;
  country: string;
  latitude?: string;
  longitude?: string;
}

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

export class MigrationUtils {
  static parseCSV(csvContent: string): CSVUserRow[] {
    try {
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        relax_quotes: true,
        relax_column_count: true,
        trim: true,
      });
      return records as CSVUserRow[];
    } catch (error) {
      throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static validateUser(row: CSVUserRow): ValidationResult {
    if (!row.user_email) {
      return { isValid: false, reason: 'Missing email' };
    }

    if (row.user_email.endsWith('.invalid')) {
      return { isValid: false, reason: 'Invalid email (ends with .invalid)' };
    }

    // Strict mode: Only migrate users with stage_1 data (real users who started the program)
    if (!row.stage_1 || row.stage_1.trim() === '' || row.stage_1 === 'a:0:{}') {
      return { isValid: false, reason: 'No stage_1 data' };
    }

    return { isValid: true };
  }

  static extractSchoolInfo(row: CSVUserRow): SchoolInfo | null {
    try {
      const displayName = row.display_name || '';
      const parts = displayName.split(',').map(p => p.trim());

      if (parts.length < 2) {
        return null;
      }

      const schoolName = parts[1];
      const district = row.district || row.la_name || parts[2] || '';
      const country = this.extractCountry(row);

      return {
        name: schoolName,
        district,
        country,
        latitude: row.latitude,
        longitude: row.longitude,
      };
    } catch (error) {
      return null;
    }
  }

  static extractCountry(row: CSVUserRow): string {
    if (row.country) {
      const countryCode = row.country.trim().toUpperCase();
      
      if (countryCode === 'GB') return 'United Kingdom';
      if (countryCode === 'IE') return 'Ireland';
      if (countryCode === 'XI') return 'Northern Ireland';
      
      return countryCode;
    }

    const userLogin = row.user_login || '';
    if (userLogin.startsWith('xi-')) return 'Northern Ireland';
    if (userLogin.startsWith('ie-')) return 'Ireland';
    
    return 'United Kingdom';
  }

  static generateRandomPassword(length: number = 12): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    const randomBytes = crypto.randomBytes(length);
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += chars[randomBytes[i] % chars.length];
    }
    
    return password;
  }

  static normalizeSchoolName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/&amp;/g, '&')
      .trim();
  }

  static parseStageData(stageValue: string | undefined): boolean {
    if (!stageValue || stageValue.trim() === '') return false;
    if (stageValue === 'a:0:{}') return false;
    
    const trimmed = stageValue.trim();
    if (trimmed.length > 10) return true;
    
    return false;
  }

  static parseCompletionDate(dateValue: string | undefined): Date | null {
    if (!dateValue || dateValue.trim() === '') return null;
    
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return null;
      return date;
    } catch {
      return null;
    }
  }

  static mapStageToProgram(stageNumber: number): 'inspire' | 'investigate' | 'act' | null {
    switch (stageNumber) {
      case 1:
        return 'inspire';
      case 2:
        return 'investigate';
      case 3:
        return 'act';
      default:
        return null;
    }
  }

  static extractRound(row: CSVUserRow): number {
    if (row.round) {
      const roundNum = parseInt(row.round, 10);
      if (!isNaN(roundNum) && roundNum > 0) {
        return roundNum;
      }
    }
    return 1;
  }
}
