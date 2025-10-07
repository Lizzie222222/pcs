# Plastic Clever Schools Web Application

## Overview
This project is a comprehensive web application for the Plastic Clever Schools program, aiming to reduce plastic usage in schools. It features a public-facing website and an integrated CRM system. The platform guides schools through a three-stage plastic reduction program (Inspire, Investigate, Act), offering educational resources, evidence submission tracking, case study showcasing, and administrative tools for managing school participation and progress. The business vision is to empower schools to become environmentally responsible and to scale the program's reach and impact.

## Recent Changes (October 2025)
### Evidence Deletion and Stage Lock Fixes (October 7, 2025)
-   **Evidence Deletion Feature**: Added ability for schools to delete pending evidence submissions with proper authorization
-   **Delete Endpoint**: Implemented DELETE /api/evidence/:id endpoint with school membership validation (any school member can delete pending evidence, not just the submitter)
-   **Delete UI**: Added delete button with trash icon to Recent Activity section for pending evidence, includes confirmation dialog before deletion
-   **Stage Lock Validation**: Fixed critical bug where evidence could be submitted to locked stages - now enforces stage progression (Inspire always unlocked, Investigate requires Inspire completion, Act requires Investigate completion)
-   **Authorization Fix**: Evidence submission now properly validates stage unlock status before accepting submissions
-   **Internationalization**: Added Greek and English translations for deletion confirmation dialogs and success/error messages

### Dashboard Evidence Progress Integration (October 7, 2025)
-   **Unified Progress Display**: Integrated evidence tracking directly into Program Progress stage cards, removing the redundant separate "Evidence Progress" section
-   **Evidence Metrics**: Each stage card now shows submitted count, approved/required ratio, and remaining evidence needed
-   **Accurate Progress Calculation**: Progress percentage now reflects actual evidence submission progress (approved/required ratio) instead of completion flags
-   **Stage-Specific Requirements**: Implemented correct evidence requirements per stage (Inspire: 3 approved, Investigate: 2 approved + quiz, Act: 3 approved)
-   **Internationalization**: All evidence tracking text fully internationalized with English and Greek translations
-   **Robust Error Handling**: Added data guards and type safety to prevent runtime errors with missing or incomplete evidence data

### PDF Preview and Authentication Fixes (October 7, 2025)
-   **CORS Configuration**: Added secure CORS middleware using `cors` package to allow credentials from approved origins (REPLIT_DOMAINS for dev, ALLOWED_ORIGINS for production)
-   **Admin ACL Bypass**: Enhanced ACL system with admin permissions - platform admins can now access all private objects regardless of ownership
-   **Public/Private Object Routing**: Improved `/objects/*` route to efficiently serve public objects without auth check and private objects with proper authentication
-   **PDF Preview Fix**: Resolved PDF preview errors for admins by ensuring pdf.js can properly authenticate when loading PDF documents

### File Thumbnail and Download Fixes (October 6, 2025)
-   **Thumbnail Display**: Fixed "Access Denied" errors for evidence file thumbnails by ensuring files are served through authenticated backend endpoint (`/objects/*`)
-   **Video Thumbnails**: Implemented HTML5 video element with `preload="metadata"` to display first frame of videos as thumbnails instead of generic placeholders
-   **Download Functionality**: Added `?download=true` query parameter to trigger proper download behavior with `Content-Disposition: attachment` header
-   **Filename Metadata**: Implemented filename storage in object metadata for accurate download filenames
-   **Resource Downloads**: Updated resource download handler to support object storage files with proper download headers

### Landing Page Restructuring (October 6, 2025)
-   **Page Simplification**: Removed extra sections to match exact document specification - eliminated "What is a Plastic Clever School" cards, "Social Proof", "Partnership", "Why Schools Choose Us" testimonials, and "Global Movement" sections.
-   **New Content Structure**: 
    - Hero section with student image and text box overlay
    - Impact Ribbon with database-driven statistics
    - Two-column section: Teacher testimonial (left) | "What is Plastic Clever Schools?" video (right)
    - Three-Stage Program (INSPIRE, INVESTIGATE, ACT)
    - "Ready to Make a Difference?" CTA with blue background
    - Instagram feed section
    - Footer
-   **Placeholder Content**: Teacher testimonial text and YouTube video ID need final content replacement before launch.

