# Vyoma Dispatch Tool

## Current State
- 3-page vanilla HTML/CSS/JS app (index.html, admin.html, dashboard.html, app.js, styles.css)
- Roles: admin (super admin), dispatcher (data entry + status management)
- Admin can add team members, view analytics, manage dispatches, export CSV/Excel
- Dispatcher can create/edit dispatch entries, send email templates, mark complete (only after email sent)
- Static dropdown lists: WEBSITES, NAME_TYPES, DISPATCH_TYPES hardcoded in app.js
- No task priority field
- No Assigner role
- No bulk import (Excel upload) for creating entries
- No WhatsApp template option
- No per-dispatch-type tracking URL in email
- Admin dashboard date filter works but requires manual refresh (not reactive on login)
- No configurable dropdown management in admin

## Requested Changes (Diff)

### Add
- **Assigner role**: New role between admin and dispatcher. Assigner can create tasks and assign them to a specific dispatcher. Assigner has own dashboard view on dashboard.html showing their assigned tasks list.
- **Dispatcher task inbox**: Dispatcher dashboard shows two tabs — "My Entries" (self-created) and "Assigned to Me" (tasks assigned by an Assigner, read-only except status/email/complete actions).
- **Task Priority field**: Priority dropdown on every dispatch entry — Emergency, Urgent, Normal, Moderate (with color badges). Visible in all tables and filterable.
- **Admin Dropdown Manager**: New "Settings" tab in admin panel. Super admin can add/remove items to WEBSITES, NAME_TYPES, DISPATCH_TYPES, and PRIORITIES lists. Changes persist to localStorage and are immediately reflected in dispatcher/assigner forms.
- **Bulk Entry for Assigner**: Assigner dashboard has "Bulk Import" button. Downloads a sample Excel template with required columns. User fills it and uploads same file to create multiple tasks at once. Includes a dispatcher assignment dropdown per row or a global dispatcher selector before upload.
- **Post Card / Gift tracking rule**: If dispatch type is "Post Card" or "Gift", tracking number field is hidden/not required. For all other dispatch types, tracking number is mandatory.
- **Tracking URL per dispatch type in email**: Email template includes a tracking URL line. Super admin can configure a tracking URL per dispatch type in Settings tab (e.g. Post Office → https://www.indiapost.gov.in/). If no URL configured for a type, line is omitted.
- **WhatsApp template option**: In the email/notification modal, if customer email is empty OR dispatcher chooses WhatsApp, a "Send via WhatsApp" button opens a pre-filled wa.me link with the same message content.
- **Date fix on admin dashboard login**: Admin dashboard stat cards and charts must load immediately on login without needing a second entry to trigger data refresh. Fix reactive data loading on init.

### Modify
- `checkSession`: Add 'assigner' as valid non-admin role redirecting to dashboard.html
- `buildEmailBody`: Include tracking URL for the dispatch type if configured in settings
- `saveEntry` (dashboard): Enforce tracking number required for non-PostCard/Gift dispatch types
- Admin team member modal: Add 'assigner' option to Role dropdown
- Login redirect: assigner role goes to dashboard.html (same as dispatcher)
- Admin dashboard `loadDashboard()`: Fix so it runs on initial page load and data appears immediately

### Remove
- Nothing removed; all existing features retained

## Implementation Plan
1. **app.js** changes:
   - Add `KEYS.settings` for custom dropdown lists and tracking URLs
   - Add helper `getSettings() / saveSettings()` and `getDropdownList(key)` returning custom or default lists
   - Add `PRIORITIES` default array: ['Emergency', 'Urgent', 'Normal', 'Moderate']
   - Update `createDispatch` / `updateDispatch` to include `priority`, `assignedTo`, `assignedToName`, `assignedByName` fields
   - Update `buildEmailBody` to include tracking URL from settings if available
   - Update `checkSession` to allow 'assigner' through to dashboard.html
   - Fix date display bug: ensure `loadDashboard()` is called after DOM ready in admin init

2. **admin.html** changes:
   - Add 'assigner' to role dropdown in team member modal
   - Add "Settings" nav tab
   - Settings tab: Dropdown Manager section with add/remove for each list (websites, name types, dispatch types, priorities)
   - Settings tab: Tracking URL Manager — table of dispatch types with URL input per type, save button
   - Fix dashboard init: call `loadDashboard()` inside `DOMContentLoaded` or ensure it runs after data is available
   - Add priority filter in All Dispatches tab
   - Show priority badge in dispatches table

3. **dashboard.html** changes:
   - On init, detect role: 'assigner' shows Assigner view; 'dispatcher' shows Dispatcher view
   - **Assigner view**: 
     - "Assign Task" button opens entry modal with dispatcher assignment dropdown
     - "Bulk Import" button: downloads sample .xlsx template; upload button parses file and creates tasks
     - Table shows tasks assigned by this assigner with dispatcher column
   - **Dispatcher view**:
     - Two tabs: "My Entries" and "Assigned to Me"
     - "Assigned to Me" tab shows tasks where `assignedTo === SESSION.userId`
   - Entry modal: add Priority dropdown, add Dispatcher selector (for assigner role only)
   - Tracking field: hide/show and toggle required based on dispatch type selection (PostCard/Gift = hidden, others = required)
   - Email/WhatsApp modal: add "Send via WhatsApp" button that opens wa.me link with message body
   - Show priority badges in table rows
