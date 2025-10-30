# Plastic Clever Schools Web Application

## Overview
This web application supports the Plastic Clever Schools program, a three-stage initiative (Inspire, Investigate, Act) aimed at reducing plastic use in schools. It provides a public website and an integrated CRM, offering educational resources, evidence tracking, case studies, plastic reduction promise tracking, and administrative tools. The project's core purpose is to foster environmental responsibility, expand the program's reach, and provide a comprehensive platform for schools to engage with environmental initiatives and track their progress.

## Recent Changes
**October 30, 2025**: Complete admin audit submission with full 5-part quiz
- **Admin can submit complete audits on behalf of schools**: Added UploadAuditDialog with all 5 parts of the audit quiz that schools normally complete, allowing admins to input comprehensive audit data including school info, plastic counts, waste management practices, and reduction promises.
- **Full audit quiz structure**: Part 1 (School Information), Part 2 (Lunchroom & Staffroom plastic counts), Part 3 (Classrooms & Bathrooms plastic counts), Part 4 (Waste Management practices), Part 5 (Reduction Promises/Action Plan with minimum 2 commitments).
- **Auto-approval for admin audits**: When admins submit audits on behalf of schools, they are automatically approved (status='approved') since they represent pre-vetted data.
- **No email notifications for admin audit submissions**: Admin audit uploads skip all submission confirmation emails to avoid unnecessary notifications.
- **Upload buttons in school profile**: Added "Photo Consent" and "Audit" upload buttons in the school profile header for quick admin access to upload dialogs.
- **Fixed cache invalidation**: Query cache now properly refreshes after admin submissions by matching query keys between fetch and invalidation.

