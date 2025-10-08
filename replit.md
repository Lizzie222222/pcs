# Plastic Clever Schools Web Application

## Overview
This project is a web application for the Plastic Clever Schools program, designed to reduce plastic usage in schools. It features a public website and an integrated CRM system. The platform guides schools through a three-stage plastic reduction program (Inspire, Investigate, Act) by providing educational resources, tracking evidence submissions, showcasing case studies, and offering administrative tools for managing school participation and progress. The business vision is to empower schools to become environmentally responsible and to scale the program's reach and impact.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### Frontend
-   **Framework**: React with TypeScript (Vite)
-   **Routing**: Wouter
-   **State Management**: TanStack Query
-   **UI**: Radix UI primitives with shadcn/ui components, styled using Tailwind CSS (custom palette)
-   **Forms**: React Hook Form with Zod validation
-   **File Uploads**: Uppy.js for direct-to-cloud uploads with presigned URLs.
-   **Icons**: Lucide React
-   **Avatars**: DiceBear (thumbs style)

### Backend
-   **Runtime**: Node.js with Express.js
-   **Database**: PostgreSQL (Neon serverless) with Drizzle ORM.
-   **Authentication**: Local password and Google OAuth, using Express sessions with PostgreSQL store.
-   **API**: RESTful with robust error handling.
-   **File Storage**: Google Cloud Storage for evidence, resources, and images, with custom object ACL for permissions.

### Authentication & Authorization
-   **Identity**: Local password and Google OAuth.
-   **Roles**: Teacher, Head Teacher, Pending Teacher, Platform Admin.
-   **Permissions**: Role-Based Access Control (RBAC) with protected routes and middleware.
-   **School Team Management**: Hierarchical user management allowing Head Teachers to invite and manage school teams.
-   **Admin Invitations**: Token-based email invitation system for new admins.

### Key Data Models
-   **Users**: Teachers linked to schools with roles.
-   **Schools**: Program progress tracking with auto-calculated progress_percentage.
-   **Evidence**: Stage-specific file submissions with approval workflows, linked to specific evidence requirements.
-   **EvidenceRequirements**: Admin-configurable checklist of required evidence per stage.
-   **Audits**: Plastic waste audit data (4-part form) with approval workflow, status tracking, and analytics integration.
-   **Resources**: Educational materials.
-   **Case Studies**: Approved evidence for public display.
-   **SchoolUsers**: Junction table for user-school relationships.
-   **TeacherInvitations**: Stores invitation details.
-   **AdminInvitations**: Token-based admin invitation system.
-   **VerificationRequests**: Stores teacher requests to join schools.

### UI/UX Decisions
-   **Color Schemes**: Exact PCS brand colors (PCS Navy, PCS Blue, Inspire Green, Investigate Yellow, Act Red).
-   **Typography**: Gilroy Bold for headers, Century Gothic Regular for body text.
-   **Design Approach**: Component-based using Radix UI and shadcn/ui for consistency and accessibility.
-   **Page Structure**: Public routes for general access and authenticated routes for specific user roles.
-   **Animations**: Scroll-reveal animations disabled; button hover/press interactions preserved.
-   **Dashboard Features**: Tab-based navigation (Progress, Analytics, Resources, Team), dismissible evidence notifications, comprehensive analytics with visualizations, dynamic evidence requirements checklist, and integrated evidence tracking within stage cards.
-   **Landing Page**: Hero section, Impact Ribbon, teacher testimonial, program stage overview, CTA, and Instagram feed.
-   **Analytics System**: Plastic waste audit data automatically converts into visual analytics for both teacher and admin dashboards, showing total plastic items, location breakdowns, top problem plastics, waste management practices, and cross-school trends.

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