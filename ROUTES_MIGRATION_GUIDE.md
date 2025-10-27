# Routes.ts Migration Guide

## Overview
This guide documents the strategy for migrating the monolithic `server/routes.ts` (9,500+ lines) into maintainable domain-specific route files.

## Completed Work

### ✅ Phase 1: Fix LSP Errors
All 10 LSP errors have been fixed:
- Fixed missing `createUserWithOAuth` method (replaced with `upsertUser`)
- Added null checks for user variables
- Removed duplicate `status` property in event duplication
- Fixed type casting for `youtubeVideos`, `eventPackFiles`, and `testimonials`

### ✅ Phase 2: Extract Shared Utilities
Created `server/routes/utils/` directory with:

1. **exports.ts** - CSV/Excel generation functions
   - `generateCSV()` - Convert data to CSV with proper escaping
   - `getCSVHeaders()` - Get headers for different export types
   - `generateExcel()` - Generate Excel file buffers
   - `generateTitleFromFilename()` - Create user-friendly titles from filenames

2. **pdf.ts** - PDF generation utilities
   - `stripHtml()` - Remove HTML tags from text
   - `escapeHtml()` - Escape HTML special characters
   - `sanitizeFilename()` - Sanitize filenames for safe downloads
   - `generatePdfHtml()` - Generate formatted HTML for PDF export

3. **uploads.ts** - Multer configurations
   - `bulkResourceUpload` - For bulk resource uploads (150MB, memory storage)
   - `photoConsentUpload` - For photo consent docs (10MB, filtered file types)
   - `uploadCompression` - For evidence files with compression (150MB)
   - `importUpload` - For CSV/Excel imports

4. **objectStorage.ts** - Object storage helpers
   - `uploadToObjectStorage()` - Upload files and set ACL policies
   - `createAclPolicy()` - Create ACL policy objects

5. **middleware.ts** - Auth middleware
   - `isAuthenticated` - Check if user is logged in
   - `isSchoolMember` - Verify school membership
   - `requireAdmin` - Require admin privileges
   - `requireAdminOrPartner` - Allow admin or partner access

### ✅ Updated routes.ts
- Imports all utilities from `server/routes/utils/`
- Removed all duplicate function definitions
- Removed duplicate multer configurations
- **Result: Zero LSP errors** ✅

## Next Steps: Incremental Domain Router Migration

### Strategy
Rather than attempting to migrate all 9,500+ lines at once, we recommend an **incremental approach**:

1. Keep `server/routes.ts` functional as the main router
2. Extract one domain at a time into separate router files
3. Import and mount domain routers in `routes.ts`
4. Test thoroughly after each extraction
5. Gradually reduce `routes.ts` until it only contains the `registerRoutes()` function

### Example: Creating a Domain Router

#### 1. Create the Router File
Create `server/routes/public.ts`:

```typescript
import { Router } from 'express';
import { storage } from '../storage';
import { apiCache, CACHE_TTL } from '../cache';

export const publicRouter = Router();

// GET /stats - Public statistics
publicRouter.get('/stats', apiCache(CACHE_TTL.LONG), async (req, res) => {
  try {
    const stats = await storage.getSchoolStats();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

// GET /countries - List of countries
publicRouter.get('/countries', apiCache(CACHE_TTL.LONG), async (req, res) => {
  try {
    const countries = await storage.getUniqueCountries();
    res.json(countries);
  } catch (error) {
    console.error("Error fetching countries:", error);
    res.status(500).json({ message: "Failed to fetch countries" });
  }
});

// Add more public routes...
```

#### 2. Mount the Router in routes.ts
In `server/routes.ts`, import and mount the router:

```typescript
import { publicRouter } from './routes/public';

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);
  
  // Mount domain routers
  app.use('/api', publicRouter);
  
  // ... continue with other routes ...
```

#### 3. Remove Extracted Routes
After mounting the router, **remove** the corresponding routes from the main `registerRoutes` function.

#### 4. Test
- Restart the application
- Test all extracted endpoints
- Verify auth middleware still works
- Check server logs for errors

### Recommended Migration Order

1. **Public routes** (`/api/stats`, `/api/countries`, `/api/pdfs/:filename`)
   - Low risk, no auth required
   - Good starting point

2. **Auth/User routes** (`/api/user/*`, `/api/dashboard`)
   - Self-contained user operations
   - Clear boundaries

3. **Schools routes** (`/api/schools/*`)
   - Large domain, migrate in sub-phases
   - Start with simple CRUD, then teams/verification

4. **Evidence routes** (`/api/evidence/*`, `/api/evidence-requirements/*`)
   - Medium complexity
   - Well-defined workflow

5. **Events routes** (`/api/events/*`)
   - Medium complexity
   - Event management and registrations

6. **Certificates** (`/api/certificates/*`)
   - Small, self-contained

7. **Admin routes** (`/api/admin/*`)
   - Create `server/routes/admin/index.ts` orchestrator
   - Extract sub-domains incrementally

8. **Imports** (`/api/admin/import/*`)
   - Data import workflows

9. **Object Storage** (`/api/object/*`)
   - File operations

## Domain Router Template

```typescript
import { Router } from 'express';
import { storage } from '../storage';
import { isAuthenticated, requireAdmin } from './utils/middleware';
// Import other utilities as needed

export const domainRouter = Router();

// Public routes (no auth)
domainRouter.get('/public-endpoint', async (req, res) => {
  // Handler
});

// Authenticated routes
domainRouter.get('/protected', isAuthenticated, async (req, res) => {
  // Handler
});

// Admin routes
domainRouter.post('/admin-action', isAuthenticated, requireAdmin, async (req, res) => {
  // Handler
});
```

## Testing Checklist

After each domain migration:

- [ ] Application starts without errors
- [ ] LSP shows zero errors
- [ ] All extracted endpoints respond correctly
- [ ] Authentication middleware works
- [ ] Authorization checks function properly
- [ ] Database queries execute successfully
- [ ] File uploads work (if applicable)
- [ ] Email sending works (if applicable)
- [ ] Frontend can access all endpoints

## Benefits of This Approach

1. **Maintainability**: Each file under 500 lines, easy to navigate
2. **AI-Friendly**: Clear domain boundaries for AI code editors
3. **Team Collaboration**: Multiple developers can work on different domains
4. **Testing**: Easier to write unit tests for smaller routers
5. **Debugging**: Faster to locate and fix issues
6. **Scalability**: Easy to add new domains as the app grows

## File Size Targets

- **Utility files**: < 200 lines
- **Domain routers**: < 500 lines
- **Admin sub-routers**: < 300 lines
- **Main index.ts**: < 100 lines

## Current Status

```
✅ Phase 1: LSP Errors Fixed
✅ Phase 2: Utilities Extracted
⏳ Phase 3: Domain Routers (Ready to start incremental migration)
⏳ Phase 4: Final Cleanup
```

## Support

For questions or issues during migration:
1. Check LSP diagnostics after each change
2. Test endpoints immediately after extraction
3. Keep commits small and atomic
4. Document any non-obvious route behaviors

---

**Migration started**: October 27, 2025  
**Last updated**: October 27, 2025