**October 30, 2025**: Admin evidence management enhancements
- **Admin evidence uploads auto-approved**: When admins upload evidence on behalf of schools, it is automatically approved (status set to "approved", reviewedBy set to admin ID, reviewedAt timestamp set) since it's already vetted content.
- **Email notifications skipped for admin uploads**: Admin evidence uploads skip all submission confirmation emails and Mailchimp automation, preventing unnecessary notifications.
- **Gallery layout for evidence viewing**: Evidence tab in school profiles now displays evidence as cards with thumbnail galleries instead of a table, showing visibility badges (Public/Registered), stage/status badges, and file previews using EvidenceFilesGallery component.
- **Admin upload and edit dialogs**: Added comprehensive UploadEvidenceDialog and EditEvidenceDialog components allowing admins to create and modify evidence with full control over title, description, stage, visibility, files, and video links.
**October 30, 2025**: Complete email template overhaul for consistency and reliability
- **Removed ALL gradients from email templates**: Replaced all linear-gradient CSS with solid colors across all SendGrid and Mailchimp email templates for maximum compatibility across email clients (Gmail, Outlook, Apple Mail, etc.).
  - **Headers**: Changed all headers from gradients to solid navy blue (#204969) ensuring white logo visibility in all email clients and dark modes
  - **Buttons**: Standardized all CTA buttons to solid navy blue (#204969) with white text across all email types (invitations, events, approvals, notifications, etc.)
  - **Body backgrounds**: Replaced gradient backgrounds with solid colors (#f4f4f4 or #ffffff)
  - **Decorative sections**: Updated all decorative elements to use solid colors appropriate to their context
  - Added CSS meta tags and media queries for enhanced email client compatibility
  - Applied inline !important styling for maximum client support
- **Fixed teacher invitation email production issues**: Enhanced invitation link reliability and debugging capabilities
  - Added comprehensive logging of full invitation URL (acceptUrl) for production debugging
  - Updated invitation button link with `target="_blank"` and `rel="noopener noreferrer"` attributes for better email client compatibility
  - Improved URL handling to prevent broken invitation links in production
- **Enhanced welcome email content**: Added simplified "Your First Step: Inspire" section to indicate the starting point for new schools
  - Clean, concise message: "This is your first step: Inspire"
  - Styled with light blue background and border for visual prominence
- **Unified branding across all email services**: Consistent navy blue (#204969) branding across SendGrid (main email service) and Mailchimp (bulk campaigns)

**October 30, 2025**: Resource page tag display enhancement
- **Added unified tag display to resource cards**: Language is now displayed as a tag alongside other resource tags for consistent categorization.
  - Language displays as the first tag with teal badge styling (e.g., #English, #Spanish)
  - Additional resource tags display after the language tag (up to 3 tags shown)
  - Tags use consistent teal badge styling matching case study tags: `bg-teal/5 text-teal border-teal/20`
  - Tags appear in a dedicated row after the stage badge and before the resource title
  - Replaced separate language text with file type indicator in the footer area
  - Added `tags` field to Resource TypeScript interface for type safety
  - Verified implementation with automated end-to-end tests

**October 30, 2025**: Map page country name display fix
- **Fixed country codes displaying instead of full names on map page**: Expanded the country code mapping to include all ISO 3166-1 alpha-2 codes used in the database.
  - Added missing country mappings including Jamaica (JM), Venezuela (VE), Dominica (DM), United Arab Emirates (AE), Albania (AL), Serbia (RS), Russia (RU), and many others
  - Countries now display with their full names instead of 2-letter codes in the map popup tooltips, country breakdown list, and all map-related statistics
  - Organized country mappings alphabetically for better maintainability
  - Verified all country names match official ISO country name standards

**October 30, 2025**: Admin schools list date filtering
- **Added date-based filtering and sorting to admin schools list**: Administrators can now sort schools by join date and filter by specific months and years for better school management and reporting.
  - Added "Sort by Date" dropdown with options for "Newest First" (default) and "Oldest First"
  - Added "Month" filter to view schools that joined in a specific month (January-December)
  - Added "Year" filter to view schools that joined in a specific year (2018-2025)
  - Filters work in combination: selecting both month and year shows schools from that specific month/year
  - Backend filtering logic handles precise date ranges (start of month to end of month)
  - All new filters integrate seamlessly with existing filters (country, stage, language, search)
  - UI controls use consistent styling and are fully mobile-responsive

**October 30, 2025**: Registration form age selection redesign
- **Redesigned age selection in school registration**: Replaced grouped age ranges with individual age toggle buttons for more granular student demographic tracking.
  - Changed from grouped ranges (e.g., "5-7", "7-11", "11-14") to individual ages (Under 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18)
  - Replaced vertical checkbox list with modern toggle button UI styled as pills (rounded-full)
  - Toggle buttons wrap horizontally across multiple rows with flex-wrap for clean, space-efficient layout
  - Selected toggles show clear visual feedback with primary color background
  - Multi-select functionality allows schools to select all applicable student ages
  - Updated all country configs (UK, US, and default) to use consistent individual age options
  - Verified end-to-end registration flow with automated tests

**October 30, 2025**: Stage unlocking and UI improvements
- **Fully unlocked all program stages in UI**: Completely removed all stage locking logic from the ProgressTracker component. All three stages (Inspire, Investigate, Act) now display as simultaneously accessible with colored gradients and active styling. Users can submit evidence for any stage at any time, regardless of their school's current stage or completion status.
  - Modified `getStageStatus()` to only return 'completed' or 'accessible' (removed 'locked' and 'current' states)
  - Updated `getProgressPercentage()` to calculate progress for all stages independently
  - Removed "Current Stage" and "Locked" badges from the UI
  - Removed all lock icons and locked status indicators from evidence requirements
  - Updated card and icon styling to show all accessible stages with colored gradients (teal/yellow/blue) instead of gray locked states
  - All Submit/Do Audit buttons now visible for non-approved evidence regardless of stage
  - Removed "Complete previous stage to unlock" messages
- **Streamlined navigation**: Removed Help Centre and Team Management from the main navigation bar to create a cleaner, more focused user interface. These pages remain accessible via direct URLs if needed.
- **Improved login flow**: Schools and teachers now redirect directly to the dashboard after login instead of the landing page, providing faster access to their school workspace.
- **Fixed photo consent cache invalidation**: When an admin approves or rejects photo consent, the evidence list now immediately refreshes to show the updated consent status, and the warning dialog no longer appears incorrectly when approving evidence.
- **Fixed audit approval dialog centering**: The audit approval/rejection dialog is now properly centered on the screen.
- **Fixed audit approval analytics refresh**: Added comprehensive analytics query invalidations after audit approval to ensure all statistics update in real-time, including audit-specific analytics and school progress analytics.

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
-   **Role-Based Access Control (RBAC)**: Supports roles such as Teacher, Head Teacher, Pending Teacher, and Platform Admin.
-   **User Management**: Includes hierarchical school team management and a token-based admin invitation system.

### Key Data Models
Core entities include Users, Schools, Evidence (with approval and assignment), Audit Logs, Reduction Promises (Action Plans), Resources, Case Studies, Events, Event Banners, Media Assets, Printable Form Submissions, Import Batches, Migration Logs, Notifications, Document Locks, Chat Messages, Health Checks, and Uptime Metrics.

### UI/UX Decisions
-   **Design System**: Component-based design using Radix UI and shadcn/ui, custom favicon, consistent PCS brand colors, and professional typography.
-   **Navigation**: Public and authenticated routes, tab-based dashboard, enhanced admin navigation.
-   **Core Features**: Comprehensive analytics with PDF export, dynamic evidence requirements, student-led action plans, multi-step school registration (country-adaptive with i18n), and multi-language support (14 languages, including RTL).
-   **Admin UI**: Features integrated evidence requirements, school detail management, manual school progression, a Case Study Wizard, Resource Management, a Data Import System with Legacy User Migration, a multi-language event creator, bulk resource upload with AI auto-fill, and a Review Queue for Evidence, Audits, and Photo Consent.
-   **Mobile Responsiveness**: Full mobile optimization for the admin panel.
-   **Legacy User Migration**: Comprehensive data migration tool from WordPress.
-   **Events System**: Full lifecycle management, multi-language landing pages, automated email reminders, capacity tracking, and calendar integration.
-   **Inspiration Page**: Unified gallery of case studies and approved evidence with smart sorting/filtering.
-   **Resources System**: Enhanced page with language tabs, gradient-styled cards, badges, smart ordering, and locked visibility for non-registered users. Automatic notifications for new resources matching school stage.
-   **Notifications System**: Real-time notifications via bell icon and dashboard banners.
-   **Content Management**: Printable forms with admin review, advanced filtering for the Evidence Gallery, and server-side image compression for evidence uploads.
-   **Communication**: Enhanced bulk email editor with AI auto-translation, Contact Us, and Help Center pages.
-   **SEO Optimization**: Server-side meta tag injection, JSON-LD, proper heading hierarchy, and descriptive image alt text.
-   **User Profile Management**: Comprehensive page for editing user details, language, password, and account deletion.
-   **Legal Pages**: Fully internationalized Privacy Policy and Terms & Conditions.
-   **Real-Time Collaboration**: Admin dashboard features include online presence tracking, document locking, idle detection, viewing indicators, admin chat with typing indicators and @mentions, activity history, and evidence assignment.
-   **Health Monitoring**: Internal uptime monitoring and a system health dashboard.

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