### Previous Landing Page Improvements
-   **Brand Alignment**: Updated to exact PCS brand specifications including precise hex colors and typography standards.
-   **Hero Section**: Replaced YouTube video with static student image, added semi-transparent text box backgrounds for improved readability.
-   **Post-it Note Popup**: Added yellow post-it style popup component for news/events announcements.
-   **Impact Ribbon**: Updated to display "X schools | Y countries | Z actions taken" format with database-driven statistics.
-   **Three-Stage Program**: Updated descriptions to exact stakeholder feedback wording for INSPIRE, INVESTIGATE, and ACT stages.
-   **Animation Updates**: Disabled scroll-reveal animations while preserving button hover/interaction effects per accessibility feedback.

### Registration Flow Simplification (October 6, 2025)
-   **Removed Join Existing School Button**: Simplified authenticated registration flow to show only "Register School" option, removing the "Join Existing School" button per requirements.

## User Preferences
Preferred communication style: Simple, everyday language.

## Testing Instructions
### Admin Test Account
For testing admin features and evidence file thumbnails:
- **Email**: admin@admin.com
- **Password**: admin1234

**Important**: When testing the admin panel, always use this email/password login instead of Google OAuth. The test account is pre-configured with admin privileges.

To recreate the test admin account if needed:
```bash
npx tsx scripts/setup-test-admin.ts
```

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
-   **Database**: PostgreSQL (Neon serverless) with Drizzle ORM for type-safe operations and migrations.
-   **Authentication**: Local password and Google OAuth, using Express sessions with PostgreSQL store.
-   **API**: RESTful with robust error handling.
-   **File Storage**: Google Cloud Storage for evidence, resources, and images, with custom object ACL for permissions.

### Authentication & Authorization
-   **Identity**: Local password and Google OAuth.
-   **Roles**: Teacher, Head Teacher, Pending Teacher, Platform Admin.
-   **Permissions**: Role-Based Access Control (RBAC) with protected routes and middleware (`isHeadTeacher`, `isSchoolMember`, `requireAdmin`).
-   **School Team Management**: Hierarchical user management allowing Head Teachers to invite teachers and manage their school's team, with workflows for invitations, self-requests, and admin assignments.
-   **Admin Invitations**: Token-based email invitation system allowing existing admins to invite new admins, with 7-day expiration and email verification.

### Key Data Models
-   **Users**: Teachers linked to schools with roles.
-   **Schools**: Program progress tracking.
-   **Evidence**: Stage-specific file submissions with approval workflows.
-   **Resources**: Educational materials with filtering.
-   **Case Studies**: Approved evidence for public display.
-   **SchoolUsers**: Junction table for user-school relationships with roles (`head_teacher`, `teacher`, `pending_teacher`) and verification status.
-   **TeacherInvitations**: Stores invitation details, tokens, and status.
-   **AdminInvitations**: Token-based admin invitation system with inviter tracking, expiration, and acceptance status.
-   **VerificationRequests**: Stores teacher requests to join schools with evidence and review status.

### UI/UX Decisions
-   **Color Schemes**: Exact PCS brand colors - PCS Navy #204969, PCS Blue #009ADE, Inspire Green #00BBB4, Investigate Yellow #FFC557, Act Red #FF595A.
-   **Typography**: Gilroy Bold for headers with -12 letter spacing (fallbacks: -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica Neue, Arial, sans-serif); Century Gothic Regular for body text (fallbacks: Futura, Apple Gothic, Trebuchet MS, sans-serif).
-   **Design Approach**: Component-based using Radix UI and shadcn/ui for consistency and accessibility.
-   **Page Structure**: Public routes for general access (`/`, `/resources`, `/inspiration`, `/schools-map`, `/invitations/:token`, `/admin-invitations/:token`) and authenticated routes for specific user roles (`/register`, `/dashboard/team-management`, `/admin`).
-   **Animations**: Scroll-reveal animations disabled per stakeholder feedback; button hover/press interactions preserved for user feedback.

## External Dependencies
### Core Infrastructure
-   **Database**: Neon PostgreSQL
-   **File Storage**: Google Cloud Storage
-   **Authentication**: Google OAuth

### Email Services
-   **Provider**: SendGrid for transactional emails (e.g., invitations, notifications).

### Development & Deployment
-   **Build Tool**: Vite
-   **Hosting/Deployment**: Replit
-   **Error Tracking**: Replit error monitoring and logging