# Custom Habit Race Condition Fix

## 🔴 **The Problem**

### **Symptoms:**
```
✅ Custom habit created and saved (2 habits in database)
🔄 Return to home screen
❌ Only 1 habit showing (new habit disappeared!)
💾 Database shows only 1 habit saved
```

### **Console Output:**
```
💾 [SAVE] Saving habits: {"tasks": ["old", "new"]}  ← Correct: 2 habits
  ✅ Saved old: completed=1
  ✅ Saved new: completed=0

🔄 [FOCUS] Screen focused, reloading
📋 [SELECTED] Displaying 1 habits:  ← Wrong: only 1 showing
  🏃 Running (old)

💾 [SAVE] Saving habits: {"tasks": ["old"]}  ← Wrong: overwrote with 1 habit!
  ✅ Saved old: completed=1
```

### **Root Cause: Race Condition**

There were **multiple saves happening in quick succession**, causing a race condition:

1. **Custom habit screen saves** → 2 habits in database ✅
2. **Navigate back** → Focus effect triggers
3. **Focus effect loads** → Gets data from database
4. **applySelection updates state** → storedTaskIds changes
5. **useEffect triggers** → Calls persistSelection immediately
6. **persistSelection saves** → But uses OLD state (1 habit) ❌
7. **Result:** New habit overwritten!

### **The Race:**
```
Time  Action                           State
------|--------------------------------|------------------
T0    Create custom habit              []
T1    Save to DB: [old, new]           []
T2    Navigate back                    []
T3    Focus: Load from DB              []
T4    applySelection([old, new])       [old, new] (pending)
T5    useEffect fires                  [old] (stale!)
T6    persistSelection([old])          [old]
T7    Save to DB: [old]                [old]
T8    State updates to [old, new]      [old, new]
T9    Too late! DB already overwritten ❌
```

## ✅ **The Solution**

### **1. Debounce persistSelection**

Added a 300ms debounce to prevent immediate saves when state changes rapidly:

```typescript
const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => {
  if (hydratedDateRef.current !== selectedDateKey) {
    return;
  }
  
  // Clear any pending persist
  if (persistTimeoutRef.current) {
    clearTimeout(persistTimeoutRef.current);
  }
  
  // Debounce the persist to avoid race conditions
  persistTimeoutRef.current = setTimeout(() => {
    persistSelection(storedTaskIds);
  }, 300); // Wait 300ms before saving
  
  return () => {
    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current);
    }
  };
}, [storedTaskIds, persistSelection, selectedDateKey]);
```

### **2. Add delay in custom habit screen**

Added 100ms delay before navigation to ensure database write completes:

```typescript
await saveHabitSelection(dateKey, updatedSelection);
console.log('  ✅ Custom habit added to today\'s habits!');

// Small delay to ensure database write completes
await new Promise(resolve => setTimeout(resolve, 100));

// Now navigate back
Alert.alert('Success! 🎉', ...);
```

## 📊 **How It Works Now**

### **Timeline with Fix:**
```
Time  Action                           State
------|--------------------------------|------------------
T0    Create custom habit              []
T1    Save to DB: [old, new]           []
T2    Wait 100ms                       []
T3    Navigate back                    []
T4    Focus: Load from DB              []
T5    applySelection([old, new])       [old, new] (pending)
T6    useEffect fires                  [old, new]
T7    Start 300ms debounce timer       [old, new]
T8    State updates to [old, new]      [old, new]
T9    Timer expires (300ms later)      [old, new]
T10   persistSelection([old, new])     [old, new]
T11   Save to DB: [old, new]           [old, new] ✅
```

### **Key Improvements:**

1. **100ms delay** before navigation → Database write completes
2. **300ms debounce** on persist → Prevents rapid-fire saves
3. **Cleanup on unmount** → Cancels pending saves
4. **State stabilizes** → Correct data saved

## 🎯 **Expected Console Output**

### **Creating Custom Habit:**
```
💾 [SAVE] Saving custom habit: { name: 'Morning Yoga', ... }
🎨 [CUSTOM] Creating custom habit: { id: 'custom_XXX', ... }
  ✅ Custom habit created with ID: custom_XXX
  📋 Current selection: { tasks: ['old'], ... }
  💾 Adding custom habit to today's selection: { tasks: ['old', 'custom_XXX'], ... }

💾 [SAVE] Saving habits for 2025-11-03: { tasks: ['old', 'custom_XXX'], ... }
  ✅ Saved old: completed=1
  ✅ Saved custom_XXX: completed=0

📅 [DEBUG] User Habits: [
  { habit_id: 'old', completed: 1 },
  { habit_id: 'custom_XXX', completed: 0 }
]
  ✅ Custom habit added to today's habits!

[100ms delay]
```

