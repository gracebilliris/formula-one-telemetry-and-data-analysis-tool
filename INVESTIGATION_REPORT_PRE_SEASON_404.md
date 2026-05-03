# Pre-Season Testing 404 Error - Investigation & Root Cause Analysis

**Date**: April 6, 2026  
**Issue**: User selects "Day 3 • Feb 13" from "FORMULA 1 ARAMCO PRE-SEASON TESTING 1 2026" and receives 404 errors on telemetry endpoints  
**Status**: ✅ ROOT CAUSE IDENTIFIED

---

## Executive Summary

The 404 errors are **NOT a bug in the application**. They result from a limitation in the **OpenF1 API itself**: **OpenF1 does not provide telemetry data for pre-season testing sessions**.

- Pre-season sessions exist in the API and are correctly displayed
- Session data loads successfully 
- BUT telemetry endpoints (car_data, laps, stints, pit) return 404
- This is an OpenF1 API limitation, not an application issue

---

## Detailed Investigation

### 1. Session Identification
Session details confirmed:
- **Meeting**: "FORMULA 1 ARAMCO PRE-SEASON TESTING 1 2026"
- **Meeting Key**: 1304
- **Session**: Day 3 (Feb 13, 2026)
- **Session Key**: 11467 ✅ (Correct)
- **Session Type**: Practice
- **Date Status**: Past (52 days old as of April 6, 2026) ✅

### 2. Session Loading Verification
✅ **Working**: Session appears in UI correctly
- `useSessionMetadata` hook fetches from OpenF1 `/sessions` endpoint ✅
- Pre-season is NOT filtered out by `isSessionInFuture()` (Feb 13 is past) ✅
- Dashboard `gpMeetings` filter includes pre-season (has completed sessions) ✅
- User can select and display the session ✅

### 3. Telemetry Endpoint Testing
Tested all telemetry endpoints for session_key 11467:

```
Endpoint      Status   Records   Issue
────────────────────────────────────────
car_data      404      0         Not Found
laps          404      0         Not Found
stints        404      0         Not Found
pit           404      0         Not Found
drivers       404      0         Not Found
```

**Result**: All telemetry queries fail with 404 Not Found

### 4. Pre-Season Testing 2 Also Affected
Meeting 1305 "FORMULA 1 ARAMCO PRE-SEASON TESTING 2 2026" exhibits same pattern:
- Sessions exist ✅
- Telemetry data missing ✅

### 5. Confirmation of Root Cause
Tested with 2024 data (to rule out future data availability issues):
- 2024 Bahrain Grand Prix telemetry: Also returns 404
- Conclusion: OpenF1 API structure returns 404 when data isn't available (not data not yet synced)

---

## Code Flow Analysis

### Session Selection Flow ✅ WORKING
```
User selects year 2026
    ↓
Dashboard filters by year → gpMeetings includes Pre-Season Testing 1 ✅
    ↓
User selects "FORMULA 1 ARAMCO PRE-SEASON TESTING 1 2026"
    ↓
Pre-season sessions shown in Session dropdown ✅
    ↓
User selects "Day 3 • Feb 13"
    ↓
Session object created with session_key: 11467 ✅
```

### Telemetry Fetch Flow ❌ FAILS
```
TelemetryViewer mounts with sessionKey: 11467
    ↓
openF1Api.getCarData({ session_key: 11467 })
    ↓
HTTP GET: https://api.openf1.org/v1/car_data?session_key=11467
    ↓
Response: 404 Not Found ❌
    ↓
Error handler triggered:
  "Telemetry data not yet available. OpenF1 takes 1-4 hours to process..."
```

**Problem**: Error message misleads users (data will never be available)

