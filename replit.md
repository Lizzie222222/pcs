# Plastic Clever Schools Web Application

## Overview
This web application supports the Plastic Clever Schools program, a three-stage initiative (Inspire, Investigate, Act) aimed at reducing plastic use in schools. It provides a public website and an integrated CRM, offering educational resources, evidence tracking, case studies, plastic reduction promise tracking, and administrative tools. The project's core purpose is to foster environmental responsibility, expand the program's reach, and provide a comprehensive platform for schools to engage with environmental initiatives and track their progress.

## Recent Changes
**November 15, 2025**: Fixed admin Quick Stats progress display and photo consent visibility
- Fixed progress percentage display bug in admin school profile Quick Stats section where 0% progress incorrectly showed as 100%
- Updated progress display formula to use conditional logic: shows 100% for completed rounds (100, 200, 300), 0% for no progress, and correct percentages for in-progress states
- Normalized photo consent API response structure to use consistent nested `photoConsent` object format
- Updated `getSchoolsWithPendingPhotoConsent()` to return `photoConsent: { documentUrl, uploadedAt, status }` instead of flat structure
- Photo consent documents are now visible in both the Review Queue and School Profile pages
- Mapper returns `photoConsent: null` when no document data exists (semantic null handling)
- Fixed round progression bug where Investigate stage could complete with only audit approval, skipping the required Action Plan submission
- Updated progression logic to require BOTH Plastic Waste Audit (hasQuiz) AND Action Plan Development (hasActionPlan) for Investigate stage completion
- Added round selector to Progress Tracker allowing schools to view evidence from previous rounds with visual round indicators
- Enhanced Recent Activity section to display evidence from all rounds with color-coded round badges (blue/purple/green)
- Updated evidence API to support roundNumber filtering for historical evidence viewing
- Schools must now complete all requirements (Inspire: 3 items, Investigate: audit + action plan, Act: 3 items) before advancing to next round

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