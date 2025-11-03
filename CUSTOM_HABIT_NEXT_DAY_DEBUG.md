# Custom Habits Not Showing on Following Days - Debug Guide

## 🔍 **Diagnostic Logging Added**

I've added comprehensive logging to track custom habits through the suggestion flow:

### **New Console Output:**

When navigating to the next day, you'll now see:

```
💡 [SUGGEST] Getting suggested habits for 2025-11-04
  📊 Found X previous dates with habits
  📅 Most recent date: 2025-11-03
  ✅ Suggesting Y habits (Z custom, W default):
    🎨 CUSTOM: custom_1762170896450_qdyx09dwt
    🎨 CUSTOM: custom_1762171096863_cypncr9py
    📦 DEFAULT: w5
  🏷️ [CATEGORIES] Found N categories for Y tasks: [2, 999]
```

## 🧪 **Testing Steps**

### **Test 1: Verify Custom Habits Are Suggested**

1. **Today (Nov 3):**
   - Create custom habit "Morning Yoga" 🧘
   - Complete it (mark as done)
   - Check console:
   ```
   💾 [SAVE] Saving habits: {"tasks": ["custom_XXX"], "completed": ["custom_XXX"]}
   ```

2. **Navigate to Next Day (Nov 4):**
   - Swipe to next day
   - **Watch console carefully** for:
   ```
   💡 [SUGGEST] Getting suggested habits for 2025-11-04
     ✅ Suggesting 1 habits (1 custom, 0 default):
       🎨 CUSTOM: custom_XXX
   ```

3. **Check if habit appears:**
   - If you see "🎨 CUSTOM" in logs but NOT on screen → **Display issue**
   - If you DON'T see "🎨 CUSTOM" in logs → **Database issue**

### **Test 2: Check Database Directly**

Run this in your app's debug console or check the database:

```sql
-- Check if custom habit was saved for today
SELECT * FROM user_habits 
WHERE date = '2025-11-03' 
  AND habit_id LIKE 'custom_%';

-- Expected: Should show your custom habit

-- Check if it suggests for next day
SELECT DISTINCT habit_id, date 
FROM user_habits 
WHERE date < '2025-11-04' 
ORDER BY date DESC 
LIMIT 10;

-- Expected: Should include your custom habit from 2025-11-03
```

## 🔴 **Possible Issues & Solutions**

### **Issue 1: Custom Habits in Database but Not Suggested**

**Symptoms:**
```
📖 [LOAD] Loading habit selection for 2025-11-04
  📊 Found 0 habits in database for this date
  💡 No habits found, getting suggestions...
  ⚠️ No previous habits found  ← Problem!
```

**Cause:** No habits saved for previous day

**Solution:** Ensure habits are saved to `user_habits` table:
```typescript
// Check if save is working
await saveHabitSelection(dateKey, selection);
// Verify in database
```

### **Issue 2: Custom Habits Suggested but Not Displayed**

**Symptoms:**
```
💡 [SUGGEST] Suggesting 2 habits (1 custom, 1 default):
  🎨 CUSTOM: custom_XXX
  📦 DEFAULT: w5

📋 [SELECTED] Displaying 1 habits:
  💪 HIIT workout (w5)
  ❌ Custom habit missing!
```

**Cause:** Custom habit not in `habitLookup` on home screen

**Debug:**
```javascript
// In console
global.debugHabits()

// Look for:
📊 Current State:
  Custom habits loaded: X  ← Should be > 0
  Total habits available: Y
  
🔍 Habit Lookup:
  ✅ custom_XXX: 🧘 Morning Yoga  ← Should be present
  ❌ custom_XXX: NOT FOUND  ← Problem!
```

**Solution:** Custom habits need to be loaded into `allHabits`:
```typescript
// In index.tsx
const [customHabits, setCustomHabits] = useState<any[]>([]);

useEffect(() => {
  const loadCustomHabits = async () => {
    const habits = await getCustomHabits();
    setCustomHabits(habits);  // Must happen!
  };
  loadCustomHabits();
}, []);
```

### **Issue 3: Custom Habit Deleted from habits Table**

**Symptoms:**
```
💡 [SUGGEST] Suggesting: custom_XXX
🏷️ [CATEGORIES] Found 0 categories for 1 tasks: []  ← Problem!
```

**Cause:** Custom habit exists in `user_habits` but not in `habits` table

**Debug:**
```sql
-- Check habits table
SELECT * FROM habits WHERE id = 'custom_XXX';

-- If empty → habit was deleted!
```

**Solution:** Don't delete from `habits` table. Only delete from `user_habits` if removing from a specific day.

### **Issue 4: Category 999 Not Recognized**

**Symptoms:**
```
🏷️ [CATEGORIES] Found 1 categories: [999]
📊 [HABITS] Total habits available: {custom: 5, default: 30}
📋 [SELECTED] Displaying 0 habits  ← Problem!
```

**Cause:** Category 999 not being computed correctly

**Debug:**
```typescript
// In computeCategoriesForTasks
const categories = tasks
  .map((taskId) => habitLookup.get(taskId)?.categoryId)
  .filter((value): value is number => typeof value === 'number');

// Should include 999 for custom habits
```

**Solution:** Ensure custom habits have `categoryId: 999` in `allHabits`:
```typescript
const customHabitItems = customHabits.map((habit) => ({
  id: habit.id,
  title: habit.name,
  frequency: 'Daily',
  icon: habit.icon,
  categoryId: 999,  // Must be set!
}));
```

