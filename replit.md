# Plastic Clever Schools Web Application

## Overview

This is a comprehensive web application for the Plastic Clever Schools program, featuring both a public-facing website and an integrated CRM system. The application helps schools join a plastic reduction program with three progressive stages: Inspire, Investigate, and Act. The platform includes educational resource management, evidence submission tracking, case study showcasing, and administrative tools for managing school participation and progress.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing with conditional rendering based on authentication
- **State Management**: TanStack Query for server state management and caching
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with custom color palette matching the Plastic Clever Schools brand
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Local authentication with password/Google OAuth for secure user authentication
- **Session Management**: Express sessions with PostgreSQL session store
- **API Design**: RESTful API with proper HTTP status codes and error handling

### Data Storage Solutions
- **Primary Database**: PostgreSQL hosted on Neon with connection pooling
- **Schema Management**: Drizzle migrations for database versioning
- **File Storage**: Google Cloud Storage for evidence files, resources, and images
- **Object ACL**: Custom access control system for file permissions

### Authentication and Authorization
- **Identity Provider**: Local password authentication and Google OAuth integration
- **Session Storage**: Secure HTTP-only cookies with PostgreSQL backing
- **Role-Based Access**: Teacher and admin roles with different permission levels
- **Protected Routes**: Authentication middleware for API endpoints

### Key Data Models
- **Users**: Teacher accounts linked to schools with role-based permissions
- **Schools**: Institution records with program progress tracking
- **Evidence**: File submissions for each program stage with approval workflow
- **Resources**: Educational materials with filtering by country, language, and age range
- **Case Studies**: Approved evidence promoted for public inspiration

### File Upload System
- **Upload Handler**: Uppy.js with direct-to-cloud uploads via presigned URLs
- **File Processing**: Automatic file type validation and size limits
- **Access Control**: Custom object ACL system for granular file permissions

## External Dependencies

### Core Infrastructure
- **Database**: Neon PostgreSQL serverless database
- **Authentication**: Local authentication system with Google OAuth support
- **File Storage**: Google Cloud Storage for object storage

### Email Services
- **Email Provider**: SendGrid for transactional emails
- **Email Types**: Welcome emails, evidence approval/rejection notifications

### Development Tools
- **Build System**: Vite with TypeScript support
- **Deployment**: Replit hosting with automatic deployments
- **Error Tracking**: Replit error monitoring and logging

### UI and Styling
- **Component Library**: Radix UI for accessible components
- **Design System**: shadcn/ui for consistent styling
- **CSS Framework**: Tailwind CSS with custom theme configuration
- **Icons**: Lucide React for consistent iconography

### Form and Validation
- **Form Library**: React Hook Form for performant form handling
- **Validation**: Zod for runtime type checking and validation
- **File Uploads**: Uppy.js for advanced file upload capabilities