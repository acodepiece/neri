# Custom Habit Feature - Testing & Debugging Guide

## 🎯 **How to Test Custom Habits**

### **Step 1: Create a Custom Habit**

1. **Open the app** and navigate to the home screen
2. **Tap the "+" button** (top right)
3. **Fill in the form:**
   - **Habit name:** "Morning Yoga"
   - **Description:** "15 minutes of stretching" (optional)
   - **Emoji:** Tap "Show all" and select 🧘
4. **Tap "Save Habit"**
5. **Check console output:**

```
💾 [SAVE] Saving custom habit: {
  name: 'Morning Yoga',
  description: '15 minutes of stretching',
  emoji: '🧘'
}

🎨 [CUSTOM] Creating custom habit: {
  id: 'custom_1730641234567_k3j2h9x1',
  name: 'Morning Yoga',
  description: '15 minutes of stretching',
  icon: '🧘'
}

  ✅ Custom habit created successfully: custom_1730641234567_k3j2h9x1
```

6. **You should see an alert:** "Success! 🎉 - Morning Yoga has been added to your habits!"
7. **Tap "OK"** - returns to home screen

### **Step 2: Verify Custom Habit Appears on Home Screen**

**Expected Console Output:**
```
🔄 [FOCUS] Screen focused, reloading 2025-11-03
  🎨 Reloading custom habits...
  ✅ Found 1 custom habits

📊 [HABITS] Total habits available: {
  default: 15,
  custom: 1,
  total: 16
}
  🎨 Custom habits: ['🧘 Morning Yoga']

📋 [SELECTED] Displaying X habits:
  🧘 Morning Yoga (custom_1730641234567_k3j2h9x1)
  ... (other habits)
```

**What to Look For:**
- ✅ Custom habit appears in the habit list
- ✅ Emoji displays correctly (🧘)
- ✅ Habit name shows: "Morning Yoga"
- ✅ Can tap to select/deselect the habit
- ✅ Can mark as complete

### **Step 3: Select and Complete Custom Habit**

1. **Tap on "Morning Yoga 🧘"** to select it
2. **Tap the checkmark** to mark as complete
3. **Check console:**

```
💾 [SAVE] Saving habits for 2025-11-03: {
  tasks: ['p1', 'custom_1730641234567_k3j2h9x1'],
  completed: ['custom_1730641234567_k3j2h9x1']
}
  ✅ Saved custom_1730641234567_k3j2h9x1: completed=1
```

### **Step 4: Verify Next Day**

1. **Swipe to next day** (Nov 4)
2. **Check console:**

```
📆 [LOAD] Loading habits for 2025-11-04

📖 [LOAD] Loading habit selection for 2025-11-04
  📊 Found 0 habits in database for this date
  💡 No habits found, getting suggestions from previous day...

💡 [SUGGEST] Getting suggested habits for 2025-11-04
  📅 Most recent date: 2025-11-03
  ✅ Suggesting 2 habits: ['p1', 'custom_1730641234567_k3j2h9x1']
```

**Expected:**
- ✅ Custom habit appears on next day
- ✅ Starts uncompleted (fresh day)
- ✅ Can complete again

## 🐛 **Debugging Tools**

### **Manual Debug Function**

In the browser console, type:
```javascript
global.debugHabits()
```

**Output:**
```
🐛 [DEBUG] Manual debug triggered

🗄️ DATABASE DEBUG - ALL TABLES

📅 [DEBUG] User Habits for 2025-11-03:
[
  { id: 1, habit_id: 'p1', date: '2025-11-03', completed: 1 },
  { id: 2, habit_id: 'custom_1730641234567_k3j2h9x1', date: '2025-11-03', completed: 1 }
]

📊 Current State:
  Current date: 2025-11-03
  Stored tasks: ['p1', 'custom_1730641234567_k3j2h9x1']
  Completed IDs: ['custom_1730641234567_k3j2h9x1']
  Habit streaks: { p1: 2, custom_1730641234567_k3j2h9x1: 1 }
  Custom habits loaded: 1
  Total habits available: 16

🔍 Habit Lookup:
  ✅ p1: 🏃 Exercise (p1)
  ✅ custom_1730641234567_k3j2h9x1: 🧘 Morning Yoga (custom_1730641234567_k3j2h9x1)
```

