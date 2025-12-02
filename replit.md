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

### Backend
-   **Runtime**: Node.js with Express.js.
-   **Database**: PostgreSQL (Neon serverless) managed with Drizzle ORM.
-   **Authentication**: Local password and Google OAuth, utilizing Express sessions.
-   **API**: RESTful architecture.
-   **File Storage**: Google Cloud Storage.
-   **Architecture Pattern**: Feature-based modularization with delegation pattern.

### Authentication & Authorization
-   **Identity Providers**: Local password and Google OAuth.
-   **Role-Based Access Control (RBAC)**: Supports roles such as Teacher, Head Teacher, Pending Teacher, and Platform Admin.
-   **User Management**: Hierarchical school team management, token-based admin invitation, and smart two-step onboarding for migrated users.

### System Design Choices
-   **Key Data Models**: Users, Schools, Evidence, Audit Logs, Reduction Promises (Action Plans), Resources, Case Studies, Events, Media Assets, Notifications. Includes a content visibility system for evidence and resources.
-   **UI/UX**: Component-based design with Radix UI and shadcn/ui, custom favicon, consistent branding, professional typography, and multi-language support (14 languages, including RTL).
-   **Admin UI**: Enhanced navigation, comprehensive analytics, dynamic evidence requirements, student-led action plans, multi-step school registration, integrated evidence requirements with i18n, school detail management, manual school progression, Case Study Wizard, Resource Management, Data Import, multi-language event creator, bulk resource upload with AI auto-fill, and a Review Queue for Evidence, Audits, and Photo Consent. Features like debounced search, server-side pagination, sortable columns, and an enhanced School Quick View dialog.
-   **Admin Override System**: Allows admins to create approved evidence records directly, fully integrated into dashboards and progression tracking with transactional safety.
-   **User Interaction Tracking**: Tracks `lastActiveAt`, `lastActiveBy`, `lastActionType`, `hasInteracted` for engagement metrics and filtering. Analytics distinguish between teacher and PCS team activity, and an "Active Schools (Last Month)" metric with CSV export.
-   **School Activity History**: Comprehensive audit log in admin school profiles tracking user actions, with filtering, pagination, and human-readable labels.
-   **Plastic Waste Audit System**: 5-step audit workflow with 11 room types, granular plastic item tracking, and automatic annual calculations, fully internationalized.
-   **Mobile Responsiveness**: Full mobile optimization for the admin panel.
-   **Events System**: Full lifecycle management, multi-language landing pages, automated email reminders, capacity tracking, and calendar integration.
-   **Inspiration Page**: Unified gallery of case studies and approved evidence with smart sorting/filtering.
-   **Resources System**: Enhanced page with language tabs, gradient-styled cards, badges, smart ordering, locked visibility, automatic notifications, visual thumbnail previews, custom pack cover images (with fallback), curriculum stage filtering, and theme terminology alignment.
-   **Notifications System**: Real-time notifications via bell icon and dashboard banners.
-   **Content Management**: Printable forms with admin review, advanced filtering for Evidence Gallery, and server-side image compression.
-   **Communication**: Enhanced bulk email editor with AI auto-translation, overhauled i18n email templates, and recipient groups.
-   **SEO Optimization**: Server-side meta tag injection, JSON-LD, proper heading hierarchy.
-   **User Profile Management**: Comprehensive page for editing user details, language, password, and account deletion.
-   **Legal Pages**: Fully internationalized Privacy Policy and Terms & Conditions.
-   **Real-Time Collaboration**: Admin dashboard features online presence tracking, document locking, admin chat, and activity history. WebSocket connections are restricted to admin/partner users with client-side role checks and server-side rate limiting.
-   **Program Stages**: All program stages (Inspire, Investigate, Act) are fully unlocked and simultaneously accessible.
-   **Round Completion Celebration System**: Confetti animation and persistent "Start Next Round" card for schools completing all stages, allowing manual progression to the next round.
-   **Registration Form**: Redesigned age selection and required school type selection for granular demographic tracking and targeted recommendations.
-   **Bonus Evidence System**: Tracks bonus/additional evidence not counting toward stage completion.
-   **Action Plan Approval Workflow**: Action plans require admin approval, default to 'pending', with a review queue for filtering, bulk actions, and detail views. Admin overrides are recognized in progression logic.
-   **Audit & Action Plan Progression**: Approval of audits or action plans automatically triggers school progression checks for round advancement, certificates, and celebration emails.
-   **Round Progression Safety**: Manual advancement of schools resets stage completion flags, progress percentage, and celebration dismissal status to prevent stale data.
-   **Configurable Evidence Requirements**: `requirementType` enum determines UI behavior (standard/audit/action_plan), allowing dynamic configuration via admin panel and portability.
-   **Duplicate School Detection System**: Automatically detects potential duplicate school registrations by email domain and postcode, with admin alerts, review, dismiss, and merge functionalities. Includes enhanced user merge during school merge operations.

## External Dependencies
-   **Database**: Neon PostgreSQL
-   **File Storage**: Google Cloud Storage
-   **Authentication**: Google OAuth
-   **Email Services**: SendGrid (with automatic contact sync to Marketing Contacts)
-   **Build Tool**: Vite
-   **Hosting/Deployment**: Replit
-   **AI Integration**: OpenAI GPT-4o-mini
-   **PDF Generation**: Puppeteer
-   **Image Processing**: Sharp library