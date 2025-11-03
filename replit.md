# Plastic Clever Schools Web Application

## Overview
This web application supports the Plastic Clever Schools program, a three-stage initiative (Inspire, Investigate, Act) aimed at reducing plastic use in schools. It provides a public website and an integrated CRM, offering educational resources, evidence tracking, case studies, plastic reduction promise tracking, and administrative tools. The project's core purpose is to foster environmental responsibility, expand the program's reach, and provide a comprehensive platform for schools to engage with environmental initiatives and track their progress.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application features a modern web architecture with distinct frontend and backend components, a robust data model, and comprehensive UI/UX design.

### Frontend
-   **Frameworks & Libraries**: React with TypeScript (Vite), Wouter for routing, TanStack Query for data fetching.
-   **UI/Styling**: Radix UI primitives, shadcn/ui components, Tailwind CSS for styling, adhering to PCS brand colors and specific fonts (Gilroy Bold, Century Gothic Regular).
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

### Authentication & Authorization
-   **Identity Providers**: Local password and Google OAuth.
-   **Role-Based Access Control (RBAC)**: Supports roles such as Teacher, Head Teacher, Pending Teacher, and Platform Admin. **Teacher Permissions (November 2025)**: All teachers (both 'teacher' and 'head_teacher' roles) have equal access to team management features including inviting teachers, managing team members, and reviewing requests. The head_teacher designation is only for the initial account creator but confers no additional privileges.
-   **User Management**: Includes hierarchical school team management and a token-based admin invitation system.
-   **Migrated User Onboarding**: Smart two-step onboarding flow for users migrated from legacy system. Intelligently handles two scenarios:
    - **Traditional Path**: Users receive temporary password via bulk migration email → complete password reset + profile confirmation
    - **Forgot Password Path**: Users who use forgot password flow have `needsPasswordReset` flag cleared → skip password step and only confirm profile
    - System prevents duplicate emails by filtering bulk sends to only users with `isMigrated=true AND needsPasswordReset=true`
    - Standard welcome emails (without temporary passwords) sent to migrated users who reset via forgot password

### Key Data Models
Core entities include Users, Schools, Evidence (with approval and assignment), Audit Logs, Reduction Promises (Action Plans), Resources, Case Studies, Events, Event Banners, Media Assets, Printable Form Submissions, Import Batches, Migration Logs, Notifications, Document Locks, Chat Messages, Health Checks, and Uptime Metrics.

**Content Visibility System**: Evidence and Resources support two visibility levels:
- **Public**: Visible to everyone including non-authenticated users
- **Private**: Only visible to the uploading school and platform admins

All public-facing endpoints (Resources page, Inspiration gallery, Search) enforce strict visibility filtering to show only public content. Private content is accessible exclusively through school dashboards and admin panels.

