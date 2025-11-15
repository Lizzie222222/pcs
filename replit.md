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
-   **Real-Time Collaboration**: Admin dashboard features online presence tracking, document locking, admin chat, and activity history. WebSocket connections are restricted to admin and partner users only. Client-side role checks prevent non-admin connection attempts. Server-side rate limiting (5 attempts per minute, 5-minute cooldown) stops repeated failed connections from outdated cached JavaScript, encouraging browser refreshes while preventing expensive server costs.
-   **Health Monitoring**: Internal uptime monitoring and a system health dashboard.
-   **Program Stages**: All program stages (Inspire, Investigate, Act) are fully unlocked and simultaneously accessible.
-   **Registration Form**: Redesigned age selection for granular student demographic tracking.
-   **Bonus Evidence System**: Tracks bonus/additional evidence that doesn't count toward stage completion requirements, with admin tools for triage.

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