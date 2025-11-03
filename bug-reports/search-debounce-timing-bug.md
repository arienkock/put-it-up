# Search Field Debounce Timing Bug

## Summary
When typing quickly in the search field, the initial search was delayed but then multiple updates would show in quick succession, causing a jarring user experience.

## Root Cause
The search functionality had two layers of debouncing, but they were not properly coordinated:

1. **UI Level**: No debouncing - every keystroke immediately called `loadBoards(true)`
2. **Firestore Level**: Debouncing via `FirestoreSearchDebouncer` with 400ms delay

The problem was that each keystroke created a new search with a different `searchKey` (because the key includes the search term: `static-${searchTerm}-${userId}-${limit}`). Since each search term had a different key, they didn't cancel each other in the debouncer. This meant:

- Typing "a" at time 0ms → timer fires at 400ms
- Typing "ab" at time 100ms → timer fires at 500ms  
- Typing "abc" at time 200ms → timer fires at 600ms

All three searches would execute, causing multiple rapid UI updates.

## Files Involved

### `boards.html`
- **Lines 374-378** (before fix): Search input event listener called `loadBoards(true)` immediately on every keystroke
- **Lines 86-88** (after fix): Added UI-level debounce state variables
- **Lines 378-392** (after fix): Updated search input listener to debounce calls to `loadBoards()`

### `scripts/network/network-firestore.js`
- **Lines 12-50**: `FirestoreSearchDebouncer` class that debounces search queries
- **Lines 838**: Search key generation includes search term: `static-${searchTerm}-${userId || 'anonymous'}-${limit}`
- **Lines 842-849**: Debouncing logic that only cancels searches with the same key

## The Fix

Added UI-level debouncing (300ms) to the search input in `boards.html`:

```javascript
// Search debounce state
let searchDebounceTimer = null;
const SEARCH_DEBOUNCE_MS = 300; // UI-level debounce delay

searchInput.addEventListener('input', (e) => {
  searchTerm = e.target.value;
  
  // Clear any existing debounce timer
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }
  
  // Set a new debounce timer
  searchDebounceTimer = setTimeout(() => {
    searchDebounceTimer = null;
    // Reset and reload when search changes (after debounce delay)
    loadBoards(true);
  }, SEARCH_DEBOUNCE_MS);
});
```

This ensures that:
1. Only one `loadBoards()` call is made after the user stops typing for 300ms
2. The Firestore-level debouncing (400ms) still provides additional protection against rapid API calls
3. The total delay is reasonable (300ms UI + 400ms Firestore = ~700ms worst case) and prevents unnecessary API calls

## Code Snippets

### Before Fix
```374:378:boards.html
searchInput.addEventListener('input', (e) => {
  searchTerm = e.target.value;
  // Reset and reload when search changes
  loadBoards(true);
});
```

### After Fix
```378:392:boards.html
searchInput.addEventListener('input', (e) => {
  searchTerm = e.target.value;
  
  // Clear any existing debounce timer
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }
  
  // Set a new debounce timer
  searchDebounceTimer = setTimeout(() => {
    searchDebounceTimer = null;
    // Reset and reload when search changes (after debounce delay)
    loadBoards(true);
  }, SEARCH_DEBOUNCE_MS);
});
```

### Debouncer Implementation
```25:50:scripts/network/network-firestore.js
debounceSearch(searchKey, searchFn, params) {
  // Cancel any existing timer for this search
  if (this.pendingSearches.has(searchKey)) {
    const pending = this.pendingSearches.get(searchKey);
    clearTimeout(pending.timer);
    // Reject the previous promise since it's being superseded
    if (pending.reject) {
      pending.reject(new Error('Search superseded by newer query'));
    }
  }

  // Create a new promise for this search
  return new Promise((resolve, reject) => {
    const pending = {
      searchFn,
      params,
      resolve,
      reject,
      timer: setTimeout(() => {
        this.executeSearch(searchKey);
      }, this.debounceMs)
    };

    this.pendingSearches.set(searchKey, pending);
  });
}
```

## Testing
The fix should be tested by:
1. Typing quickly in the search field (e.g., "abc" typed rapidly)
2. Verifying that only one search request is made after typing stops
3. Verifying that the UI updates only once with the final search term
4. Verifying that there are no rapid successive updates

## Related Issues
- The Firestore-level debouncer's search key generation includes the search term, which means different search terms don't cancel each other. This is actually correct behavior for the Firestore level, but the UI-level debounce was needed to prevent multiple calls from being queued in the first place.

