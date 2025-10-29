# Plastic Clever Schools Web Application

## Overview
This web application supports the Plastic Clever Schools program, aiming to reduce plastic in schools through a three-stage process: Inspire, Investigate, and Act. It provides a public website and an integrated CRM, offering educational resources, evidence tracking, case studies, plastic reduction promise tracking, and administrative tools. The project aims to foster environmental responsibility and expand the program's reach by offering a comprehensive platform for schools to engage with environmental initiatives.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application employs a modern web architecture with distinct frontend and backend components, a robust data model, and comprehensive UI/UX design.

### Frontend
-   **Frameworks & Libraries**: React with TypeScript (Vite), Wouter, TanStack Query.
-   **UI/Styling**: Radix UI primitives, shadcn/ui components, Tailwind CSS.
-   **Forms**: React Hook Form with Zod validation.
-   **File Uploads**: Uppy.js.
-   **Icons**: Lucide React.
-   **Avatars**: DiceBear.

### Backend
-   **Runtime**: Node.js with Express.js.
-   **Database**: PostgreSQL (Neon serverless) with Drizzle ORM.
-   **Authentication**: Local password and Google OAuth, utilizing Express sessions.
-   **API**: RESTful architecture.
-   **File Storage**: Google Cloud Storage.

### Authentication & Authorization
-   **Identity Providers**: Local password and Google OAuth.
-   **Role-Based Access Control (RBAC)**: Supports roles like Teacher, Head Teacher, Pending Teacher, and Platform Admin.
-   **User Management**: Hierarchical school team management and token-based admin invitation system.

### Key Data Models
Core entities include Users, Schools, Evidence (with approval workflows and assignment), Audit Logs (activity history tracking), Reduction Promises (Action Plans), Resources, Case Studies, Events, Event Banners, Media Assets, Printable Form Submissions, Import Batches, Migration Logs (legacy user migration tracking), Notifications, Document Locks (real-time collaboration), Chat Messages, Health Checks, and Uptime Metrics.

### UI/UX Decisions
-   **Design System**: PCS brand colors, specific fonts (Gilroy Bold, Century Gothic Regular), and a component-based design using Radix UI and shadcn/ui. Custom favicon using the official PCS logo.
-   **Navigation**: Public and authenticated routes, including a tab-based dashboard and enhanced admin navigation.
-   **Features**: Comprehensive analytics with visualizations and PDF export, dynamic evidence requirements, student-led action plans, multi-step school registration (country-adaptive with complete i18n support), and multi-language support (14 languages, RTL support). Includes an AI-powered live chat widget.
-   **Admin UI**: Integrated evidence requirements, school detail management, manual school progression, an 8-step Case Study Wizard, Resource Management with file replacement and visibility controls, and a Data Import System with Legacy User Migration tool. PDF export allows section selection. Multi-language event creator, bulk resource upload with AI-powered auto-fill for metadata, and a comprehensive Review Queue (Evidence, Audits, Photo Consent) with real-time badge counts and streamlined workflows. Permission and Visibility Indicators for evidence and case studies.
-   **Mobile Responsiveness**: Full mobile optimization of admin panel for screens as small as 320px:
    - **Header**: Stacks title and export button vertically on mobile with responsive text sizing (text-xl sm:text-2xl lg:text-3xl)
    - **Navigation**: Horizontal scrolling tabs with hidden scrollbar, all tabs maintain ≥44px touch targets (min-h-11)
    - **CollaborationSidebar**: Hidden by default on mobile (lg:flex), floating toggle button (z-50), overlay dismissal, proper z-index layering, close button with stopPropagation for reliable mobile dismissal
    - **Export Buttons**: Shortened labels on mobile ("CSV" vs "Export CSV") with maintained 44px touch targets
    - **Action Buttons**: Responsive button text using `hidden sm:inline` pattern (e.g., "Create" on mobile, "Create Case Study" on desktop) with full i18n support via `createShort` translation keys
    - **Filter Dropdowns**: All Select components have min-h-11 for consistent 44px touch targets (ResourcesManagement, ResourcePackManagement)
    - **Tables**: All data tables wrapped in overflow-x-auto containers for horizontal scrolling
    - **Filters**: Stack vertically on mobile (flex-col sm:flex-row) with responsive gaps and proper touch targets
    - **Forms**: Responsive grids (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3) for optimal mobile layout
    - **Card Layouts**: Case study cards use flex-wrap for proper mobile content wrapping, preventing awkward overflow
    - **Buttons**: All interactive elements have min-h-11 (44px) for accessibility and proper touch targets
    - **Padding**: Responsive padding throughout (p-3 sm:p-4 lg:p-6) for optimal spacing on all screen sizes
    - **Internationalization**: All responsive button text fully translated across 11 languages (en, ar, cy, de, es, fr, it, ko, nl, pt, zh)
    - **11 Major Sections Optimized**: SchoolsSection, ResourcesManagement, ResourcePackManagement, ActivityLogsSection, EventsSection, EmailManagementSection, CaseStudyManagement, DataImport, MigratedUsersSection, TeamsSection, ReviewsSection
-   **Legacy User Migration System**: Comprehensive data migration tool for importing users from the old WordPress system (accessible via Data Import page):
    - **CSV Import**: Parses legacy user data from 35,863-row CSV file with validation
    - **Dry-Run Mode**: Safe testing mode to preview migration without making changes
    - **Smart School Deduplication**: Matches schools by name + district + country to prevent data corruption
    - **User Creation**: Generates secure random passwords and assigns appropriate roles (head_teacher for solo users, teacher for teams)
    - **Stage Mapping**: Converts old stage_1/2/3 data to new inspire/investigate/act progression
    - **Tracking & Logging**: All migrated users flagged with isMigrated, legacyUserId, and needsEvidenceResubmission for onboarding notices
    - **Credential Export**: Downloadable CSV report with login credentials for distribution
    - **Security**: Temporary passwords only stored in report (not database), admin-only access
    - **User Onboarding**: Homepage notice for migrated users about evidence resubmission requirement
