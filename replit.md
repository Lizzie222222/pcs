# Plastic Clever Schools Web Application

## Overview
This web application supports the Plastic Clever Schools program, a three-stage initiative (Inspire, Investigate, Act) aimed at reducing plastic use in schools. It provides a public website and an integrated CRM, offering educational resources, evidence tracking, case studies, plastic reduction promise tracking, and administrative tools. The project's core purpose is to foster environmental responsibility, expand the program's reach, and provide a comprehensive platform for schools to engage with environmental initiatives and track their progress.

## Recent Changes
**October 30, 2025**: Multiple improvements and bug fixes
- **Unlocked all program stages**: Removed stage-based restrictions on evidence submission. Users can now submit evidence for any stage (Inspire, Investigate, Act) at any time, regardless of their school's current stage or completion status. This provides more flexibility for schools to work at their own pace and submit evidence as they create it.
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