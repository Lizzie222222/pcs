# Plastic Clever Schools Web Application

## Overview
The Plastic Clever Schools web application is a comprehensive platform designed to support a three-stage environmental initiative (Inspire, Investigate, Act) focused on reducing plastic use in schools. It offers a public-facing website and an integrated CRM, providing educational resources, tools for tracking progress and evidence, case studies, and administrative functionalities. The project aims to promote environmental stewardship, expand the program's reach, and provide schools with a robust system to engage with environmental initiatives and monitor their impact.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The application employs a modern web architecture with distinct frontend and backend components, a robust data model, and a comprehensive UI/UX design.

### Frontend
-   **Technology Stack**: React with TypeScript (Vite), Wouter for routing, TanStack Query for data fetching.
-   **UI/Styling**: Radix UI primitives, shadcn/ui components, Tailwind CSS, adhering to PCS brand colors and specific fonts (Gilroy Bold, Century Gothic Regular).
-   **Form Management**: React Hook Form with Zod validation.
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
-   **Role-Based Access Control (RBAC)**: Supports roles including Teacher, Head Teacher, Pending Teacher, and Platform Admin. Teachers (including Head Teachers) have equal access to team management features.
-   **User Management**: Hierarchical school team management and a token-based admin invitation system.
-   **Migrated User Onboarding**: Smart two-step onboarding for users migrated from a legacy system, intelligently handling password resets and profile confirmations.

### Key Data Models
Core entities include Users, Schools, Evidence (with approval and assignment), Audit Logs, Reduction Promises (Action Plans), Resources, Case Studies, Events, Event Banners, Media Assets, Printable Form Submissions, Import Batches, Migration Logs, Notifications, Document Locks, Chat Messages, Health Checks, and Uptime Metrics.
-   **Content Visibility**: Evidence and Resources support public and private visibility levels, ensuring strict access control for sensitive content.

### UI/UX Design & Core Features
-   **Design System**: Component-based design using Radix UI and shadcn/ui, custom favicon, consistent branding, and professional typography.
-   **Navigation**: Public and authenticated routes, tab-based dashboard, enhanced admin navigation.
-   **Internationalization**: Multi-language support (14 languages, including RTL) with language preferences persisting via database.
-   **Admin UI**: Integrated evidence requirements with i18n, school detail management, manual school progression, a Case Study Wizard, Resource Management, a Data Import System with Legacy User Migration, multi-language event creator, bulk resource upload with AI auto-fill, and a Review Queue. Admin audit and evidence submissions are automatically approved. Performance optimizations include debounced search, server-side pagination, and sortable columns with cumulative progress tracking for schools.
-   **User Interaction Tracking**: Tracks `lastActiveAt` and `hasInteracted` for engagement metrics and filtering in admin panels.
-   **Plastic Waste Audit System**: Comprehensive 5-step audit workflow covering multiple room types and plastic items, with daily and annual calculations, customizable "Other" options, and downloadable PDF forms. Audit submission is separate from Action Plan Development. All audit and action plan components are fully translated into all 14 platform languages.
-   **Mobile Responsiveness**: Full mobile optimization, including the admin panel.
-   **Legacy User Migration**: Comprehensive data migration tools from WordPress, including post-migration cleanup and integrity fixes for school completion flags and round statuses. A School Round Fixer system addresses illogical round states.
-   **Events System**: Full lifecycle management, multi-language landing pages, automated email reminders, capacity tracking, and calendar integration. Auto-translation for event content is supported.
-   **Inspiration Page**: Unified gallery of case studies and approved evidence with smart sorting/filtering.
-   **Resources System**: Enhanced page with language tabs, gradient-styled cards, badges, smart ordering, locked visibility for non-registered users, and automatic notifications for new resources.
-   **Notifications System**: Real-time notifications via bell icon and dashboard banners.
-   **Content Management**: Printable forms with admin review, advanced filtering for the Evidence Gallery, and server-side image compression for evidence uploads.
-   **Communication**: Enhanced bulk email editor with AI auto-translation, Contact Us, and Help Center pages. All user-facing email templates are fully translated based on user's preferred language.
-   **SEO Optimization**: Server-side meta tag injection, JSON-LD, proper heading hierarchy, and descriptive image alt text.
-   **User Profile Management**: Comprehensive page for editing user details, language, password, and account deletion.
-   **Legal Pages**: Fully internationalized Privacy Policy and Terms & Conditions.
-   **Real-Time Collaboration**: Admin dashboard features include online presence tracking, document locking, idle detection, viewing indicators, admin chat with typing indicators and @mentions, activity history, and evidence assignment.
-   **Health Monitoring**: Internal uptime monitoring and a system health dashboard.
-   **Program Stages**: All program stages (Inspire, Investigate, Act) are fully unlocked and simultaneously accessible.
-   **Login Flow**: Schools and teachers redirect directly to the dashboard after login.
-   **Map Page**: Country codes display as full names in tooltips and statistics.
-   **Registration Form**: Redesigned age selection with individual age toggle buttons.

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