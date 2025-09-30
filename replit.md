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

## School Team Management System

### Overview
The platform now supports hierarchical school-based user management, allowing schools to have multiple teachers with different roles. Head teachers (school registrants) can invite colleagues and manage their school's teaching team, while platform admins maintain oversight across all schools.

### User Roles and Permissions

**Head Teacher (head_teacher)**
- Created automatically when a school is registered (from primary contact)
- Can invite other teachers to join their school
- Can approve/reject verification requests from teachers
- Can view and manage their school's team
- Full access to school dashboard and evidence submission

**Teacher (teacher)**  
- Added via invitation or verification request
- Must be verified to access school dashboard
- Can submit evidence and participate in school activities
- Cannot invite other teachers or manage team

**Pending Teacher (pending_teacher)**
- Temporary role for teachers awaiting verification
- Cannot access school dashboard until verified

**Platform Admin (isAdmin=true)**
- Can assign/remove teachers from any school
- Can override head teacher decisions
- Can approve/reject any verification request
- Full admin panel access with Teams management tab

### Teacher Onboarding Workflows

**Workflow 1: Invitation by Head Teacher**
1. Head teacher navigates to Team Management page
2. Enters colleague's email and optional welcome message
3. System generates secure invitation token with expiration (default 7 days)
4. Invitation email sent with personalized link: /invitations/{token}
5. Colleague clicks link and logs in with Google OAuth
6. Colleague accepts invitation (email must match)
7. Teacher automatically added to school with isVerified=true
8. Confirmation email sent to both parties

**Workflow 2: Self-Request Verification**
1. Teacher logs in and doesn't have a school association
2. Teacher submits verification request with:
   - School ID they want to join
   - Evidence/reason (e.g., "I'm the new science teacher")
3. Head teacher receives email notification
4. Head teacher reviews request in Team Management → Pending Requests
5. Head teacher approves or rejects with optional notes
6. Approval: Teacher added to school with isVerified=true
7. Rejection: Teacher receives email with feedback notes
8. Confirmation emails sent to both parties

**Workflow 3: Admin Assignment**
1. Platform admin navigates to Admin Panel → Teams tab
2. Selects school from dropdown
3. Enters teacher email and selects role (head_teacher or teacher)
4. System creates user if doesn't exist, assigns to school
5. Teacher immediately verified and can access dashboard

### Database Schema

**schoolUsers Table** (Junction table with roles)
- schoolId, userId (composite primary key)
- role: enum ('head_teacher', 'teacher', 'pending_teacher')
- isVerified: boolean (default false)
- invitedBy: varchar (nullable, references users.id)
- invitedAt: timestamp (nullable)
- joinedAt: timestamp
- Indexes: schoolId, userId, role

**teacherInvitations Table**
- id: serial (primary key)
- schoolId, email, invitedBy (foreign keys)
- token: varchar (unique, indexed - secure random 32 bytes)
- status: enum ('pending', 'accepted', 'expired')
- message: text (nullable - optional welcome message)
- expiresAt: timestamp (default 7 days from creation)
- createdAt, acceptedAt timestamps

**verificationRequests Table**
- id: serial (primary key)
- schoolId, userId (foreign keys)
- evidence: text (reason/proof of employment)
- status: enum ('pending', 'approved', 'rejected')
- reviewedBy: varchar (nullable, FK to users.id)
- reviewNotes: text (nullable - feedback from reviewer)
- reviewedAt: timestamp (nullable)
- createdAt timestamp

### API Endpoints

**Teacher Invitations**
- `POST /api/schools/:schoolId/invite-teacher` - Send invitation (requires head_teacher or admin)
- `GET /api/invitations/:token` - View invitation details (public)
- `POST /api/invitations/:token/accept` - Accept invitation (authenticated)
- `GET /api/schools/:schoolId/invitations` - List school invitations (requires head_teacher)

**Verification Requests**
- `POST /api/verification-requests` - Request to join school (authenticated)
- `GET /api/schools/:schoolId/verification-requests` - List requests (requires head_teacher)
- `PUT /api/verification-requests/:id/approve` - Approve request (requires head_teacher)
- `PUT /api/verification-requests/:id/reject` - Reject request (requires head_teacher, notes required)

**Admin Team Management**
- `POST /api/admin/schools/:schoolId/assign-teacher` - Assign teacher to school (admin only)
- `DELETE /api/admin/schools/:schoolId/teachers/:userId` - Remove teacher (admin only)
- `GET /api/admin/verification-requests` - List all pending requests (admin only)
- `PUT /api/admin/verification-requests/:id/approve` - Admin override approval
- `PUT /api/admin/verification-requests/:id/reject` - Admin override rejection

**School Teacher Management**
- `GET /api/schools/:schoolId/teachers` - List verified teachers (requires school member)
- `POST /api/schools/:schoolId/teachers/:userId/remove` - Remove teacher (requires head_teacher)

### Email Templates

**Teacher Invitation Email**
- Subject: "You've been invited to join {School Name} on Plastic Clever Schools"
- Contains: School name, inviter name, welcome message, accept button
- Link: /invitations/{token}
- Expiration warning: "This invitation expires in {days} days"

**Verification Request Notification** (to Head Teacher)
- Subject: "New Teacher Verification Request for {School Name}"
- Contains: Requester name/email, evidence provided, review button
- Link: /dashboard/team-management?tab=requests

