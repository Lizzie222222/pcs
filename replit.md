# Plastic Clever Schools Web Application

## Overview
This web application supports the Plastic Clever Schools program, a three-stage initiative (Inspire, Investigate, Act) aimed at reducing plastic use in schools. It provides a public website and an integrated CRM, offering educational resources, evidence tracking, case studies, plastic reduction promise tracking, and administrative tools. The project's core purpose is to foster environmental responsibility, expand the program's reach, and provide a comprehensive platform for schools to engage with environmental initiatives and track their progress.

## Recent Changes
**November 15, 2025**: Performance Optimizations - Implemented comprehensive server protection and WebSocket notification system
- **Rate Limiting**: Installed express-rate-limit with tiered request limits to protect against bot traffic and abuse
  - Bot/suspicious traffic: 5 requests/hour (blocks WordPress/PHP scanner endpoints like /xmlrpc.php, /wp-admin, /.env, etc.)
  - Anonymous users: 100 requests/15 minutes
  - Authenticated users: 300 requests/15 minutes
  - Admin users: 1000 requests/15 minutes
  - Automatic IP detection with IPv6 support using ipKeyGenerator
  - All rate limit violations logged for monitoring
  - **FIXED**: Removed `/admin` from bot blocker list to allow legitimate admin panel access (was blocking admin logins)
- **Request Timeout Protection**: Added 90-second timeout middleware to prevent hanging requests
  - Graceful 504 Gateway Timeout responses when requests exceed time limit
  - Protects against resource exhaustion from long-running or stuck requests
  - Applied globally to all API routes
- **WebSocket Notification System**: Eliminated polling with real-time WebSocket notifications
  - Added `notification_update` WebSocket event type for real-time notification delivery
  - Server-side broadcasts when notifications are created (user-specific or school-wide)
  - Frontend CollaborationContext handles notification events with subscription system
  - Navigation component uses WebSocket for instant notification count updates
  - Fallback to 30-second polling when WebSocket is disconnected
  - **Expected Impact**: Eliminates ~18K notification polling requests/day, reducing to WebSocket messages only
- **Combined Infrastructure Savings**: 99%+ reduction in unnecessary traffic
  - WebSocket reconnection fix: 3M → 10-20K connections/day
  - Idle timeout feature: Additional reduction from disconnecting inactive users
  - Notification polling elimination: 18K fewer requests/day
  - Bot blocking: Prevents 162K+ malicious requests/day (e.g., /xmlrpc.php attacks)
  - Request timeout: Prevents resource exhaustion from hanging requests

**November 15, 2025**: CRITICAL FIX - Resolved excessive WebSocket reconnection issue causing high infrastructure costs
- **Root Cause**: WebSocket was reconnecting every few minutes (~383 connections per user per day, ~3 million per day total) due to userId dependency triggering React effect when user object reference changed during TanStack Query refetches
- **Solution Implemented**: 
  - Introduced `userIdRef` to track userId without causing re-renders or reconnections
  - Added `shouldMaintainConnectionRef` flag to control when automatic reconnection should occur
  - Modified `onclose` handler to check `shouldMaintainConnectionRef` before attempting reconnection
  - Implemented visibility-based disconnect with 30-second delay for hidden tabs
  - Fixed connection effect to depend on `[isAuthenticated, user?.id]` with guards to prevent duplicate connections
  - **NEW: Idle Timeout Feature** - Added automatic disconnect after 30 minutes of user inactivity with manual reconnection
- **Key Technical Changes**:
  - `hasInitiatedConnectionRef` prevents duplicate connections when user object reference changes
  - `shouldMaintainConnectionRef` set to `false` during intentional disconnects (logout, hidden tabs, idle timeout) preventing `onclose` from auto-reconnecting
  - Proper timeout clearing in visibility handler prevents overlapping disconnect timers
  - Activity tracking via mousedown, keydown, scroll, touchstart events resets 30-minute idle timer
  - `IdleTimeoutNotification` component displays amber alert with "Reconnect Now" button when user is idle-disconnected
- **Expected Impact**: Reduced WebSocket connections from ~3 million/day to ~10-20K/day (one stable connection per user session instead of reconnecting every few minutes), with additional savings from idle user disconnects
- **Architect Review**: PASS - Confirmed all reconnection issues resolved with no security concerns or race conditions. Idle timeout feature also approved.

