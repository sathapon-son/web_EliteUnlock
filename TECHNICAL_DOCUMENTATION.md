# Technical Documentation: Real-time Listeners

## Architecture Overview

### Listener Lifecycle

```
┌─────────────────────────────────────┐
│ Admin Credit Modal Opens            │
│ (adminCreditModal shows)            │
└────────────┬────────────────────────┘
             │
             ├─ loadTopUsersList() ─┐
             │                       ├─ Start listeners
             └─ loadCreditRequestHistory() ─┘
                                    │
                                    ▼
             ┌─────────────────────────────────┐
             │ Real-time Listeners Active      │
             │ TOP_USERS_UNSUB                 │
             │ CREDIT_HISTORY_UNSUB            │
             └────────────┬────────────────────┘
                         │
                         │ (Firestore changes detected)
                         │
                         ▼
             ┌─────────────────────────────────┐
             │ onSnapshot Callback Triggers    │
             │ - Fetch new data                │
             │ - Process & filter              │
             │ - Update DOM                    │
             └────────────┬────────────────────┘
                         │
                         │ (repeat until modal closes)
                         │
             ┌─────────────────────────────────┐
             │ Admin Closes Credit Modal       │
             │ Cleanup triggered               │
             └────────────┬────────────────────┘
                         │
                         ▼
             ┌─────────────────────────────────┐
             │ TOP_USERS_UNSUB() called        │
             │ CREDIT_HISTORY_UNSUB() called   │
             │ Listeners unsubscribed          │
             └─────────────────────────────────┘
```

## Global Variables

### Listener Subscriptions
```javascript
let TOP_USERS_UNSUB = null;      // Function to unsubscribe from top users listener
let CREDIT_HISTORY_UNSUB = null; // Function to unsubscribe from history listener
```

These are set when listeners are active and called to clean up when done.

## Function Reference

### listenToTopUsers()
**Location:** Line ~3870  
**Trigger:** Called from `loadTopUsersList()`

**Firestore Queries:**
```javascript
// Primary: Watch all users
collection(db, 'users')

// Secondary: Watch approved credit requests
query(collection(db, 'creditRequests'), where('status', '==', 'approved'))
```

**Processing:**
1. Collects current credits from all users
2. Sums accumulated credits from approved requests
3. Filters out bot accounts
4. Sorts descending by accumulated credits
5. Takes top 30
6. Renders to `#topUsersList`

**DOM Target:** `#topUsersList` (`<tbody>` in admin modal)

**Update Trigger:** 
- User document changed (credits updated)
- Credit request status changed to/from 'approved'
- New credit request created with 'approved' status

### listenToCreditHistory()
**Location:** Line ~3977  
**Trigger:** Called from `loadCreditRequestHistory()`

**Firestore Query:**
```javascript
query(
  collection(db, 'creditRequests'),
  orderBy('createdAt', 'desc'),
  limit(20)
)
```

**Processing:**
1. Listens to latest 20 credit requests
2. Formats status with emoji and color
3. Converts timestamp to Thai locale
4. Renders to `#creditHistoryList`

**DOM Target:** `#creditHistoryList` (div in admin modal)

**Update Trigger:**
- New credit request created
- Request status changed (any status)
- Request data modified

## Data Flow Diagram

### Top Users List
```
users collection (all docs)
         │
         └─ onSnapshot ─┐
                        │
                        ├─ Extract: email, credits
                        │
                        ▼
creditRequests (approved only)
         │
         └─ onSnapshot ─┤
                        │
                        ├─ Sum by userEmail
                        │
                        ▼
            Merge data & calculate
                        │
                        ├─ Filter excluded users
                        ├─ Sort by accumulated DESC
                        ├─ Take top 30
                        │
                        ▼
                  Update #topUsersList
```

### Credit History
```
creditRequests (latest 20, desc by createdAt)
         │
         └─ onSnapshot ─┐
                        │
                        ├─ For each document:
                        │  ├─ Extract status
                        │  ├─ Format badge
                        │  ├─ Convert date
                        │  └─ Create HTML
                        │
                        ▼
                  Append to #creditHistoryList
```

## Error Handling

### Listener Failures
Both functions wrap listeners in try-catch:
```javascript
try {
  // Setup listener
} catch (err) {
  console.error('Error...', err);
  // Show error in UI
}
```

### Cleanup Safety
Before starting new listener, old one is unsubscribed:
```javascript
if (TOP_USERS_UNSUB) {
  TOP_USERS_UNSUB();        // Call unsubscribe function
  TOP_USERS_UNSUB = null;   // Reset reference
}
```

## Performance Considerations

### Listener Scope
- **Top Users:** Watches ENTIRE users collection (can be optimized)
- **History:** Watches top 20 credit requests (efficient)

### Potential Optimizations
1. **Top Users:** Add index on creditRequests(status, userEmail)
2. **Pagination:** Implement pagination instead of limit(20)
3. **Caching:** Cache user emails to reduce calculations
4. **Debouncing:** Debounce DOM updates if listener fires frequently

### Firestore Costs
Each listener = 1 read per update:
- Top Users: ~2 listeners (users + creditRequests)
- History: ~1 listener (creditRequests)
- **Total:** 3 active listeners when modal is open

## Testing Guide

### Unit Testing Scenarios

**Scenario 1: User Credit Update**
```javascript
// When: User document updated with new credits value
// Expected: #topUsersList re-renders with new credit amount
```

**Scenario 2: New Approved Request**
```javascript
// When: creditRequests doc added with status='approved'
// Expected: 
//   - User's accumulated value increases
//   - Ranking updated
//   - Request appears in #creditHistoryList (top 20)
```

**Scenario 3: Status Change**
```javascript
// When: creditRequests.status changed from 'pending' to 'approved'
// Expected:
//   - Status badge updates (⏳ → ✅)
//   - User's accumulated increases
//   - Top 30 ranking updated
```

**Scenario 4: Modal Close**
```javascript
// When: closeAdminCredit clicked
// Expected: Listeners unsubscribed (no more real-time updates)
```

## Debugging Tips

### Check if Listener is Active
```javascript
// In browser console
console.log('Top Users Listener:', TOP_USERS_UNSUB ? 'Active' : 'Inactive');
console.log('History Listener:', CREDIT_HISTORY_UNSUB ? 'Active' : 'Inactive');
```

### Monitor Firestore Calls
```javascript
// In browser console
// Enable Firebase debug logging
firebase.firestore.setLogLevel('debug');
```

### DOM Inspection
```javascript
// Check if elements exist
console.log(document.getElementById('topUsersList'));
console.log(document.getElementById('creditHistoryList'));
```

## Future Enhancements

1. **Pagination Support**
   - Top Users: Load more than 30 with pagination
   - History: Load more than 20 with "Load More" button

2. **Search/Filter**
   - Add search box to filter users by email
   - Filter history by status (pending/approved/rejected)

3. **Sorting Options**
   - Sort by accumulated credits
   - Sort by current credits
   - Sort by date

4. **Notifications**
   - Toast when user enters Top 30
   - Toast when request status changes

5. **Performance**
   - Use compound indexes for faster queries
   - Implement local caching layer
   - Add query pagination

## Firestore Rules Required

For these listeners to work, ensure Firestore security rules allow:
```javascript
match /users/{userId} {
  allow read: if request.auth != null;
}

match /creditRequests/{docId} {
  allow read: if request.auth != null;
}
```

---

**Version:** 1.0  
**Last Updated:** November 19, 2025  
**Status:** ✅ Production Ready