## 📊 **Complete Flow Diagram**

### **Day 1 (Nov 3) - Create Custom Habit:**
```
1. Create "Morning Yoga" 🧘
   ↓
2. Save to habits table
   INSERT INTO habits (id='custom_XXX', name='Morning Yoga', icon='🧘', category_id=999)
   ↓
3. Add to today's selection
   INSERT INTO user_habits (habit_id='custom_XXX', date='2025-11-03', completed=0)
   ↓
4. Load custom habits into allHabits
   customHabits = [{id: 'custom_XXX', name: 'Morning Yoga', icon: '🧘'}]
   ↓
5. Display on home screen
   ✅ "Morning Yoga 🧘" visible
```

### **Day 2 (Nov 4) - Should Auto-Suggest:**
```
1. Navigate to Nov 4
   ↓
2. Load habit selection for Nov 4
   SELECT * FROM user_habits WHERE date='2025-11-04'
   Result: Empty (no habits for this date yet)
   ↓
3. Get suggestions from previous day
   SELECT habit_id FROM user_habits WHERE date='2025-11-03'
   Result: ['custom_XXX', 'w5']
   ↓
4. Get categories for suggested habits
   SELECT category_id FROM habits WHERE id IN ('custom_XXX', 'w5')
   Result: [999, 2]
   ↓
5. Return suggested selection
   {tasks: ['custom_XXX', 'w5'], categories: [999, 2], completed: []}
   ↓
6. Apply selection to state
   storedTaskIds = ['custom_XXX', 'w5']
   ↓
7. Look up habits in habitLookup
   habitLookup.get('custom_XXX') → {id: 'custom_XXX', title: 'Morning Yoga', icon: '🧘'}
   ↓
8. Display on home screen
   ✅ "Morning Yoga 🧘" visible
```

## 🎯 **What to Check**

### **✅ Checklist:**

**Database Layer:**
- [ ] Custom habit in `habits` table with `category_id = 999`
- [ ] Custom habit in `user_habits` table for previous day
- [ ] `getSuggestedHabitsFromPreviousDay` returns custom habit ID
- [ ] `getCategoriesForTasks` finds category 999

**State Layer:**
- [ ] `getCustomHabits()` returns custom habits
- [ ] `customHabits` state populated on mount
- [ ] `allHabits` includes custom habits
- [ ] `habitLookup` has custom habit entries

**Display Layer:**
- [ ] `storedTaskIds` includes custom habit ID
- [ ] `selectedHabits` includes custom habit
- [ ] Habit renders in UI with correct icon/name

## 🐛 **Debug Commands**

### **1. Check Custom Habits Loaded:**
```javascript
global.debugHabits()

// Look for:
Custom habits loaded: X  // Should be > 0
Total habits available: Y  // Should include custom
```

### **2. Check Habit Lookup:**
```javascript
global.debugHabits()

// Look for:
🔍 Habit Lookup:
  ✅ custom_XXX: 🧘 Morning Yoga
  // All custom habits should be listed
```

### **3. Check Suggestion Flow:**
Navigate to next day and watch console:
```
💡 [SUGGEST] Getting suggested habits...
  ✅ Suggesting X habits (Y custom, Z default):
    🎨 CUSTOM: custom_XXX  ← Must be present!
```

### **4. Check Categories:**
```
🏷️ [CATEGORIES] Found N categories: [2, 999]
// 999 should be in the list if custom habits are suggested
```

## 📝 **Expected Console Output (Complete)**

### **Day 1 - Create Custom Habit:**
```
💾 [SAVE] Saving custom habit: {name: 'Morning Yoga', ...}
🎨 [CUSTOM] Creating custom habit: {id: 'custom_XXX', ...}
  ✅ Custom habit created with ID: custom_XXX
  💾 Adding custom habit to today's selection
  ✅ Saved custom_XXX: completed=0

🔄 [FOCUS] Screen focused
  🎨 Reloading custom habits...
  ✅ Found 1 custom habits

📊 [HABITS] Total habits available: {custom: 1, default: 30, total: 31}
  🎨 Custom habits: ['🧘 Morning Yoga']

📋 [SELECTED] Displaying 1 habits:
  🧘 Morning Yoga (custom_XXX)
```

### **Day 2 - Navigate to Next Day:**
```
📆 [LOAD] Loading habits for 2025-11-04

📖 [LOAD] Loading habit selection for 2025-11-04
  📊 Found 0 habits in database for this date
  💡 No habits found, getting suggestions...

💡 [SUGGEST] Getting suggested habits for 2025-11-04
  📊 Found 1 previous dates with habits
  📅 Most recent date: 2025-11-03
  ✅ Suggesting 1 habits (1 custom, 0 default):
    🎨 CUSTOM: custom_XXX

🏷️ [CATEGORIES] Found 1 categories for 1 tasks: [999]

  ✅ Returning 1 suggested habits (uncompleted)

📋 [SELECTED] Displaying 1 habits:
  🧘 Morning Yoga (custom_XXX)  ← Should appear!
```

## ✅ **Success Criteria**

Custom habits should:
1. ✅ Appear in suggestion logs with "🎨 CUSTOM" prefix
2. ✅ Have category 999 found
3. ✅ Be in habitLookup
4. ✅ Display on home screen
5. ✅ Be selectable and completable
6. ✅ Continue suggesting on subsequent days

---

**Run the tests and share the console output to identify exactly where the flow breaks!** 🔍
