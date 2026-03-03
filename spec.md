# Vyoma Dispatch Tool

## Current State
New project. No existing files.

## Requested Changes (Diff)

### Add
- `index.html` – Login page with email/password, seeds admin on first load
- `admin.html` – Super admin dashboard: analytics, team members, all dispatches, reports/export
- `dashboard.html` – Dispatcher dashboard: personal entries, add/edit/status/email
- `styles.css` – Shared stylesheet: navy/gold theme, dark mode, responsive, modals, toasts, animations
- `app.js` – Shared JS: auth helpers, localStorage CRUD, session management, activity log, session timeout

### Modify
N/A

### Remove
N/A

## Implementation Plan

### Data Model (localStorage)
- `vyoma_users` – array of user objects: { id, name, email, password, role: 'admin'|'dispatcher'|'viewer', status: 'active'|'inactive', dateAdded }
- `vyoma_dispatches` – array of dispatch objects: { id, slNo, customerName, address, orderId, website, dispatchType, trackingNo, customerEmail, notes, status: 'Draft'|'In Process'|'Dispatched'|'Delivered'|'Completed', createdBy (userId), createdByName, createdAt, updatedAt }
- `vyoma_session` – { userId, email, name, role, loginTime }
- `vyoma_activity` – array of { id, userId, userName, action, entityId, entityType, details, timestamp }

### Shared (app.js)
- Seed super admin on first load
- Auth: login(), logout(), getSession(), checkSession()
- CRUD helpers: getUsers(), saveUsers(), getDispatches(), saveDispatches()
- Activity log: logActivity(action, details)
- Session timeout: 8-hour inactivity check
- Toast notifications: showToast(message, type)
- Confirmation dialog: confirmAction(message, callback)
- Dark mode toggle with localStorage persistence

### styles.css
- CSS custom properties for navy/gold theme and dark mode
- Layout: sidebar + main content
- Components: cards, tables, badges, modals, toasts, buttons, forms
- Responsive breakpoints for desktop and tablet
- Print styles for individual entry view
- Smooth animations (modal open/close, toast slide, badge transitions)

### index.html (Login)
- Centered login card with company name and subtitle
- Email + password fields with validation
- On submit: authenticate, set session, redirect by role
- Auto-seed admin if no users exist

### admin.html (Super Admin)
- Header with company name, logged-in user, dark mode toggle, logout
- Sidebar with: Dashboard, Team Members, All Dispatches, Reports & Export
- Each nav item shows entry count badge
- **Dashboard tab**: 5 stat cards, Chart.js charts (website breakdown + dispatch type), recent activity feed, date filter
- **Team Members tab**: table with add/edit/remove modals, role/status management
- **All Dispatches tab**: full table with filters (status, website, dispatch type, date range, search), status dropdown per row, bulk status update, send email button, delete
- **Reports tab**: summary stats, filters, CSV export, Excel export via SheetJS

### dashboard.html (Dispatcher)
- Header with company name, user name, dark mode toggle, logout
- 5 stat cards (user's entries only)
- Add New Entry button
- Search bar
- Entries table with edit/status/send/delete per row
- Add/Edit Entry modal with all fields
- Email template modal (pre-filled, copy/gmail/mark-sent)
- Status flow enforcement (Draft→In Process→Dispatched→Delivered→Completed)
- Completed entries locked (no further changes)
