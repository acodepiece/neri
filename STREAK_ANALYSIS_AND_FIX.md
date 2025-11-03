# Streak System Analysis & Fix

## 🔍 Problem Analysis

### Why Streaks Weren't Incrementing

After analyzing the entire codebase, I found several issues:

#### 1. **Streak Calculation Logic** ✅ (Was Correct)
The streak calculation algorithm in `calculateHabitStreak()` was actually **correct**:
```typescript
// Counts consecutive days backwards from target date
for (let i = 0; i < rows.length; i++) {
  const rowDate = new Date(rows[i].date);
  const expectedDate = new Date(checkDate);
  expectedDate.setDate(checkDate.getDate() - streak);
  
  if (rowDate.getTime() === expectedDate.getTime()) {
    streak++; // ✅ Increments correctly
  } else {
    break; // ❌ Stops when day is missed
  }
}
```

#### 2. **Database Schema** ✅ (Was Correct)
```sql
CREATE TABLE user_habits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  habit_id TEXT NOT NULL,
  date TEXT NOT NULL,
  completed INTEGER DEFAULT 0,  -- 0 or 1
  UNIQUE(habit_id, date)
);
```

#### 3. **Real Issues Found** ❌

**Issue A: Streak Not Refreshing After Toggle**
- When you completed a habit, the streak was calculated BEFORE the database was updated
- The toggle function called `getHabitStreaks` immediately, but the save was async
- **Result:** Streak showed old value until you refreshed the screen

**Issue B: No Debugging/Visibility**
- No console logs to see what was happening
- Couldn't verify if data was being saved correctly
- Couldn't see streak calculation steps

**Issue C: Streak Calculated for Wrong Date**
- `getHabitStreaks` was sometimes called without the `upToDate` parameter
- This meant it calculated streak up to "today" instead of the selected date
- **Result:** When viewing past dates, streaks were incorrect

## ✅ Fixes Applied

### 1. **Added Comprehensive Debugging**

#### Database Debug Functions
```typescript
// Show all database tables
debugAllTables()

// Show habits for specific date
debugUserHabits(dateKey)

// Show detailed streak calculation
debugStreakCalculation(habitId, upToDate)
```

**What They Do:**
- `debugAllTables()` - Shows ALL tables with console.table()
- `debugUserHabits()` - Shows user_habits entries for a date
- `debugStreakCalculation()` - Step-by-step streak calculation with logs

### 2. **Fixed Streak Refresh Timing**

**Before (Broken):**
```typescript
toggleHabit = (habitId) => {
  // Update UI
  setCompletedIds(next);
  
  // Save to database (async)
  saveHabitSelection(...);
  
  // Calculate streak (WRONG - database not updated yet!)
  getHabitStreaks([habitId]);
}
```

**After (Fixed):**
```typescript
toggleHabit = (habitId) => {
  // Update UI
  setCompletedIds(next);
  
  // Save to database
  await saveHabitSelection(...);
  
  // THEN calculate streak (database is updated now!)
  const streaks = await getHabitStreaks(tasks, selectedDateKey);
  setHabitStreaks(streaks);
}
```

### 3. **Added Logging Throughout**

**saveHabitSelection:**
```typescript
console.log(`💾 [SAVE] Saving habits for ${dateKey}`);
// ... save logic ...
console.log(`  ✅ Saved ${taskId}: completed=${isCompleted}`);
await debugUserHabits(dateKey); // Show what was saved
```

**calculateHabitStreak:**
```typescript
console.log(`🔥 [STREAK] ${habitId}: ${streak} (from ${rows.length} completed dates)`);
```

**toggleHabit:**
```typescript
console.log(`\n🔄 [TOGGLE] ${habitId} -> ${willBeCompleted ? 'completed' : 'uncompleted'}`);
await debugStreakCalculation(habitId, selectedDateKey);
console.log('  🔥 All streaks refreshed:', allStreaks);
```