### UI/UX Decisions
-   **Design System**: Component-based design using Radix UI and shadcn/ui, custom favicon, consistent PCS brand colors, and professional typography.
-   **Navigation**: Public and authenticated routes, tab-based dashboard, enhanced admin navigation.
-   **Core Features**: Comprehensive analytics with PDF export, dynamic evidence requirements, student-led action plans, multi-step school registration (country-adaptive with i18n), and multi-language support (14 languages, including RTL). Language preferences persist across sessions via database storage, with user-selected language taking precedence over OIDC claims on re-login (November 2025).
-   **Admin UI**: Features integrated evidence requirements with full internationalization support (language-specific custom links enable requirement resources to display in user's language with automatic fallback to English), school detail management, manual school progression, a Case Study Wizard, Resource Management, a Data Import System with Legacy User Migration, a multi-language event creator, bulk resource upload with AI auto-fill, and a Review Queue for Evidence, Audits, and Photo Consent. Admin audit submissions are automatically approved. Admin evidence uploads are automatically approved. Admin schools list supports date-based filtering and sorting, including user interaction status filtering. **Search Optimization (November 2025)**: Both school management and user management search fields now implement 300ms debouncing to prevent excessive API requests on every keystroke, improving performance and reducing server load. **Schools Management Performance (November 2025)**: Implemented server-side pagination (50 schools per page) with efficient COUNT(*) queries for accurate totals across all 1,600+ schools. Added sortable column headers with arrow indicators for name, country, progress percentage, and join date. Schools table now displays currentRound column showing "Round 1", "Round 2", etc., or "—" for schools without a recorded round. All pagination, sorting, and filtering work seamlessly together with proper query key caching.
-   **User Interaction Tracking**: System tracks user activity with `lastActiveAt` (updated on every authenticated request) and `hasInteracted` (set when users perform meaningful actions like submitting evidence, uploading files, or submitting audits). Analytics dashboard displays engagement metrics (total users, interacted vs non-interacted users, interaction rate). Admin panels support filtering schools and users by interaction status to identify active vs inactive accounts. School deletion bug fixed (November 2025) - backend now correctly reads deleteUsers flag from request body instead of query params.
-   **Plastic Waste Audit System**: Comprehensive 5-step audit workflow (School Info, Lunchroom & Staffroom, All School Rooms, Waste Management, Audit Results with pie chart visualization). Covers 11 room types (Lunchroom, Staffroom, Classrooms, Toilets, Office, Library, Gym, Playground, Corridors, Science Labs, Art Rooms) with granular plastic item tracking. Food packaging split into 3 categories (snack wrappers, yoghurt pots, takeaway containers). All counts are daily with automatic annual calculations (× 190 school days). Each room section includes "Other" option with custom text and count. Toilets section includes period products. Users can edit audits until approved (draft and submitted statuses are editable). Downloadable PDF forms for offline auditing. Results page displays total annual plastic usage with pie chart showing top problem plastics. Audit submission is now separate from Action Plan Development - schools submit their audit for review first, then create action plans as a distinct task in the Investigate stage. **Audit & Action Plan Internationalization (November 2025)**: Complete translation of audit and action plan components into all 14 platform languages. Created dedicated `audit` namespace with 330+ translation keys covering form labels, validation messages, room types, plastic items, timeframes, and status indicators. Both PlasticWasteAudit and ActionPlan components refactored to use i18n-aware validation schemas and translation keys exclusively. Profile section already fully translated using common.json keys.
-   **Mobile Responsiveness**: Full mobile optimization for the admin panel.
-   **Legacy User Migration**: Comprehensive data migration tool from WordPress. **Migration Data Integrity Fixes (November 2025)**: Post-migration cleanup tools ensure all 1,605 migrated schools have accurate completion flags and round status. Fixed critical bug in `checkAndUpdateSchoolProgression()` where schools completing all 3 stages weren't getting `awardCompleted=true` flag set. Created admin endpoint `/api/admin/migration/fix-completion-flags` that (1) fixes illogical completion flag combinations, (2) ensures all schools with 3 completed stages have award flag, and (3) moves award-winning schools from Round 1 to Round 2 without resetting their progress. Final result: 121 "Plastic Clever" schools correctly placed on Round 2 with full completion status (`awardCompleted=true`, `roundsCompleted=1`, 100% progress), ensuring accurate historical credit for legacy evidence submissions.
-   **Events System**: Full lifecycle management, multi-language landing pages, automated email reminders, capacity tracking, and calendar integration. Auto-translate feature generates translations for event content (titles, descriptions, videos, resources, testimonials) in multiple languages, stored in JSONB fields (title_translations, description_translations, youtube_video_translations, etc.). Translation persistence bug fixed (October 2025) - server now correctly preserves frontend-sent translations instead of overwriting with database values during auto-sync operations.
-   **Inspiration Page**: Unified gallery of case studies and approved evidence with smart sorting/filtering.
-   **Resources System**: Enhanced page with language tabs, gradient-styled cards, badges, smart ordering, and locked visibility for non-registered users. Automatic notifications for new resources matching school stage. Resource cards now display language as a tag alongside other resource tags.
-   **Notifications System**: Real-time notifications via bell icon and dashboard banners.
-   **Content Management**: Printable forms with admin review, advanced filtering for the Evidence Gallery, and server-side image compression for evidence uploads. Evidence tab in school profiles displays evidence as cards with thumbnail galleries.
-   **Communication**: Enhanced bulk email editor with AI auto-translation, Contact Us, and Help Center pages. All email templates have been overhauled for consistency and reliability, removing gradients and standardizing branding. **Email Internationalization (November 2025)**: Complete email translation system supporting all 14 platform languages (English, Spanish, French, German, Italian, Portuguese, Dutch, Arabic, Chinese, Greek, Russian, Korean, Indonesian, Welsh). All user-facing emails (welcome, password reset, invitations, evidence notifications, audit notifications, event emails, completion celebrations) automatically translate based on user's preferredLanguage. Batch emails (event announcements/digests) and internal admin notifications remain English-only.
-   **SEO Optimization**: Server-side meta tag injection, JSON-LD, proper heading hierarchy, and descriptive image alt text.
-   **User Profile Management**: Comprehensive page for editing user details, language, password, and account deletion.
-   **Legal Pages**: Fully internationalized Privacy Policy and Terms & Conditions.
-   **Real-Time Collaboration**: Admin dashboard features include online presence tracking, document locking, idle detection, viewing indicators, admin chat with typing indicators and @mentions, activity history, and evidence assignment.
-   **Health Monitoring**: Internal uptime monitoring and a system health dashboard.
-   **Program Stages**: All program stages (Inspire, Investigate, Act) are fully unlocked and simultaneously accessible in the UI, allowing users to submit evidence for any stage at any time.
-   **Login Flow**: Schools and teachers redirect directly to the dashboard after login.
-   **Map Page**: Country codes now display as full names in map tooltips and statistics.
-   **Registration Form**: Age selection redesigned with individual age toggle buttons for granular student demographic tracking.

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