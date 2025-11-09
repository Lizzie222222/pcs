# Schools Module

This directory contains all school-related code extracted from the monolithic `routes.ts` and `storage.ts` files.

## Structure

- **routes.ts** - All school-related API endpoints (public and admin)
- **storage.ts** - All school-related database operations  
- **types.ts** - School-specific TypeScript types and validation schemas
- **utils/** - Shared utilities for schools module
  - **countryMapping.ts** - Country code normalization and lookups

## Purpose

This extraction improves:
- **AI Editability**: Smaller, focused files are easier for AI to work with
- **Maintainability**: Related code is grouped together
- **Performance**: Faster file parsing and LSP operations
- **Testing**: Isolated modules are easier to test

## Backward Compatibility

All original imports continue to work through re-exports:
- `server/routes.ts` imports and mounts the schools router
- `server/storage.ts` delegates to SchoolStorage class
- `server/countryMapping.ts` re-exports from utils/countryMapping.ts

## Migration Strategy

The extraction was done incrementally:
1. ✅ Create folder structure
2. ⏳ Extract types and utilities
3. ⏳ Extract storage layer
4. ⏳ Extract routes
5. ⏳ Test thoroughly
6. ⏳ Update documentation

## Dependencies

**Internal:**
- Evidence system (progression checks)
- Audit system (quiz completion)
- User system (SchoolUser relationships)
- Certificate system (award processing)

**External:**
- Database (Neon PostgreSQL via Drizzle)
- Email (SendGrid)
- Mailchimp (automation)
- GCS (photo consent storage)