### 4. **Pass Correct Date to Streak Calculation**

**Before:**
```typescript
const streaks = await getHabitStreaks(selection.tasks);
// Uses today's date by default
```

**After:**
```typescript
const streaks = await getHabitStreaks(selection.tasks, selectedDateKey);
// Uses the selected date
```

## 📊 How to Test

### Test Scenario 1: Build a 3-Day Streak

1. **Day 1 (e.g., Nov 1):**
   - Add "Exercise" habit
   - Complete it ✅
   - **Check console:** Should see `💾 [SAVE]` and `🔥 [STREAK] Exercise: 1`
   - **Expected:** 🔥 1

2. **Day 2 (Nov 2):**
   - Navigate to Nov 2
   - "Exercise" appears (suggested from Nov 1)
   - Complete it ✅
   - **Check console:** Should see streak calculation
   - **Expected:** 🔥 2

3. **Day 3 (Nov 3):**
   - Navigate to Nov 3
   - "Exercise" appears
   - Complete it ✅
   - **Check console:** Should see `🔥 [STREAK] Exercise: 3`
   - **Expected:** 🔥 3

### Test Scenario 2: Break and Restart Streak

4. **Day 4 (Nov 4):**
   - Navigate to Nov 4
   - "Exercise" appears
   - DON'T complete it ❌
   - **Expected:** No badge (streak = 0)

5. **Day 5 (Nov 5):**
   - Navigate to Nov 5
   - "Exercise" appears
   - Complete it ✅
   - **Check console:** Should see `🔥 [STREAK] Exercise: 1`
   - **Expected:** 🔥 1 (starts fresh!)

### Test Scenario 3: Multiple Habits

6. **Day 1:**
   - Add "Exercise" and "Read"
   - Complete both ✅
   - **Expected:** Both show 🔥 1

7. **Day 2:**
   - Complete only "Exercise" ✅
   - **Expected:** Exercise 🔥 2, Read (no badge)

8. **Day 3:**
   - Complete both ✅
   - **Expected:** Exercise 🔥 3, Read 🔥 1

## 🐛 Debug Console Output

### When You Load a Date:
```
📆 [LOAD] Loading habits for 2025-11-03
  📋 Loaded selection: { categories: [1], tasks: ['p1'], completed: ['p1'] }
  🔥 Calculating streaks for: ['p1']
  🎯 Streaks calculated: { p1: 3 }
```

### When You Toggle a Habit:
```
🔄 [TOGGLE] p1 -> completed
💾 [SAVE] Saving habits for 2025-11-03
  ✅ Saved p1: completed=1
📅 [DEBUG] User Habits for 2025-11-03: [{ id: 1, habit_id: 'p1', date: '2025-11-03', completed: 1 }]
  ✅ Saved successfully, recalculating streaks...

🔥 [DEBUG] Calculating streak for habit: p1 up to 2025-11-03
  📊 Completed dates found: [
    { date: '2025-11-03', completed: 1 },
    { date: '2025-11-02', completed: 1 },
    { date: '2025-11-01', completed: 1 }
  ]
  ✅ Filtered completed (=1): [same as above]
  🔍 Checking consecutive days from 2025-11-03
    Day 0: Expected 2025-11-03, Got 2025-11-03, Match: true
      ✅ Streak = 1
    Day 1: Expected 2025-11-02, Got 2025-11-02, Match: true
      ✅ Streak = 2
    Day 2: Expected 2025-11-01, Got 2025-11-01, Match: true
      ✅ Streak = 3
  🎯 Final Streak: 3

  🔥 All streaks refreshed: { p1: 3 }
```