**November 15, 2025**: Enhanced evidence review queue UI with improved filtering and preview
- **Three-Tier Filter Organization**: Reorganized filters into logical tiers - Tier 1 (Stage toggles + Requirement dropdown + Status tabs + Assignee + View toggle), Tier 2 (Search + Sort + Clear filters), Tier 3 (Collapsible advanced filters in 2-column grid)
- **Stage-Requirement Adjacency**: Moved requirement filter from advanced section to be adjacent to stage filter for better UX and logical grouping
- **Table Preview Enhancement**: Added thumbnail preview column to table view with clickable Dialog component for detailed evidence inspection
- **Smart Thumbnail Display**: Thumbnails intelligently find first image-type file from evidence files array, falling back to icon for non-image files (PDFs, videos)
- **Improved Filter Layout**: Changed advanced filters from 5-column to 2-column grid to prevent date range overflow, added responsive flex-wrap
- **Country Filter Fix**: Added "All Countries" option to country dropdown for proper clear filters functionality
- **Accessibility**: Replaced custom modal div with proper Dialog component for better screen reader support and keyboard navigation

**November 15, 2025**: Implemented comprehensive bonus evidence and homeless evidence triage system
- **Bonus Evidence System**: Added `isBonus` field to evidence schema to track bonus/additional evidence that doesn't count toward stage completion requirements
- **Admin Upload Form Enhancement**: Dynamic requirement selector loads requirements based on selected stage, with "Bonus Evidence" option always available for submissions that don't fit specific requirements
- **Evidence Triage Dashboard**: New admin tool in Program dropdown lists all homeless evidence (evidenceRequirementId=null, isBonus=false) with pagination, filtering by school/stage, and ability to assign to requirements or mark as bonus
- **School-Side Visibility**: Discreet amber notification in Progress Tracker alerts schools when they have homeless admin-uploaded evidence that won't count until assigned
- **Bonus Badge Display**: Gold "Bonus" badge appears in Recent Activity feed for evidence marked as bonus, providing visual distinction
- **Progress Calculation Fix**: Progress tracking now correctly excludes bonus evidence while preserving homeless evidence counts until assigned
- **Orphan Evidence Handling**: Triage dashboard displays evidence without associated schools as "Unknown School" for admin cleanup
- **Migration**: Database migration completed successfully setting isBonus default to false for all existing evidence
- Fixed admin Quick Stats progress display bug in school profile where 0% progress incorrectly showed as 100%
- Normalized photo consent API response structure to use consistent nested `photoConsent` object format
- Photo consent documents now visible in both Review Queue and School Profile pages
- Fixed round progression to require BOTH Plastic Waste Audit AND Action Plan for Investigate stage completion
- Added round selector to Progress Tracker for viewing historical evidence from previous rounds
- Enhanced Recent Activity with color-coded round badges (blue/purple/green) for all rounds

**November 14, 2025**: Fixed photo consent workflow
- Migrated photo consent document uploads from local multer storage to Google Cloud Storage for reliable document access
- Normalized all photo consent API responses to use consistent nested `photoConsent` object structure (status, documentUrl, uploadedAt, approvedAt, reviewNotes)
- Implemented dynamic photo consent status banners in evidence submission form that display real-time status (approved/pending/rejected/not uploaded)
- Added comprehensive cache invalidation across all admin mutations (approve/reject) to ensure immediate UI updates
- Updated all frontend components (EvidenceSubmissionForm, PhotoConsentQueue, admin panels) to use the new normalized data structure
- Cleaned up legacy data with malformed photo consent URLs

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application features a modern web architecture with distinct frontend and backend components, a robust data model, and comprehensive UI/UX design.

### Frontend
-   **Frameworks & Libraries**: React with TypeScript (Vite), Wouter for routing, TanStack Query for data fetching.
-   **UI/Styling**: Radix UI primitives, shadcn/ui components, Tailwind CSS for styling, adhering to PCS brand colors and specific fonts.
-   **Forms**: React Hook Form with Zod validation.
-   **File Uploads**: Uppy.js.
-   **Icons**: Lucide React.
-   **Avatars**: DiceBear.