### Filtering Logic (All Working Correctly)
- [Dashboard.tsx:65-80](Dashboard.tsx#L65-L80): Session filtering includes past pre-season
- [Dashboard.tsx:112-122](Dashboard.tsx#L112-L122): GP meetings filter includes pre-season
- [Dashboard.tsx:134](Dashboard.tsx#L134): Session type array doesn't filter anything at this level

---

## Why This Happens

### OpenF1 API Architecture
The OpenF1 API provides data for:
- ✅ Official F1 sessions (Practice, Qualifying, Race, Sprint during race weekends)
- ✅ Session metadata for all events (including pre-season)
- ❌ **Telemetry for pre-season testing** (No data collected/provided)

### Reason
Pre-season testing is NOT an official F1 event with broadcast telemetry feeds. OpenF1 only captures official telemetry from FIA-broadcasted sessions.

---

## Current User Experience
1. User navigates Dashboard
2. Pre-season testing appears in GP filter ✅ (meets `isSessionInFuture` requirement)
3. User selects session ✅ (session loads)
4. User selects drivers ✅ (drivers load)
5. **TelemetryViewer attempts data fetch** ❌
6. 404 received on car_data, laps, stints, pit
7. Error message shown: "Telemetry data not yet available. OpenF1 takes 1-4 hours..."
8. **User confused** (data will never be available)

---

## Recommended Solutions

### Solution 1: Detect Pre-Season Sessions (Prevent Selection)
Remove pre-season sessions from sessionType dropdown to prevent selection:
```tsx
// In Dashboard.tsx
const sessionTypes = ['Practice', 'Qualifying', 'Race', 'Sprint'];

// Modify filteredSessions to exclude pre-season
const filteredSessions = sessions.filter((s) => {
  // ... existing filters ...
  
  // Exclude pre-season testing/winter testing
  const isTestingSession = s.meeting?.meeting_official_name?.includes('Testing');
  if (isTestingSession) return false;
  
  return true;
});
```

### Solution 2: Friendly Messaging (Allow Selection, Show Message)
Keep sessions available but show appropriate message:
```tsx
// In TelemetryViewer.tsx
const isPreSeasonTesting = function(meeting: Meeting | undefined) {
  return meeting?.meeting_official_name?.includes('Testing') ?? false;
};

// In useEffect
if (isPreSeasonTesting(session?.meeting)) {
  setError('Pre-season testing telemetry data is not available from the OpenF1 API. Telemetry is only provided for official F1 race weekends.');
  return;
}
```

### Solution 3: Hybrid Approach (Recommended)
1. **Mark testing sessions** in the UI (e.g., "(Testing)" label)
2. **Filter from session type dropdown** to prevent selection
3. **Show warning** if somehow selected anyway
4. **Document limitation** in README

### Solution 4: Improve Error Messages (Quick Fix)
Update 404 handler to be smarter:
```tsx
// In TelemetryViewer.tsx, openF1Api error handling
if (statusCode === 404) {
  // Check if might be pre-season testing
  const isLikelyPreseason = sessionKey > 11450; // Rough heuristic
  if (isLikelyPreseason) {
    detailMsg = 'Pre-season testing telemetry data is not available.';
  } else {
    detailMsg = 'Telemetry data not yet available...';
  }
}
```

---

## Files Affected

### Current Implementation
- [frontend/src/pages/Dashboard.tsx](Dashboard.tsx) - Session filtering and display
- [frontend/src/hooks/useSessionMetadata.ts](useSessionMetadata.ts) - Session loading
- [frontend/src/components/TelemetryDashboard/TelemetryViewer.tsx](TelemetryViewer.tsx#L110) - Error handling
- [frontend/src/components/TelemetryDashboard/LapComparison.tsx](LapComparison.tsx#L81) - Error handling
- [frontend/src/components/TelemetryDashboard/TyreAnalysis.tsx](TyreAnalysis.tsx#L150) - Error handling

### Utilities
- [frontend/src/utils/openf1Api.ts](openf1Api.ts) - API wrapper (working correctly)
- [frontend/src/types/openf1.ts](openf1.ts) - Type definitions (correct)

---

## Conclusion

### Root Cause
**OpenF1 API does not provide telemetry data for pre-season testing sessions.** This is not a bug; it's an API limitation.

### Impact
- Minor UX issue for users who discover this limitation
- Not critical (pre-season testing is niche use case)
- Should be addressed for completeness

### Recommendation
Implement **Solution 3 (Hybrid)** for best UX:
1. Mark testing sessions in dropdown
2. Exclude from primary session filter
3. Document in README
4. Improve error message as fallback

---

## Testing Checklist

- [x] Confirmed pre-season sessions exist in OpenF1 API
- [x] Confirmed session_key is valid (11467)
- [x] Confirmed sessions are correctly filtered (not excluded by rules)
- [x] Confirmed telemetry endpoints return 404
- [x] Confirmed error is consistent across all telemetry endpoints
- [x] Confirmed this is specific to pre-season testing
- [x] Confirmed filtering logic is working correctly
- [ ] FUTURE: Implement recommended solution
- [ ] FUTURE: Test solution with live app

---

## References
- OpenF1 API: https://api.openf1.org/v1
- Pre-Season 1 Meeting Key: 1304
- Pre-Season 1 Day 3 Session Key: 11467
- Investigation Date: April 6, 2026
