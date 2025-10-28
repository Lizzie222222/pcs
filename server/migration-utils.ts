import { parse } from 'csv-parse/sync';
import crypto from 'crypto';

export interface CSVUserRow {
  user_email: string;
  user_url?: string;
  user_registered?: string;
  role?: string;
  school_name?: string;
  district?: string;
  phone_number?: string;
  stage_1?: string;
  stage_2?: string;
  stage_3?: string;
  country?: string;
  school_type?: string;
  // Legacy fields for backward compatibility
  user_login?: string;
  source_user_id?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  la_name?: string;
  latitude?: string;
  longitude?: string;
  stage_0?: string;
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
  type?: string;
  website?: string;
  phoneNumber?: string;
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

    // New CSV format check: Accept users who have school_name (confirmed users)
    if (row.school_name && row.school_name.trim() !== '') {
      return { isValid: true };
    }

    // Legacy check: Accept users who have ANY engagement markers
    const hasStage1 = row.stage_1 && row.stage_1.trim() !== '' && row.stage_1 !== 'a:0:{}';
    const hasStage2 = row.stage_2 && row.stage_2.trim() !== '' && row.stage_2 !== 'a:0:{}';
    const hasStage3 = row.stage_3 && row.stage_3.trim() !== '' && row.stage_3 !== 'a:0:{}';
    const hasStage0 = row.stage_0 && row.stage_0.trim() !== '' && row.stage_0 !== 'a:0:{}';
    const hasCompletionDate = row.stage_1_completed_date || row.stage_2_completed_date || row.stage_3_completed_date;
    const hasRound = row.round && row.round.trim() !== '';
    const hasPhoneNumber = row.phone_number && row.phone_number.trim() !== '';
    
    const isRealUser = hasStage1 || hasStage2 || hasStage3 || hasStage0 || hasCompletionDate || hasRound || hasPhoneNumber;
    
    if (!isRealUser) {
      return { isValid: false, reason: 'No engagement markers (no school_name, stage data, completion dates, round, or phone)' };
    }

    return { isValid: true };
  }

  static extractSchoolInfo(row: CSVUserRow): SchoolInfo | null {
    try {
      // New CSV format: school_name field directly available
      if (row.school_name && row.school_name.trim() !== '') {
        const district = row.district || '';
        const country = this.extractCountry(row);
        
        return {
          name: row.school_name.trim(),
          district: district.trim(),
          country,
          type: row.school_type,
          website: row.user_url,
          phoneNumber: row.phone_number,
          latitude: row.latitude,
          longitude: row.longitude,
        };
      }

      // Legacy format: extract from display_name
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

  static extractNameFromEmail(email: string): { firstName: string; lastName: string } {
    const localPart = email.split('@')[0];
    
    // Handle common patterns: firstname.lastname, firstname_lastname, firstnamelastname
    const parts = localPart.split(/[._-]/);
    
    if (parts.length >= 2) {
      const firstName = this.capitalize(parts[0]);
      const lastName = this.capitalize(parts[parts.length - 1]);
      return { firstName, lastName };
    }
    
    // Single word: use as first name, leave last name empty
    return { 
      firstName: this.capitalize(localPart), 
      lastName: '' 
    };
  }

  static capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
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
    
    // Handle numeric format (e.g., "1", "2", "3")
    if (/^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      return num > 0;
    }
    
    // Handle PHP serialized format (e.g., "a:1:{i:0;s:1:\"1\";}")
    if (trimmed.startsWith('a:') && trimmed.includes('{')) {
      // Check if it contains any actual data (not empty)
      return trimmed !== 'a:0:{}' && trimmed.length > 10;
    }
    
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

  static mapSchoolType(type: string | undefined): 'primary' | 'secondary' | 'high_school' | 'international' | 'other' | null {
    if (!type) return null;
    
    const normalized = type.toLowerCase().trim();
    
    if (normalized === 'primary' || normalized === 'nursery') return 'primary';
    if (normalized === 'secondary' || normalized === 'middle') return 'secondary';
    if (normalized === 'high_school' || normalized === 'high') return 'high_school';
    if (normalized === 'international') return 'international';
    if (normalized === 'all-through') return 'other';
    
    return 'other';
  }

  static mapUserRole(role: string | undefined): 'head_teacher' | 'teacher' {
    if (!role) return 'teacher';
    
    const normalized = role.toLowerCase().trim();
    
    if (normalized.includes('head') || normalized === 'head teacher' || normalized === 'headteacher') {
      return 'head_teacher';
    }
    
    return 'teacher';
  }
}
