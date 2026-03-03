

## Fix: Root Route and Preview White Page

### Problem
1. The preview shows a white page because the latest build hasn't fully deployed yet (404 errors on source files).
2. The root path (`/`) currently redirects to `/dashboard`, which then bounces unauthenticated users to `/login` -- causing an unnecessary redirect chain and confusion.

### Changes

**File: `src/App.tsx`**
- Change the root route from `<Navigate to="/dashboard" replace />` to `<Navigate to="/login" replace />`
- This ensures unauthenticated users land directly on the login page without an extra redirect hop
- Authenticated users on `/login` are already redirected to `/dashboard` by the Login page's `useEffect`

### After the fix
- Unauthenticated user visits `/` -> immediately sees `/login`
- Authenticated user visits `/` -> goes to `/login` -> auto-redirected to `/dashboard`
- All other routes remain unchanged

### Preview white page
The white page is a build deployment timing issue. The PWA `skipWaiting` fix from the previous edit will resolve future cache staleness. A hard refresh (`Ctrl+Shift+R`) of the preview should load the app once the build completes.

