# Plastic Clever Schools Web Application

## Overview
This project is a comprehensive web application for the Plastic Clever Schools program, aiming to reduce plastic usage in schools. It features a public-facing website and an integrated CRM system. The platform guides schools through a three-stage plastic reduction program (Inspire, Investigate, Act), offering educational resources, evidence submission tracking, case study showcasing, and administrative tools for managing school participation and progress. The business vision is to empower schools to become environmentally responsible and to scale the program's reach and impact.

## Recent Changes (October 2025)
### Landing Page Improvements
-   **Brand Alignment**: Updated to exact PCS brand specifications including precise hex colors and typography standards.
-   **Hero Section**: Replaced YouTube video with static student image, added semi-transparent text box backgrounds for improved readability.
-   **Post-it Note Popup**: Added yellow post-it style popup component for news/events announcements.
-   **Impact Ribbon**: Updated to display "X schools | Y countries | Z actions taken" format with database-driven statistics.
-   **Three-Stage Program**: Updated descriptions to exact stakeholder feedback wording for INSPIRE, INVESTIGATE, and ACT stages.
-   **Animation Updates**: Disabled scroll-reveal animations while preserving button hover/interaction effects per accessibility feedback.
-   **Future Enhancements**: Translation expansion to Dutch, French, and Indonesian marked for future iteration (i18n infrastructure already supports multi-language).

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