### Backend
-   **Runtime**: Node.js with Express.js.
-   **Database**: PostgreSQL (Neon serverless) managed with Drizzle ORM.
-   **Authentication**: Local password and Google OAuth, utilizing Express sessions.
-   **API**: RESTful architecture.
-   **File Storage**: Google Cloud Storage.
-   **Architecture Pattern**: Feature-based modularization with delegation pattern for improved maintainability and AI editability (e.g., Schools, Evidence, Case Studies Modules).

### Authentication & Authorization
-   **Identity Providers**: Local password and Google OAuth.
-   **Role-Based Access Control (RBAC)**: Supports roles such as Teacher, Head Teacher, Pending Teacher, and Platform Admin.
-   **User Management**: Includes hierarchical school team management and a token-based admin invitation system.
-   **Migrated User Onboarding**: Smart two-step onboarding flow for users migrated from legacy systems.

### Key Data Models
Core entities include Users, Schools, Evidence, Audit Logs, Reduction Promises (Action Plans), Resources, Case Studies, Events, Media Assets, and Notifications.
-   **Content Visibility System**: Evidence and Resources support Public and Private visibility levels.

### UI/UX Decisions
-   **Design System**: Component-based design using Radix UI and shadcn/ui, custom favicon, consistent branding, and professional typography.
-   **Navigation**: Public and authenticated routes, tab-based dashboard, enhanced admin navigation.
-   **Core Features**: Comprehensive analytics, dynamic evidence requirements, student-led action plans, multi-step school registration (country-adaptive with i18n), multi-language support (14 languages, including RTL) with persistent language preferences.
-   **Admin UI**: Integrated evidence requirements with i18n, school detail management, manual school progression, Case Study Wizard, Resource Management, Data Import System with Legacy User Migration, multi-language event creator, bulk resource upload with AI auto-fill, and a Review Queue for Evidence, Audits, and Photo Consent. Admin searches use debouncing, and school management features server-side pagination and sortable columns.
-   **User Interaction Tracking**: Tracks `lastActiveAt` and `hasInteracted` for engagement metrics and filtering.
-   **Plastic Waste Audit System**: Comprehensive 5-step audit workflow covering 11 room types with granular plastic item tracking and automatic annual calculations. Fully internationalized with separate audit submission and action plan development.
-   **Mobile Responsiveness**: Full mobile optimization for the admin panel.
-   **Events System**: Full lifecycle management, multi-language landing pages, automated email reminders, capacity tracking, and calendar integration with auto-translate features.
-   **Inspiration Page**: Unified gallery of case studies and approved evidence with smart sorting/filtering.
-   **Resources System**: Enhanced page with language tabs, gradient-styled cards, badges, smart ordering, locked visibility, automatic notifications, and visual thumbnail previews.
-   **Notifications System**: Real-time notifications via bell icon and dashboard banners.
-   **Content Management**: Printable forms with admin review, advanced filtering for the Evidence Gallery, and server-side image compression.
-   **Communication**: Enhanced bulk email editor with AI auto-translation, Contact Us, and Help Center pages. All email templates are overhauled and fully internationalized.
-   **SEO Optimization**: Server-side meta tag injection, JSON-LD, proper heading hierarchy.
-   **User Profile Management**: Comprehensive page for editing user details, language, password, and account deletion.
-   **Legal Pages**: Fully internationalized Privacy Policy and Terms & Conditions.
-   **Real-Time Collaboration**: Admin dashboard features online presence tracking, document locking, admin chat, and activity history.
-   **Health Monitoring**: Internal uptime monitoring and a system health dashboard.
-   **Program Stages**: All program stages (Inspire, Investigate, Act) are fully unlocked and simultaneously accessible.
-   **Registration Form**: Redesigned age selection for granular student demographic tracking.

## External Dependencies
-   **Database**: Neon PostgreSQL
-   **File Storage**: Google Cloud Storage
-   **Authentication**: Google OAuth
-   **Email Services**: SendGrid
-   **Build Tool**: Vite
-   **Hosting/Deployment**: Replit
-   **AI Integration**: OpenAI GPT-4o-mini
-   **PDF Generation**: Puppeteer
-   **Image Processing**: Sharp library