### **Check Database Directly**

```javascript
// In console
import { getCustomHabits } from '@/app/database/habitDb';
const habits = await getCustomHabits();
console.log(habits);
```

## ❌ **Common Issues & Solutions**

### **Issue 1: Custom Habit Not Showing on Home Screen**

**Symptoms:**
- Habit saves successfully
- Alert shows "Success!"
- But habit doesn't appear in list

**Debug Steps:**
1. Check console for custom habit loading:
   ```
   🎨 [CUSTOM] Loading custom habits from database...
     ✅ Loaded X custom habits: [...]
   ```

2. Check if habit is in `allHabits`:
   ```
   📊 [HABITS] Total habits available: { custom: 1, ... }
   ```

3. Check if habit is in lookup:
   ```javascript
   global.debugHabits()
   // Look for your habit ID in the lookup
   ```

**Solution:**
- If habit is loaded but not in lookup → Check `habitLookup` creation
- If habit is not loaded → Check `getCustomHabits()` function
- If habit is in lookup but not displayed → Check `storedTaskIds`

### **Issue 2: Custom Habit ID Not Found**

**Symptoms:**
```
⚠️ Habit not found in lookup: custom_1730641234567_k3j2h9x1
```

**Cause:** Habit is in `user_habits` table but not loaded into `allHabits`

**Solution:**
1. Reload custom habits:
   ```javascript
   // This happens automatically on focus
   // Or manually reload the page
   ```

2. Check if custom habit exists in database:
   ```javascript
   global.debugHabits()
   // Check "Custom habits loaded" count
   ```

### **Issue 3: Custom Habit Not Suggesting on Next Day**

**Symptoms:**
- Habit works on creation day
- Doesn't appear on next day

**Debug:**
```
💡 [SUGGEST] Getting suggested habits for 2025-11-04
  ✅ Suggesting X habits: [...]
  // Check if your custom habit ID is in this list
```

**Solution:**
- Custom habits are treated like default habits
- They should auto-suggest if they were selected on previous day
- Check if habit was saved to `user_habits` table

### **Issue 4: Duplicate Custom Habits**

**Symptoms:**
- Same habit appears multiple times

**Cause:** Multiple saves without checking for duplicates

**Solution:**
- Custom habit IDs are unique (timestamp + random)
- Each save creates a new habit
- To avoid: Check if habit name already exists before saving

## 📊 **Database Structure**

### **habits Table**
```sql
SELECT * FROM habits WHERE id LIKE 'custom_%';

Result:
┌─────────────────────────────────┬──────────────┬─────────────┬──────┬─────────────┬───────────────┐
│ id                              │ name         │ description │ icon │ category_id │ category_name │
├─────────────────────────────────┼──────────────┼─────────────┼──────┼─────────────┼───────────────┤
│ custom_1730641234567_k3j2h9x1   │ Morning Yoga │ 15 minutes  │ 🧘   │ 999         │ Custom        │
└─────────────────────────────────┴──────────────┴─────────────┴──────┴─────────────┴───────────────┘
```

### **user_habits Table**
```sql
SELECT * FROM user_habits WHERE habit_id LIKE 'custom_%';

Result:
┌────┬─────────────────────────────────┬────────────┬───────────┐
│ id │ habit_id                        │ date       │ completed │
├────┼─────────────────────────────────┼────────────┼───────────┤
│ 5  │ custom_1730641234567_k3j2h9x1   │ 2025-11-03 │ 1         │
│ 6  │ custom_1730641234567_k3j2h9x1   │ 2025-11-04 │ 0         │
└────┴─────────────────────────────────┴────────────┴───────────┘
```

