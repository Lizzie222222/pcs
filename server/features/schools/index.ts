/**
 * Schools Module Exports
 * 
 * This module handles all school-related functionality including:
 * - School CRUD operations
 * - School user management
 * - Progression tracking and stage advancement
 * - Photo consent workflows
 * - Country/stats aggregations
 */

// Export progression delegate for use by other modules (e.g., Evidence)
export { createSchoolProgressionDelegate } from './progression';
export type { SchoolProgressionDelegate, ProgressionTrigger } from './progression';

// Export storage for direct use
export { SchoolStorage, schoolStorage } from './storage';

// Note: Routes are mounted in server/routes.ts
// Future: May export routes from here as well for better encapsulation