-   **Events System**: Full event lifecycle management, event landing pages with multi-language support, YouTube embedding, downloadable resources, testimonials, automated email reminders, capacity tracking, access links, real-time status badges, dashboard notifications, and calendar integration. Admin can attach existing resources.
-   **Inspiration Page**: Unified gallery displaying curated case studies and approved school evidence submissions with smart sorting and filtering.
-   **Resources System**: Enhanced resources page with language tabs, gradient-styled cards, NEW and RECOMMENDED badges, smart resource ordering, and locked resource visibility for non-registered users. Automatic notification system alerts schools when new resources match their current stage. Admin can replace resource files.
-   **Notifications System**: Real-time notification system with bell icon for unread count, dashboard notification banner for new resources, and user-dismissible notifications.
-   **Content Management**: Printable forms system with admin review, and an Evidence Gallery with advanced filtering. Server-side image compression for evidence file uploads.
-   **Communication**: Enhanced bulk email editor with image picker and AI-powered auto-translation. New Contact Us and Help Center pages. Evidence review notification emails include reviewer's name. **Email URL Routing**: Environment-aware URL generation automatically uses production URLs (`REPLIT_DOMAINS`) when deployed and development URLs (`REPLIT_DEV_DOMAIN`) during development, ensuring all invitation emails (admin, teacher, partner, migrated users) contain the correct domain links.
-   **SEO Optimization**: Server-side meta tag injection for case study pages, JSON-LD structured data, proper heading hierarchy, and descriptive image alt text.
-   **User Profile Management**: Comprehensive user profile page for editing details, language preferences, password changes, and account deletion.
-   **Legal Pages**: Fully internationalized Privacy Policy and Terms & Conditions pages with comprehensive translations.
-   **Real-Time Collaboration System**: Comprehensive collaboration features for admin dashboard enabling multiple admins to work simultaneously:
    - **Online Presence Tracking**: Real-time display of connected admins with activity status, fully integrated with CollaborationProvider context
    - **Document Locking**: Automatic lock acquisition when editing case studies, events, and evidence to prevent conflicts
    - **Lock Countdown Timers**: Visual countdown showing time remaining on document locks with color-coded progress bars (green/orange/red)
    - **Force Unlock**: Platform admin capability to break document locks in emergencies with confirmation dialog and optional reason tracking
    - **Idle Detection & Auto-Unlock**: Automatic release of locks after 10 minutes of user inactivity
    - **Viewing Indicators**: Non-blocking awareness badges showing which admins are viewing documents without locks
    - **Admin Chat System**: Real-time chat with typing indicators (2-second debounce), @mentions with autocomplete, and 1-on-1 direct messaging
    - **Browser Notifications**: Desktop notifications for new chat messages and tab title updates showing unread counts
    - **Activity History System**: Comprehensive audit logging of all admin actions (approvals, edits, deletions, force unlocks) with filterable UI
    - **Evidence Assignment**: Workload distribution system allowing admins to assign evidence submissions to specific reviewers with notification support
    - **Technical Implementation**: CollaborationProvider properly integrated in App.tsx, context value memoized to prevent re-renders, presence updates with deduplication, ChatPanel optimized to prevent infinite loops
-   **Health Monitoring System**: Internal uptime monitoring accessible via admin dashboard to ensure website reliability:
    - **Background Monitoring**: Node-cron service pings public endpoints every minute (/, /api/countries, /api/case-studies, /api/events)
    - **Status Tracking**: Records health checks with response times and status codes, categorizing endpoints as healthy (<1s), degraded (1-3s), or down (>3s or errors)
    - **Hourly Aggregation**: Automatically calculates uptime percentages and average response times per endpoint every hour
    - **System Health Dashboard Tab**: Real-time status cards, uptime percentages, response time charts (Recharts), and incident timeline with resolution tracking
    - **Data Persistence**: PostgreSQL tables (healthChecks, uptimeMetrics) store historical data for trend analysis
    - **Admin-Only Access**: Internal monitoring visible only to platform administrators, not exposed publicly

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

## Recent Changes (October 2025)
### Evidence Approval Bug Fixes
- **Fixed HTTP Method Mismatch**: Changed evidence review endpoint from PUT to PATCH to match frontend requests (`/api/admin/evidence/:id/review`), resolving the issue where approve button would "bounce" without taking action
- **Fixed Missing Translations**: Added missing translation keys (`cancel`, `confirm`, `processing`) to `reviews.evidence.modal` section in admin.json, preventing translation keys from displaying instead of button text
- **Fixed HTML Rendering**: Updated EvidenceReviewQueue component to use Trans component from react-i18next for proper HTML rendering in photo consent warning dialog, ensuring `<strong>` tags render as bold text instead of displaying as literal tags
- **Testing**: Verified complete admin evidence approval flow end-to-end with automated tests

### Admin Collaboration Chat Security Fix
- **Fixed WebSocket Authentication**: Updated `authenticateWebSocket` function in `server/websocket.ts` to restrict admin collaboration chat to only platform admins and partners
- **Security Enhancement**: Teachers and school users are now properly excluded from the admin collaboration system (online presence, chat, document locks)
- **Implementation**: WebSocket connections now verify user role (`isAdmin` or `role === 'admin'` or `role === 'partner'`) before allowing access, rejecting unauthorized users with code 1008