### When You Focus the Screen:
```
🔄 [FOCUS] Screen focused, reloading 2025-11-03

═══════════════════════════════════════════
🗄️  DATABASE DEBUG - ALL TABLES
═══════════════════════════════════════════

📋 HABITS TABLE: 12 rows
┌─────────┬────────┬─────────────────────┬──────────────┬──────┬─────────────┬───────────────┐
│ (index) │   id   │        name         │ description  │ icon │ category_id │ category_name │
├─────────┼────────┼─────────────────────┼──────────────┼──────┼─────────────┼───────────────┤
│    0    │  'p1'  │ 'Exercise 30 min'   │   'Daily'    │ '💪' │      1      │  'Physical'   │
│    1    │  'r1'  │ 'Read for 20 min'   │   'Daily'    │ '📚' │      2      │   'Reading'   │
└─────────┴────────┴─────────────────────┴──────────────┴──────┴─────────────┴───────────────┘

📅 USER_HABITS TABLE (last 30): 6 rows
┌─────────┬────┬───────────┬──────────────┬───────────┐
│ (index) │ id │ habit_id  │     date     │ completed │
├─────────┼────┼───────────┼──────────────┼───────────┤
│    0    │ 6  │   'p1'    │ '2025-11-03' │     1     │
│    1    │ 5  │   'p1'    │ '2025-11-02' │     1     │
│    2    │ 4  │   'p1'    │ '2025-11-01' │     1     │
│    3    │ 3  │   'r1'    │ '2025-11-01' │     0     │
└─────────┴────┴───────────┴──────────────┴───────────┘

🔥 STREAKS TABLE: 0 rows
(empty - we calculate streaks on-the-fly)

📝 HABIT_LOGS TABLE (last 20): 0 rows
(empty - not used in current implementation)

═══════════════════════════════════════════
```

## 📝 Summary of Changes

### Files Modified:

1. **`app/database/habitDb.ts`**
   - ✅ Added `debugAllTables()` - Show all database tables
   - ✅ Added `debugUserHabits()` - Show user_habits for a date
   - ✅ Added `debugStreakCalculation()` - Detailed streak calculation
   - ✅ Added logging to `saveHabitSelection()`
   - ✅ Added logging to `calculateHabitStreak()`

2. **`app/(tabs)/(home)/index.tsx`**
   - ✅ Imported debug functions
   - ✅ Added logging to `useEffect` (habit loading)
   - ✅ Added logging to `useFocusEffect` (screen focus)
   - ✅ Added `debugAllTables()` call on focus
   - ✅ Fixed `toggleHabit()` to await save before calculating streaks
   - ✅ Pass `selectedDateKey` to `getHabitStreaks()` everywhere
   - ✅ Added detailed logging to `toggleHabit()`

### Key Improvements:

1. **Visibility** 👁️
   - Every database operation is logged
   - Streak calculations show step-by-step process
   - Can see exactly what's in the database at any time

2. **Correctness** ✅
   - Streaks calculated AFTER database is updated
   - Correct date passed to streak calculation
   - All habits' streaks refreshed together

3. **Debugging** 🐛
   - `debugAllTables()` shows entire database state
   - `debugStreakCalculation()` shows why a streak is what it is
   - Console logs trace every operation

## 🎯 Expected Behavior Now

### Streak Increment Pattern:
```
Day 1: Complete ✅ → 🔥 1
Day 2: Complete ✅ → 🔥 2  ← Increments!
Day 3: Complete ✅ → 🔥 3  ← Increments!
Day 4: Missed ❌   → (no badge)
Day 5: Complete ✅ → 🔥 1  ← Starts fresh!
Day 6: Complete ✅ → 🔥 2  ← Increments again!
```

### What You'll See in Console:
- Every save operation
- Every streak calculation
- Database state after each change
- Detailed breakdown of how streaks are calculated

## 🚀 Next Steps

1. **Run the app:** `npm start`
2. **Open console:** Watch the debug output
3. **Test the scenarios above**
4. **Verify:**
   - Streaks increment correctly
   - Streaks reset on missed days
   - Database shows correct data
   - Console logs make sense

If streaks still don't work, the console logs will show EXACTLY where the problem is!

---

**All debugging is now in place. The app will tell you exactly what it's doing!** 🎉
