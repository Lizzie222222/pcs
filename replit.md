# Plastic Clever Schools Web Application

## Overview
This project is a web application for the Plastic Clever Schools program, aiming to reduce plastic usage in schools through a three-stage program (Inspire, Investigate, Act). It offers a public website and an integrated CRM system providing educational resources, evidence tracking, case studies, reduction promise tracking, and administrative tools. The core purpose is to empower schools in environmental responsibility and scale the program's impact.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### Frontend
-   **Framework**: React with TypeScript (Vite)
-   **Routing**: Wouter
-   **State Management**: TanStack Query
-   **UI**: Radix UI primitives with shadcn/ui components, styled using Tailwind CSS (custom palette)
-   **Forms**: React Hook Form with Zod validation
-   **File Uploads**: Uppy.js for direct-to-cloud uploads.
-   **Icons**: Lucide React
-   **Avatars**: DiceBear (thumbs style)

### Backend
-   **Runtime**: Node.js with Express.js
-   **Database**: PostgreSQL (Neon serverless) with Drizzle ORM.
-   **Authentication**: Local password and Google OAuth, using Express sessions with PostgreSQL store.
-   **API**: RESTful with robust error handling.
-   **File Storage**: Google Cloud Storage for evidence, resources, and images.

### Authentication & Authorization
-   **Identity**: Local password and Google OAuth.
-   **Roles**: Teacher, Head Teacher, Pending Teacher, Platform Admin.
-   **Permissions**: Role-Based Access Control (RBAC).
-   **School Team Management**: Hierarchical user management.
-   **Admin Invitations**: Token-based email invitation system.

### Key Data Models
-   **Users**: Teachers linked to schools with roles.
-   **Schools**: Program progress tracking.
-   **Evidence**: Stage-specific file submissions with approval workflows.
-   **EvidenceRequirements**: Admin-configurable checklist.
-   **Audits**: Plastic waste audit data with approval workflow and analytics integration.
-   **ReductionPromises**: Plastic reduction commitments with impact calculations.
-   **Resources**: Educational materials.
-   **Case Studies**: Approved evidence for public display.

### UI/UX Decisions
-   **Color Schemes**: PCS brand colors (Navy, Blue, Inspire Green, Investigate Yellow, Act Red).
-   **Typography**: Gilroy Bold for headers, Century Gothic Regular for body text.
-   **Design Approach**: Component-based using Radix UI and shadcn/ui.
-   **Page Structure**: Public and authenticated routes.
-   **Dashboard Features**: Tab-based navigation (Progress, Analytics, Resources, Team, Our Promises), dismissible notifications, comprehensive analytics with visualizations, dynamic evidence requirements, and reduction promises management.
-   **Landing Page**: Hero section, Impact Ribbon, teacher testimonial, program stage overview, CTA, and Instagram feed.
-   **Analytics System**: Plastic waste audit data automatically converts into visual analytics for both teacher and admin dashboards.
-   **Reduction Promises System**: Schools commit to reducing plastic items, with audit integration, dashboard management, impact tracking (ocean-themed and environmental metrics), and admin analytics.
-   **Multi-Step School Registration**: Redesigned 3-step wizard for school registration, adapting fields based on country.
-   **Multi-Language Support**: Comprehensive support for 14 languages with lazy-loading, native language names, and user preference persistence across sessions.
-   **Admin UI Improvements**: Integrated Evidence Requirements as a tab within the admin page, improved navigation, and reorganized analytics dashboard with nested tabs.
-   **Analytics Enhancements**: Improved data quality, added date range filtering, integrated OpenAI GPT-5 for AI-powered insights, and implemented PDF export functionality with PCS branding.

## External Dependencies
### Core Infrastructure
-   **Database**: Neon PostgreSQL
-   **File Storage**: Google Cloud Storage
-   **Authentication**: Google OAuth

### Email Services
-   **Provider**: SendGrid for transactional emails.

### Development & Deployment
-   **Build Tool**: Vite
-   **Hosting/Deployment**: Replit
-   **AI Integration**: OpenAI GPT-5
-   **PDF Generation**: Puppeteer