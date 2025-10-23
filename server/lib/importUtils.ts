import * as XLSX from 'xlsx';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import bcrypt from 'bcrypt';

export interface ParsedFile {
  data: Record<string, any>[];
  headers: string[];
  rowCount: number;
}

export interface ValidationError {
  row: number;
  field: string;
  value: any;
  message: string;
}

export interface ImportResult {
  success: boolean;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errors: ValidationError[];
  data?: any[];
}

/**
 * Parse CSV or Excel file buffer and return structured data
 */
export function parseImportFile(buffer: Buffer, filename: string): ParsedFile {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('No sheets found in file');
    }
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with header row
    const data = XLSX.utils.sheet_to_json(worksheet, {
      raw: false, // Get formatted strings
      defval: '', // Default value for empty cells
    });
    
    if (data.length === 0) {
      throw new Error('No data found in file');
    }
    
    // Extract headers from first row
    const headers = Object.keys(data[0] as Record<string, any>);
    
    return {
      data: data as Record<string, any>[],
      headers,
      rowCount: data.length,
    };
  } catch (error) {
    throw new Error(`Failed to parse file ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Normalize column names (handle different naming conventions from WordPress exports)
 */
export function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Map imported data to our schema fields
 */
export function mapSchoolFields(row: Record<string, any>): Record<string, any> {
  const normalized: Record<string, string> = {};
  Object.keys(row).forEach(key => {
    normalized[normalizeColumnName(key)] = row[key];
  });
  
  return {
    name: normalized.school_name || normalized.name || '',
    type: mapSchoolType(normalized.school_type || normalized.type || ''),
    country: normalized.country || '',
    address: normalized.address || normalized.school_address || '',
    adminEmail: normalized.admin_email || normalized.email || '',
    postcode: normalized.postcode || normalized.postal_code || normalized.zip_code || '',
    zipCode: normalized.zip_code || normalized.zipcode || normalized.postal_code || '',
    primaryLanguage: normalized.primary_language || normalized.language || 'en',
    studentCount: parseIntSafe(normalized.student_count || normalized.students || ''),
    latitude: parseFloatSafe(normalized.latitude || normalized.lat || ''),
    longitude: parseFloatSafe(normalized.longitude || normalized.lng || normalized.lon || ''),
  };
}

/**
 * Map imported user data to our schema fields
 */
export function mapUserFields(row: Record<string, any>): Record<string, any> {
  const normalized: Record<string, string> = {};
  Object.keys(row).forEach(key => {
    normalized[normalizeColumnName(key)] = row[key];
  });
  
  return {
    email: (normalized.email || normalized.user_email || '').toLowerCase().trim(),
    firstName: normalized.first_name || normalized.firstname || '',
    lastName: normalized.last_name || normalized.lastname || '',
    role: normalized.role || 'teacher',
    preferredLanguage: normalized.preferred_language || normalized.language || 'en',
  };
}

/**
 * Map school-user relationship data
 */
export function mapRelationshipFields(row: Record<string, any>): Record<string, any> {
  const normalized: Record<string, string> = {};
  Object.keys(row).forEach(key => {
    normalized[normalizeColumnName(key)] = row[key];
  });
  
  return {
    schoolName: normalized.school_name || normalized.school || '',
    schoolCountry: normalized.school_country || normalized.country || '',
    userEmail: (normalized.user_email || normalized.email || '').toLowerCase().trim(),
    role: mapTeacherRole(normalized.role || normalized.teacher_role || ''),
    teacherRole: normalized.teacher_role || normalized.position || '',
    isVerified: normalized.verified === 'true' || normalized.verified === '1' || normalized.is_verified === 'true',
  };
}

/**
 * Map school type from various formats
 */
function mapSchoolType(type: string): string {
  const normalized = type.toLowerCase().trim();
  const typeMap: Record<string, string> = {
    'primary': 'primary',
    'elementary': 'primary',
    'secondary': 'secondary',
    'middle': 'secondary',
    'high': 'high_school',
    'highschool': 'high_school',
    'high_school': 'high_school',
    'international': 'international',
  };
  
  return typeMap[normalized] || 'other';
}

/**
 * Map teacher role from various formats
 */
function mapTeacherRole(role: string): string {
  const normalized = role.toLowerCase().trim();
  if (normalized.includes('head') || normalized.includes('principal') || normalized.includes('director')) {
    return 'head_teacher';
  }
  return 'teacher';
}

/**
 * Safe integer parsing
 */
function parseIntSafe(value: string | number): number | null {
  if (typeof value === 'number') return Math.floor(value);
  const parsed = parseInt(String(value).replace(/[^0-9-]/g, ''), 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Safe float parsing
 */
function parseFloatSafe(value: string | number): number | null {
  if (typeof value === 'number') return value;
  const parsed = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  return isNaN(parsed) ? null : parsed;
}

/**
 * Validate school data
 */
export function validateSchoolData(data: Record<string, any>, rowIndex: number): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!data.name || data.name.trim() === '') {
    errors.push({
      row: rowIndex,
      field: 'name',
      value: data.name,
      message: 'School name is required',
    });
  }
  
  if (!data.country || data.country.trim() === '') {
    errors.push({
      row: rowIndex,
      field: 'country',
      value: data.country,
      message: 'Country is required',
    });
  }
  
  if (data.email && !isValidEmail(data.email)) {
    errors.push({
      row: rowIndex,
      field: 'email',
      value: data.email,
      message: 'Invalid email format',
    });
  }
  
  return errors;
}

/**
 * Validate user data
 */
export function validateUserData(data: Record<string, any>, rowIndex: number): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!data.email || data.email.trim() === '') {
    errors.push({
      row: rowIndex,
      field: 'email',
      value: data.email,
      message: 'Email is required',
    });
  } else if (!isValidEmail(data.email)) {
    errors.push({
      row: rowIndex,
      field: 'email',
      value: data.email,
      message: 'Invalid email format',
    });
  }
  
  if (!data.firstName || data.firstName.trim() === '') {
    errors.push({
      row: rowIndex,
      field: 'firstName',
      value: data.firstName,
      message: 'First name is required',
    });
  }
  
  if (!data.lastName || data.lastName.trim() === '') {
    errors.push({
      row: rowIndex,
      field: 'lastName',
      value: data.lastName,
      message: 'Last name is required',
    });
  }
  
  return errors;
}

/**
 * Validate relationship data
 */
export function validateRelationshipData(data: Record<string, any>, rowIndex: number): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!data.schoolName || data.schoolName.trim() === '') {
    errors.push({
      row: rowIndex,
      field: 'schoolName',
      value: data.schoolName,
      message: 'School name is required',
    });
  }
  
  if (!data.userEmail || data.userEmail.trim() === '') {
    errors.push({
      row: rowIndex,
      field: 'userEmail',
      value: data.userEmail,
      message: 'User email is required',
    });
  } else if (!isValidEmail(data.userEmail)) {
    errors.push({
      row: rowIndex,
      field: 'userEmail',
      value: data.userEmail,
      message: 'Invalid email format',
    });
  }
  
  return errors;
}

/**
 * Email validation helper
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate a temporary password for new users
 */
export function generateTemporaryPassword(): string {
  // Generate a secure 12-character password
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Hash a password for storage
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Create a user ID from email
 */
export function createUserIdFromEmail(email: string): string {
  // Create a deterministic ID from email for deduplication
  const cleaned = email.toLowerCase().trim();
  return `user_${cleaned.replace(/[^a-z0-9]/g, '_')}`;
}

/**
 * Sanitize data for preview (remove sensitive info)
 */
export function sanitizeForPreview(data: Record<string, any>[]): Record<string, any>[] {
  return data.map(row => {
    const sanitized = { ...row };
    // Remove any password-like fields
    delete sanitized.password;
    delete sanitized.passwordHash;
    delete sanitized.password_hash;
    return sanitized;
  });
}

/**
 * Generate CSV template content for download
 */
export function generateSchoolTemplate(): string {
  const headers = [
    'school_name',
    'school_type',
    'country',
    'address',
    'admin_email',
    'postcode',
    'primary_language',
    'student_count',
    'latitude',
    'longitude'
  ];
  
  const example = [
    'Example Primary School',
    'primary',
    'United Kingdom',
    '123 School Road, London',
    'admin@exampleschool.com',
    'SW1A 1AA',
    'en',
    '250',
    '51.5074',
    '-0.1278'
  ];
  
  return `${headers.join(',')}\n${example.join(',')}\n`;
}

export function generateUserTemplate(): string {
  const headers = [
    'email',
    'first_name',
    'last_name',
    'role',
    'preferred_language'
  ];
  
  const example = [
    'teacher@example.com',
    'Jane',
    'Smith',
    'teacher',
    'en'
  ];
  
  return `${headers.join(',')}\n${example.join(',')}\n`;
}

export function generateRelationshipTemplate(): string {
  const headers = [
    'school_name',
    'school_country',
    'user_email',
    'role',
    'teacher_role',
    'verified'
  ];
  
  const example = [
    'Example Primary School',
    'United Kingdom',
    'teacher@example.com',
    'teacher',
    'Science Teacher',
    'true'
  ];
  
  return `${headers.join(',')}\n${example.join(',')}\n`;
}
