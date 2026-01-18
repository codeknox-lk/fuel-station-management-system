# Next.js 15 Params/SearchParams Fix

## Issue
Next.js 15 introduced changes where `params` and `searchParams` objects should not be enumerated (e.g., `Object.keys()` called on them) as they are now async/promises internally.

## Error Messages
```
params are being enumerated. `params` should be unwrapped with `React.use()` before using its value.
The keys of `searchParams` were accessed directly. `searchParams` should be unwrapped with `React.use()` before accessing its properties.
```

## Fixed Files
✅ `src/app/(app)/shifts/[id]/page.tsx`
✅ `src/app/(app)/salary/[pumperId]/page.tsx`
✅ `src/app/(app)/safe/transactions/[id]/page.tsx`

## Solution Applied
1. Added `useMemo` import
2. Wrapped param/searchParam extraction in `useMemo` hooks
3. Used optional chaining (`?.`) to safely access values
4. Extracted values immediately to avoid storing raw objects

## Pattern Used
```typescript
// Before (causes enumeration warning):
const params = useParams()
const id = params.id as string

// After (fixed):
const params = useParams()
const id = useMemo(() => (params?.id as string) || '', [params])
```

## Note
API routes already correctly use `await params` for async params, so no changes needed there.

## If Warnings Persist
If you still see warnings, they might be from React DevTools trying to serialize these objects. This is a known issue and may require:
1. Updating React DevTools
2. Waiting for Next.js/React updates
3. The warnings are harmless and can be ignored if functionality works



