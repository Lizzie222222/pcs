# Plastic Clever Schools Web Application

## Overview
This web application supports the Plastic Clever Schools program, a three-stage initiative (Inspire, Investigate, Act) aimed at reducing plastic use in schools. It provides a public website and an integrated CRM, offering educational resources, evidence tracking, case studies, plastic reduction promise tracking, and administrative tools. The project's core purpose is to foster environmental responsibility, expand the program's reach, and provide a comprehensive platform for schools to engage with environmental initiatives and track their progress.

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
-   **Architecture Pattern**: Feature-based modularization with delegation pattern for improved maintainability and AI editability (e.g., Schools Module).

#### Backend Modularization (November 2025)
To improve code maintainability, reduce file size, and enhance AI editing capabilities, the backend has been refactored from monolithic files into feature-based modules. The first module extracted is the **Schools Module**.

**Schools Module Structure:**
```
server/features/schools/
├── routes.ts          - All 46 school-related API endpoints
├── storage.ts         - SchoolStorage class with 30+ storage methods
├── utils/
│   └── countryMapping.ts - Country code normalization utilities
└── README.md          - Module documentation
```

**Delegation Pattern:**
- **Routes**: `server/routes.ts` mounts `schoolsRouter` from `server/features/schools/routes.ts`
  - All 46 endpoints (6 public, 19 authenticated, 21 admin) maintain exact same paths to preserve React Query cache keys
  - Middleware chains, validation, and error handling preserved identically
- **Storage**: `server/storage.ts` delegates all school methods to `SchoolStorage` singleton
  - IStorage interface unchanged for backward compatibility
  - All school CRUD operations, analytics, team management, photo consent handled by SchoolStorage
- **Utilities**: Re-export pattern ensures existing imports continue to work

**Benefits:**
- **Reduced File Size**: server/routes.ts reduced from 13,371 to ~11,000 lines; server/storage.ts reduced by ~1,000 lines
- **Improved AI Editability**: Smaller, focused files are easier for AI tools to analyze and modify
- **Better Maintainability**: Feature-based organization makes code easier to navigate and understand
- **Production Ready**: Comprehensive testing (27 curl tests + e2e UI tests) confirms 100% functionality preserved

**Schools Module Endpoints:**
- **Public** (6): Map endpoints, school list, domain checking, registration, image counts for case study wizard
- **Authenticated** (19): School details, team management, teacher invitations, verification requests, analytics, photo consent
- **Admin** (21): Schools list with pagination/filtering/sorting, bulk operations, evidence overrides, progression management

All endpoints tested and verified working correctly through the new module structure with no regressions.

### Authentication & Authorization
-   **Identity Providers**: Local password and Google OAuth.
-   **Role-Based Access Control (RBAC)**: Supports roles such as Teacher, Head Teacher, Pending Teacher, and Platform Admin. All teachers have equal access to team management features.
-   **User Management**: Includes hierarchical school team management and a token-based admin invitation system.
-   **Migrated User Onboarding**: Smart two-step onboarding flow for users migrated from legacy systems, handling password resets and profile confirmations intelligently.

### Key Data Models
Core entities include Users, Schools, Evidence, Audit Logs, Reduction Promises (Action Plans), Resources, Case Studies, Events, Media Assets, and Notifications.
-   **Content Visibility System**: Evidence and Resources support Public and Private visibility levels.

### UI/UX Decisions
-   **Design System**: Component-based design using Radix UI and shadcn/ui, custom favicon, consistent branding, and professional typography.
-   **Navigation**: Public and authenticated routes, tab-based dashboard, enhanced admin navigation.
-   **Core Features**: Comprehensive analytics, dynamic evidence requirements, student-led action plans, multi-step school registration (country-adaptive with i18n), and multi-language support (14 languages, including RTL) with persistent language preferences.
-   **Admin UI**: Features integrated evidence requirements with i18n, school detail management, manual school progression, Case Study Wizard, Resource Management, Data Import System with Legacy User Migration, multi-language event creator, bulk resource upload with AI auto-fill, and a Review Queue for Evidence, Audits, and Photo Consent. Admin searches now use 300ms debouncing, and school management features server-side pagination and sortable columns with cumulative progress tracking.
-   **User Interaction Tracking**: Tracks `lastActiveAt` and `hasInteracted` for engagement metrics and filtering.
-   **Plastic Waste Audit System**: Comprehensive 5-step audit workflow covering 11 room types with granular plastic item tracking and automatic annual calculations. Fully internationalized with separate audit submission and action plan development.
-   **Mobile Responsiveness**: Full mobile optimization for the admin panel.
-   **Legacy User Migration**: Comprehensive data migration tool with post-migration cleanup and progression fixes.
-   **Events System**: Full lifecycle management, multi-language landing pages, automated email reminders, capacity tracking, and calendar integration with auto-translate features for content.
-   **Inspiration Page**: Unified gallery of case studies and approved evidence with smart sorting/filtering.
-   **Resources System**: Enhanced page with language tabs, gradient-styled cards, badges, smart ordering, locked visibility, automatic notifications, and visual thumbnail previews for resource packs.
-   **Notifications System**: Real-time notifications via bell icon and dashboard banners.
-   **Content Management**: Printable forms with admin review, advanced filtering for the Evidence Gallery, and server-side image compression.
-   **Communication**: Enhanced bulk email editor with AI auto-translation, Contact Us, and Help Center pages. All email templates are overhauled and fully internationalized for user-facing communications across 14 languages.
-   **SEO Optimization**: Server-side meta tag injection, JSON-LD, proper heading hierarchy.
-   **User Profile Management**: Comprehensive page for editing user details, language, password, and account deletion.
-   **Legal Pages**: Fully internationalized Privacy Policy and Terms & Conditions.
-   **Real-Time Collaboration**: Admin dashboard features online presence tracking, document locking, admin chat, and activity history.
-   **Health Monitoring**: Internal uptime monitoring and a system health dashboard.
-   **Program Stages**: All program stages (Inspire, Investigate, Act) are fully unlocked and simultaneously accessible.
-   **Login Flow**: Schools and teachers redirect directly to the dashboard after login.
-   **Map Page**: Country codes display as full names in tooltips and statistics.
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