### **streaks Table**
```sql
SELECT * FROM streaks WHERE habit_id LIKE 'custom_%';

Result:
┌────┬─────────────────────────────────┬────────────────┬─────────────────────┐
│ id │ habit_id                        │ current_streak │ last_completed_date │
├────┼─────────────────────────────────┼────────────────┼─────────────────────┤
│ 3  │ custom_1730641234567_k3j2h9x1   │ 2              │ 2025-11-04          │
└────┴─────────────────────────────────┴────────────────┴─────────────────────┘
```

## ✅ **Expected Console Flow (Complete)**

### **Creating Custom Habit:**
```
💾 [SAVE] Saving custom habit: { name, description, emoji }
🎨 [CUSTOM] Creating custom habit: { id, name, description, icon }
  ✅ Custom habit created successfully: custom_XXX
```

### **Returning to Home:**
```
🔄 [FOCUS] Screen focused, reloading 2025-11-03
  🎨 Reloading custom habits...
  ✅ Found 1 custom habits

📊 [HABITS] Total habits available: { default: 15, custom: 1, total: 16 }
  🎨 Custom habits: ['🧘 Morning Yoga']

📖 [LOAD] Loading habit selection for 2025-11-03
  📊 Found 2 habits in database for this date
  ✅ Returning 2 habits from database

📋 [SELECTED] Displaying 2 habits:
  🏃 Exercise (p1)
  🧘 Morning Yoga (custom_1730641234567_k3j2h9x1)
```

### **Selecting Custom Habit:**
```
💾 [SAVE] Saving habits for 2025-11-03: {
  tasks: ['p1', 'custom_1730641234567_k3j2h9x1'],
  completed: []
}
  ✅ Saved p1: completed=0
  ✅ Saved custom_1730641234567_k3j2h9x1: completed=0
```

### **Completing Custom Habit:**
```
💾 [SAVE] Saving habits for 2025-11-03: {
  tasks: ['p1', 'custom_1730641234567_k3j2h9x1'],
  completed: ['custom_1730641234567_k3j2h9x1']
}
  ✅ Saved custom_1730641234567_k3j2h9x1: completed=1
```

### **Next Day (Auto-Suggest):**
```
📆 [LOAD] Loading habits for 2025-11-04

📖 [LOAD] Loading habit selection for 2025-11-04
  📊 Found 0 habits in database for this date
  💡 No habits found, getting suggestions from previous day...

💡 [SUGGEST] Getting suggested habits for 2025-11-04
  📊 Found 1 previous dates with habits
  📅 Most recent date: 2025-11-03
  ✅ Suggesting 2 habits: ['p1', 'custom_1730641234567_k3j2h9x1']

📋 [SELECTED] Displaying 2 habits:
  🏃 Exercise (p1)
  🧘 Morning Yoga (custom_1730641234567_k3j2h9x1)
```

## 🎯 **Success Criteria**

### **✅ Custom Habit Creation:**
- [ ] Form accepts name, description, emoji
- [ ] Validation works (name required)
- [ ] Saves to database successfully
- [ ] Shows success alert
- [ ] Returns to home screen

### **✅ Home Screen Display:**
- [ ] Custom habit appears in list
- [ ] Emoji displays correctly
- [ ] Can select/deselect
- [ ] Can mark as complete
- [ ] Streak calculates correctly

### **✅ Multi-Day Functionality:**
- [ ] Custom habit suggests on next day
- [ ] Starts uncompleted each day
- [ ] Streak increments when completed
- [ ] Works across multiple days

### **✅ Database Integration:**
- [ ] Habit saved to `habits` table
- [ ] Selection saved to `user_habits` table
- [ ] Streak saved to `streaks` table
- [ ] Data persists across app restarts

## 📝 **Test Checklist**

- [ ] Create custom habit with all fields
- [ ] Create custom habit with only name
- [ ] Try to save without name (validation)
- [ ] Select different emojis
- [ ] Custom habit appears on home
- [ ] Can select custom habit
- [ ] Can complete custom habit
- [ ] Custom habit suggests next day
- [ ] Streak increments correctly
- [ ] Multiple custom habits work
- [ ] Custom habits persist after app restart
- [ ] Debug function shows custom habits
- [ ] Console logs are clear and helpful

---

**If all checks pass, the custom habit feature is working correctly!** ✅
