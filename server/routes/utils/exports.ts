import * as XLSX from 'xlsx';

/**
 * @description Generates CSV formatted string from array of objects with proper escaping for special characters (quotes, commas, newlines). Used for analytics and data exports.
 * @param {any[]} data - Array of objects to convert to CSV
 * @param {string} type - Type of export ('schools', 'evidence', 'users', 'analytics')
 * @returns {string} CSV formatted string with headers and escaped values
 */
export function generateCSV(data: any[], type: string): string {
  if (data.length === 0) return '';

  const headers = getCSVHeaders(type);
  const csvRows = [headers.join(',')];
  
  data.forEach(item => {
    const row = headers.map(header => {
      const value = item[header];
      if (value === null || value === undefined) return '';
      
      let stringValue = String(value);
      if (typeof value === 'object') {
        stringValue = JSON.stringify(value);
      }
      
      // Escape CSV special characters: quotes, commas, newlines
      if (stringValue.includes('"') || stringValue.includes(',') || 
          stringValue.includes('\n') || stringValue.includes('\r')) {
        stringValue = `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    });
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

/**
 * @description Returns appropriate CSV headers based on export type. Maps entity types to their relevant column names.
 * @param {string} type - Export type ('schools', 'evidence', 'users', 'analytics')
 * @returns {string[]} Array of header column names
 */
export function getCSVHeaders(type: string): string[] {
  switch (type) {
    case 'schools':
      return ['id', 'name', 'type', 'country', 'address', 'studentCount', 'currentStage', 'progressPercentage', 'createdAt'];
    case 'evidence':
      return ['id', 'title', 'description', 'stage', 'status', 'schoolId', 'submittedBy', 'submittedAt', 'reviewedBy', 'reviewedAt'];
    case 'users':
      return ['id', 'email', 'firstName', 'lastName', 'role', 'isAdmin', 'createdAt'];
    case 'analytics':
      return ['category', 'metric', 'value'];
    default:
      return [];
  }
}

/**
 * @description Generates Excel (.xlsx) file buffer from data using XLSX library. Creates workbook with single sheet containing data.
 * @param {any[]} data - Array of objects to convert to Excel
 * @param {string} type - Type of export for sheet naming
 * @returns {Buffer} Excel file buffer ready for download
 */
export function generateExcel(data: any[], type: string): Buffer {
  const headers = getCSVHeaders(type);
  const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, type.charAt(0).toUpperCase() + type.slice(1));
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * @description Generates user-friendly title from filename by removing extension, replacing special characters with spaces, and capitalizing words.
 * @param {string} filename - Original filename to convert
 * @returns {string} Formatted title suitable for display
 */
export function generateTitleFromFilename(filename: string): string {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  return nameWithoutExt
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