**Verification Approval Email** (to Teacher)
- Subject: "Welcome to {School Name} on Plastic Clever Schools!"
- Contains: Approval message, reviewer notes (if provided), dashboard link

**Verification Rejection Email** (to Teacher)
- Subject: "Update on Your Request to Join {School Name}"
- Contains: Professional message, reviewer notes (important feedback), help center link

### Frontend Pages

**Team Management Page** (/dashboard/team-management)
- Accessible only to head teachers
- Three tabs:
  1. **Team Members**: View all verified teachers, remove members
  2. **Pending Requests**: Review verification requests, approve/reject with notes
  3. **Invite Teacher**: Form to send invitations via email with custom message

**Invitation Accept Page** (/invitations/:token)
- Public page (accessible without authentication)
- Shows invitation details: school name, inviter, message
- If not authenticated: Shows "Log In with Google" button
- If authenticated: Shows "Accept Invitation" button
- Validates email match and token expiration

**Admin Teams Tab** (/admin, Teams tab)
- Platform admin only
- Three sections:
  1. **Assign Teacher**: Form to assign teachers to any school
  2. **School Teacher Lists**: Accordion view of all schools with teacher lists and removal
  3. **Verification Requests**: Global view of all pending requests with admin controls

### Authentication Middleware

**isHeadTeacher** - Validates head_teacher role for school
- Checks req.params.schoolId and req.user.id
- Queries schoolUsers table for role='head_teacher' AND isVerified=true
- Allows platform admins to bypass
- Returns 401 (not authenticated), 400 (missing schoolId), or 403 (insufficient permissions)

**isSchoolMember** - Validates any verified membership
- Checks req.params.schoolId and req.user.id
- Queries schoolUsers table for any role with isVerified=true
- Attaches req.schoolRole for use in route handlers
- Allows platform admins to bypass

### Migration and Data Consistency

**Data Migration** (September 2025)
- Converted existing 'admin' role to 'head_teacher' in schoolUsers
- School primary contacts became head teachers
- Reconstructed 13 head teacher records from schools.primary_contact_id
- All existing teachers marked as verified

**Best Practices**
- Always use `npm run db:push --force` for schema changes (avoid manual migrations)
- Never change primary key types (serial vs varchar) to prevent data loss
- Use transactions for multi-table updates
- Validate invitation tokens before acceptance
- Expire invitations after 7 days for security
- Require rejection notes for feedback and audit trail

### Testing

**Test-Only Authentication Endpoint** (Development/Testing Only)
- `POST /api/test-auth/login` - Establishes session for E2E tests
- Only available when NODE_ENV='development' or REPLIT_CONTEXT='testing'
- Accepts: email, firstName, lastName, sub, isAdmin
- Creates user if doesn't exist, establishes Passport session
- Used by Playwright tests to bypass Google OAuth flow

**Manual Testing Workflow**
1. Register a school as head teacher
2. Navigate to Team Management
3. Invite a colleague via email
4. Log in as colleague (different browser/incognito)
5. Accept invitation via email link
6. Verify colleague appears in Team Members
7. Test verification request flow with third user
8. Approve request as head teacher
9. Verify admin can manage all teachers

### Security Considerations

**Invitation Security**
- Tokens: 32 bytes of cryptographically secure random data
- Expiration: 7 days default (configurable)
- Email validation: Must match authenticated user
- One-time use: Status changes to 'accepted' after use

**Role Validation**
- All team management endpoints check school membership
- Head teacher actions require verified head_teacher role
- Admin actions require isAdmin=true flag
- Database foreign keys ensure referential integrity

**Audit Trail**
- All invitations log invitedBy and timestamps
- All verifications log reviewedBy and reviewNotes
- SchoolUsers track invitedAt and joinedAt
- Email logs track all notifications sent

### Future Enhancements

**Planned Features**
- Multiple head teachers per school (co-principals)
- Role transfer (hand off head teacher role)
- Bulk teacher imports via CSV
- Teacher activity reports
- Team analytics dashboard
- Custom invitation templates per school
- Integration with school management systems

**Potential Improvements**
- Real-time notifications (WebSocket)
- Mobile app for team management
- Two-factor authentication for head teachers
- Teacher onboarding checklist
- Team collaboration features
- School-wide announcements

### Frontend Routes
- **Public Routes** (available to all users):
  - `/` - Landing page for visitors, Dashboard for authenticated users
  - `/resources` - Educational resources library
  - `/inspiration` - Case studies and success stories
  - `/case-study/:id` - Individual case study details
  - `/schools-map` - Interactive global map of participating schools
  - `/search` - Search functionality across schools and content
  - `/invitations/:token` - Teacher invitation acceptance page

- **Authenticated Routes** (login required):
  - `/register` - School registration form
  - `/dashboard/team-management` - Head teacher team management (head teachers only)
  - `/admin` - Platform administration panel (admin only)

This section documents the complete hierarchical team management system added September 2025.

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
- **Avatars**: DiceBear thumbs style for user profile pictures (deterministic generation based on email)

### Form and Validation
- **Form Library**: React Hook Form for performant form handling
- **Validation**: Zod for runtime type checking and validation
- **File Uploads**: Uppy.js for advanced file upload capabilities