# Bug Report: ID Generation Test String Concatenation Issue

## Summary
The test "LocalDatastore › increments idGen when creating stickies" was failing due to incorrect string concatenation instead of numeric addition when comparing generated IDs.

## Root Cause
The test was attempting to perform numeric addition on string values returned by `createSticky()`. The `LocalDatastore.createSticky()` method returns `id.toString()`, which means the IDs are strings. When the test used `id1 + 1`, JavaScript performed string concatenation instead of numeric addition.

## Files Involved
- **Test File**: `test/board.spec.js` (lines 298-306)
- **Implementation**: `scripts/board/local-datastore.js` (lines 24-30)

## Code Snippets

### Failing Test Code
```javascript
it("increments idGen when creating stickies", () => {
  const store = new LocalDatastore();
  const id1 = store.createSticky({ text: "first", location: { x: 50, y: 50 } });
  const id2 = store.createSticky({ text: "second", location: { x: 100, y: 100 } });
  const id3 = store.createSticky({ text: "third", location: { x: 150, y: 150 } });
  
  expect(id2).toBe(id1 + 1);  // ❌ String concatenation: "1" + 1 = "11"
  expect(id3).toBe(id2 + 1);  // ❌ String concatenation: "2" + 1 = "21"
});
```

### LocalDatastore Implementation
```javascript
createSticky = (sticky) => {
  const state = getAppState();
  const id = ++state.idGen;           // Increments numeric idGen
  state.stickies[id] = sticky;
  this.notifyStickyChange(id.toString());
  return id.toString();              // Returns string ID
};
```

## Fix Applied
Updated the test to convert string IDs to numbers before performing numeric comparison:

```javascript
it("increments idGen when creating stickies", () => {
  const store = new LocalDatastore();
  const id1 = store.createSticky({ text: "first", location: { x: 50, y: 50 } });
  const id2 = store.createSticky({ text: "second", location: { x: 100, y: 100 } });
  const id3 = store.createSticky({ text: "third", location: { x: 150, y: 150 } });
  
  expect(parseInt(id2)).toBe(parseInt(id1) + 1);  // ✅ Numeric comparison
  expect(parseInt(id3)).toBe(parseInt(id2) + 1);  // ✅ Numeric comparison
});
```

## Test Results
- **Before Fix**: Test failed with `Expected: "11", Received: "2"`
- **After Fix**: Test passes successfully

## Impact
- **Severity**: Low (test-only issue, no runtime impact)
- **Scope**: Single test case
- **Risk**: None (fix only affects test logic)

## Prevention
Future tests involving ID comparisons should:
1. Convert string IDs to numbers using `parseInt()` or `Number()`
2. Use explicit numeric comparison operators
3. Consider using `toBe()` with numeric values instead of string concatenation
