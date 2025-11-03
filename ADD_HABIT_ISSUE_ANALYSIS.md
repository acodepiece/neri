# Add Habit Not Showing on Next Day - Issue Analysis

## 🔴 Problem

**User Flow:**
1. User is on **Nov 3** (today)
2. Clicks "+" button → Adds "Meditate" habit
3. Habit appears on Nov 3 ✅
4. User navigates to **Nov 4** (next day)
5. **"Meditate" does NOT appear** ❌

## 🔍 Root Cause Analysis

### Flow Breakdown:

#### Step 1: User Adds Habit on Nov 3
```typescript
// UserPreferenceScreen.tsx
handleContinue() {
  await saveHabitSelection('2025-11-03', {
    categories: [1],
    tasks: ['p1', 's1'],  // 's1' is the new habit
    completed: []          // Not completed yet
  });
  
  router.replace({ pathname: '/(tabs)/(home)', params: { date: '2025-11-03' } });
}
```

**Database After Save:**
```sql
user_habits:
| id | habit_id | date       | completed |
|----|----------|------------|-----------|
| 1  | p1       | 2025-11-03 | 0         |
| 2  | s1       | 2025-11-03 | 0         | ← NEW HABIT
```

#### Step 2: User Navigates to Nov 4
```typescript
// index.tsx
useEffect(() => {
  const selection = await loadHabitSelection('2025-11-04');
  // selection = { tasks: [], completed: [] }  ← EMPTY!
}, [selectedDateKey]);
```

**Why Empty?**

```typescript
// habitDb.ts - loadHabitSelection()
const rows = await db.getAllAsync(
  'SELECT habit_id, completed FROM user_habits WHERE date = ?',
  ['2025-11-04']
);

// rows.length === 0  ← No habits for Nov 4 yet

// So it calls getSuggestedHabitsFromPreviousDay()
```

#### Step 3: Get Suggested Habits
```typescript
// habitDb.ts - getSuggestedHabitsFromPreviousDay()
const previousRows = await db.getAllAsync(
  'SELECT DISTINCT habit_id, date FROM user_habits WHERE date < ? ORDER BY date DESC LIMIT 100',
  ['2025-11-04']
);

// previousRows = [
//   { habit_id: 'p1', date: '2025-11-03' },
//   { habit_id: 's1', date: '2025-11-03' }
// ]

const latestDate = previousRows[0].date;  // '2025-11-03'

const latestRows = await db.getAllAsync(
  'SELECT habit_id FROM user_habits WHERE date = ?',
  [latestDate]
);

// latestRows = [
//   { habit_id: 'p1' },
//   { habit_id: 's1' }  ← NEW HABIT IS HERE!
// ]

return latestRows.map(r => r.habit_id);  // ['p1', 's1']
```

**This SHOULD work!** The new habit should appear.

## 🐛 Actual Issues Found

### Issue 1: **useFocusEffect Not Triggering**

When you return from the select-habits screen, the `useFocusEffect` should reload data, but it might not be triggering because:

```typescript
// index.tsx
useFocusEffect(
  useCallback(() => {
    const hydrate = async () => {
      await debugAllTables();  // ← This is SLOW!
      const selection = await loadHabitSelection(selectedDateKey);
      // ...
    };
    hydrate();
  }, [selectedDateKey, applySelection])  // ← Dependencies might cause issues
);
```

**Problem:** `debugAllTables()` is called on EVERY focus, which is slow and might block the UI.

### Issue 2: **Suggested Habits Not Saved**

When habits are suggested (auto-copied from previous day), they're NOT saved to the database until the user interacts with them:

```typescript
// habitDb.ts - loadHabitSelection()
if (rows.length === 0) {
  const suggestedTasks = await getSuggestedHabitsFromPreviousDay(dateKey);
  
  return {
    tasks: suggestedTasks,
    completed: []  // ← Only in memory, NOT in database!
  };
}
```

**Then in UI:**
```typescript
// index.tsx
toggleHabit(habitId) {
  // NOW it saves to database
  await saveHabitSelection(selectedDateKey, {
    tasks: selectionRef.current.tasks,
    completed: Array.from(next)
  });
}
```

**This is by design**, but it means:
- Nov 4: Habits suggested from Nov 3 (in memory only)
- User navigates to Nov 5: Gets suggestions from Nov 3 (not Nov 4, because Nov 4 has no database entries!)

### Issue 3: **UI Not Updating After Return**

When you return from select-habits screen:
1. `router.replace()` navigates back
2. `useFocusEffect` should trigger
3. Data should reload

**But** - If the `selectedDateKey` hasn't changed, the `useEffect` won't re-run!

```typescript
useEffect(() => {
  // Only runs when selectedDateKey changes
}, [selectedDateKey, applySelection]);
```

## ✅ Solutions

### Solution 1: Remove Slow Debug Call from useFocusEffect

```typescript
useFocusEffect(
  useCallback(() => {
    let isActive = true;

    const hydrate = async () => {
      console.log(`\n🔄 [FOCUS] Screen focused, reloading ${selectedDateKey}`);
      
      // ❌ REMOVE THIS - Too slow!
      // await debugAllTables();
      
      const selection = await loadHabitSelection(selectedDateKey);
      if (!isActive) {
        return;
      }
      applySelection(selection);
      
      // Load streaks
      if (selection.tasks.length > 0) {
        const streaks = await getHabitStreaks(selection.tasks, selectedDateKey);
        if (isActive) {
          setHabitStreaks(streaks);
        }
      }
      
      hydratedDateRef.current = selectedDateKey;
    };

    hydrate();

    return () => {
      isActive = false;
    };
  }, [selectedDateKey, applySelection])
);
```

### Solution 2: Force Refresh After Adding Habits

Add a refresh key or force re-hydration:

```typescript
// Option A: Add a refresh counter
const [refreshKey, setRefreshKey] = useState(0);

useFocusEffect(
  useCallback(() => {
    // This will run every time screen is focused
    const hydrate = async () => {
      const selection = await loadHabitSelection(selectedDateKey);
      applySelection(selection);
      // ...
    };
    hydrate();
  }, [selectedDateKey, refreshKey])  // ← Add refreshKey
);

// When returning from select-habits, increment refreshKey
```

### Solution 3: Save Suggested Habits Immediately

When habits are suggested, save them to database:

```typescript
// habitDb.ts - loadHabitSelection()
if (rows.length === 0) {
  const suggestedTasks = await getSuggestedHabitsFromPreviousDay(dateKey);
  
  if (suggestedTasks.length > 0) {
    const categories = await getCategoriesForTasks(suggestedTasks);
    
    // ✅ SAVE suggested habits to database
    await saveHabitSelection(dateKey, {
      categories,
      tasks: suggestedTasks,
      completed: []
    });
    
    return {
      categories,
      tasks: suggestedTasks,
      completed: []
    };
  }
}
```

**Pros:** Habits always in database, easier to track
**Cons:** Creates database entries for days user hasn't visited

## 🎯 Recommended Fix

**Combination of Solution 1 + 2:**

1. Remove `debugAllTables()` from `useFocusEffect` (too slow)
2. Ensure `useFocusEffect` always reloads data
3. Add logging to verify flow