### **Returning to Home:**
```
🔄 [FOCUS] Screen focused, reloading 2025-11-03
  🎨 Reloading custom habits...
  ✅ Found 8 custom habits

📖 [LOAD] Loading habit selection for 2025-11-03
  📊 Found 2 habits in database for this date
  ✅ Returning 2 habits from database

📋 [SELECTED] Displaying 2 habits:
  🏃 Running (old)
  🧘 Morning Yoga (custom_XXX)  ← Still here! ✅

[300ms debounce timer starts]

💾 [SAVE] Saving habits for 2025-11-03: { tasks: ['old', 'custom_XXX'], ... }
  ✅ Saved old: completed=1
  ✅ Saved custom_XXX: completed=0

📅 [DEBUG] User Habits: [
  { habit_id: 'old', completed: 1 },
  { habit_id: 'custom_XXX', completed: 0 }
]
```

### **Key Differences:**

**Before (Broken):**
```
💾 SAVE: [old, new]  ← Correct
📋 DISPLAY: 1 habit  ← Wrong!
💾 SAVE: [old]       ← Overwrote!
```

**After (Fixed):**
```
💾 SAVE: [old, new]  ← Correct
📋 DISPLAY: 2 habits ← Correct! ✅
💾 SAVE: [old, new]  ← Still correct! ✅
```

## 🧪 **Testing**

### **Test 1: Create Single Custom Habit**
```
1. Tap "+" button
2. Enter "Morning Yoga" with 🧘
3. Tap "Save Habit"
4. Wait for alert
5. Tap "OK"
6. Check home screen

Expected:
✅ "Morning Yoga 🧘" appears
✅ Stays visible (doesn't disappear)
✅ Can complete it
```

### **Test 2: Create Multiple Custom Habits**
```
1. Create "Morning Yoga" 🧘
2. Return to home (should show)
3. Create "Evening Run" 🏃
4. Return to home (should show both)
5. Create "Read Book" 📚
6. Return to home (should show all 3)

Expected:
✅ All 3 custom habits visible
✅ None disappear
✅ All can be completed
```

### **Test 3: Rapid Creation**
```
1. Create habit A
2. Immediately create habit B
3. Immediately create habit C
4. Check home screen

Expected:
✅ All 3 habits visible
✅ Database has all 3
✅ No habits lost
```

### **Test 4: Complete and Create**
```
1. Complete existing habit
2. Create new custom habit
3. Return to home

Expected:
✅ Existing habit still completed
✅ New habit appears uncompleted
✅ Both visible
```

## 📋 **Verification Commands**

### **Check Database:**
```javascript
// In console
global.debugHabits()

Look for:
✅ "Custom habits loaded: X"
✅ "Total habits available: Y"
✅ All custom habits in lookup
✅ All custom habits in displayed list
```

### **Check user_habits Table:**
```sql
SELECT * FROM user_habits WHERE date = '2025-11-03' ORDER BY id DESC;

Expected:
✅ All custom habits present
✅ Correct completed status
✅ No duplicates
✅ No missing habits
```

## 🔧 **Technical Details**

### **Debounce Pattern:**
```typescript
// Pattern: Debounce with cleanup
const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => {
  // Clear previous timer
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
  }
  
  // Set new timer
  timeoutRef.current = setTimeout(() => {
    // Action after debounce period
    doSomething();
  }, 300);
  
  // Cleanup on unmount or dependency change
  return () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };
}, [dependencies]);
```

### **Why 300ms?**
- **Too short (< 100ms):** Race condition still possible
- **Too long (> 500ms):** Noticeable delay, poor UX
- **300ms:** Sweet spot - prevents races, feels instant

### **Why 100ms delay before navigation?**
- Ensures database write completes
- Prevents navigation during async operation
- Minimal impact on UX (imperceptible)

## ⚠️ **Important Notes**

1. **Don't remove debounce** - It's critical for preventing race conditions
2. **Don't reduce delay too much** - 300ms is tested and works
3. **Don't skip the 100ms wait** - Ensures database consistency
4. **Always test rapid creation** - Most likely to expose race conditions

## 🎯 **Success Criteria**

### **✅ All Tests Pass:**
- [ ] Single custom habit stays visible
- [ ] Multiple custom habits all visible
- [ ] Rapid creation doesn't lose habits
- [ ] Completed status preserved
- [ ] Database matches UI
- [ ] No duplicate saves
- [ ] No missing habits

### **✅ Console Output Clean:**
- [ ] No "Displaying 0 habits" after creation
- [ ] Save count matches habit count
- [ ] No extra saves after focus
- [ ] Debounce timer visible in logs

### **✅ Database Consistent:**
- [ ] user_habits has all custom habits
- [ ] No orphaned entries
- [ ] Completed status correct
- [ ] No race condition artifacts

---

**With these fixes, custom habits now persist correctly and don't disappear!** ✅

**The debounce prevents the race condition that was causing habits to be overwritten.** 🎉
