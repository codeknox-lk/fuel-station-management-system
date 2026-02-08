# Lint Fix Plan

Based on the lint warnings identified, here are the 22 warnings to fix:

## Files with Issues

### 1. settings/tolerance/page.tsx (2 warnings)

- Line 50: React Hook useEffect missing dependency: 'fetchConfig'
- Line 54: React Hook useEffect missing dependency: 'calculateExamples'

### 2. salary/office-staff/[id]/page.tsx (multiple warnings)

- Unused imports: DialogTrigger, CardHeader, CardTitle, Zap
- Unused variable: loading, setSuccess

### 3. Other files with unused variables

- error variables in catch blocks
- setSuccess variables that are declared but never used

## Fix Strategy

1. **React Hook Dependencies**: Add missing dependencies to useEffect or use useCallback
2. **Unused Imports**: Remove from import statements
3. **Unused Variables**: Remove declarations or prefix with underscore if needed for API

## Implementation Order

1. Fix React Hook dependencies (6 warnings)
2. Remove unused imports (6 warnings)
3. Remove unused variables (10 warnings)
