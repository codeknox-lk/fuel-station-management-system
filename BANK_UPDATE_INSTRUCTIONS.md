# BANK UPDATE TESTING INSTRUCTIONS

## ✅ SERVER RESTARTED - FOLLOW THESE EXACT STEPS:

### Step 1: Clear Browser Cache
1. Open your app in browser
2. Press `Ctrl + Shift + Delete`
3. Select "Cached images and files"
4. Click "Clear data"
5. Close browser
6. Open browser again and go to http://localhost:3000

### Step 2: Open Browser DevTools
1. Press `F12`
2. Go to **"Network"** tab
3. Check "Disable cache" checkbox
4. Go to **"Console"** tab

### Step 3: Navigate to Banks
1. Go to Settings → Banks
2. Look in Console for: `Fetched banks data:`
3. Verify you see Pan Asia Bank with test data

### Step 4: Edit Hatton National Bank
1. Click the edit (pencil) icon on "Hatton National Bank"
2. Look in Console for: `Editing bank:` and `Setting form data:`
3. Verify the form shows existing data

### Step 5: Add Missing Fields
Fill in these fields:
- **Contact Person**: `Bank Manager`
- **Phone**: `0112345678`
- **Email**: `manager@hnb.lk`

### Step 6: Click "Update Bank"
1. Look in Console for:
   - `Submitting bank data:`
   - `Response:`

### Step 7: Check Network Tab
1. Look for the PUT request to `/api/banks/[id]`
2. Click on it
3. Go to "Payload" tab
4. Verify all fields are being sent

### Step 8: Check Server Terminal
Look for:
```
=== BANK UPDATE API ===
Bank ID: ...
Request body: { ... }
Update data: { ... }
Updated bank: { ... }
======================
```

## 🔍 IF STILL NOT WORKING:

Take a screenshot of:
1. Browser Console (showing the logs)
2. Network tab (showing the request payload)
3. Server terminal (showing the API logs)

And share them!
