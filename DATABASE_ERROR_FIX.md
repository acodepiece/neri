# Database NullPointerException Fix

## 🔴 Error

```
ERROR: Call to function 'NativeDatabase.prepareAsync' has been rejected.
→ Caused by: java.lang.NullPointerException
```

## 🔍 Root Cause

The database connection was `null` when operations were being performed. This happened because:

1. **Race condition:** Database operations were called before `initDatabase()` completed
2. **No initialization check:** Functions didn't verify database was ready
3. **Single instance issue:** Database instance wasn't properly managed

## ✅ Fixes Applied

### 1. **Improved Database Initialization** 🔧

**Before:**
```typescript
let db: SQLite.SQLiteDatabase;

export async function getDatabase() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('habitstreak.db');
  }
  return db;
}
```

**After:**
```typescript
let db: SQLite.SQLiteDatabase | null = null;
let dbInitPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase() {
  // If database is already initialized, return it
  if (db) {
    return db;
  }
  
  // If initialization is in progress, wait for it
  if (dbInitPromise) {
    return dbInitPromise;
  }
  
  // Start initialization
  dbInitPromise = (async () => {
    try {
      console.log('🔧 [DB] Opening database...');
      db = await SQLite.openDatabaseAsync('habitstreak.db');
      console.log('✅ [DB] Database opened successfully');
      return db;
    } catch (error) {
      console.error('❌ [DB] Failed to open database:', error);
      dbInitPromise = null;
      throw error;
    }
  })();
  
  return dbInitPromise;
}
```

**Benefits:**
- ✅ Prevents multiple simultaneous initializations
- ✅ Handles concurrent calls gracefully
- ✅ Better error handling
- ✅ Logging for debugging

### 2. **Added Safety Checks** 🛡️

**Before:**
```typescript
export async function saveHabitSelection(dateKey, selection) {
  const database = await getDatabase();
  // ... operations
}
```

**After:**
```typescript
export async function saveHabitSelection(dateKey, selection) {
  try {
    const database = await getDatabase();
    
    if (!database) {
      throw new Error('Database not initialized');
    }
    
    // ... operations
  } catch (error) {
    console.error('❌ Error saving habit selection:', error);
    console.error('   Stack:', error);
    throw error;
  }
}
```

**Benefits:**
- ✅ Explicit null check
- ✅ Better error messages
- ✅ Stack trace logging

### 3. **Enhanced App Initialization Logging** 📝

**Added detailed logging to `_layout.tsx`:**
```typescript
console.log('🚀 [APP] Starting app initialization...');
console.log('📦 [APP] Initializing database...');
await initDatabase();
console.log('✅ [APP] Database initialized');
console.log('📋 [APP] Inserting habits from categories...');
await insertHabitsFromCategories(HABIT_CATEGORIES);
console.log('✅ [APP] Habits inserted');
console.log('🔄 [APP] Running migration...');
await migrateToDatabase(HABIT_CATEGORIES);
console.log('✅ [APP] Migration complete');
console.log('🎉 [APP] App initialization complete!');
```

**Benefits:**
- ✅ See exactly where initialization fails
- ✅ Track initialization progress
- ✅ Identify timing issues

## 🧪 How to Test

### Step 1: Clear App Data
```bash
# On Android
adb shell pm clear com.yourapp.package

# Or uninstall and reinstall
```

### Step 2: Run App
```bash
npm start
```

### Step 3: Watch Console

**Expected Output:**
```
🚀 [APP] Starting app initialization...
📦 [APP] Initializing database...
🔧 [DB] Opening database...
✅ [DB] Database opened successfully
✅ [APP] Database initialized
📋 [APP] Inserting habits from categories...
✅ [APP] Habits inserted
🔄 [APP] Running migration...
✅ [APP] Migration complete
🎉 [APP] App initialization complete!
```

**If you see this, database is working!** ✅

### Step 4: Test Operations

1. **Add a habit:**
   ```
   💾 [SAVE] Saving habits for 2025-11-03
     ✅ Saved s1: completed=0
   📅 [DEBUG] User Habits for 2025-11-03: [...]
   ```

2. **Toggle completion:**
   ```
   🔄 [TOGGLE] s1 -> completed
   💾 [SAVE] Saving habits for 2025-11-03
     ✅ Saved s1: completed=1
   ```

3. **Navigate to next day:**
   ```
   📖 [LOAD] Loading habit selection for 2025-11-04
     📊 Found 0 habits in database for this date
     💡 No habits found, getting suggestions from previous day...
   💡 [SUGGEST] Getting suggested habits for 2025-11-04
     📅 Most recent date: 2025-11-03
     ✅ Suggesting 1 habits: ['s1']
   ```

## 🐛 If Error Still Occurs

### Check 1: Database File Permissions
```bash
# On Android, check if app has storage permissions
adb shell run-as com.yourapp.package ls -la databases/
```

### Check 2: expo-sqlite Version
```bash
# Check package.json
cat package.json | grep expo-sqlite
```

**Should be:** `"expo-sqlite": "^14.0.0"` or higher

### Check 3: Clear Metro Cache
```bash
npm start -- --reset-cache
```

### Check 4: Rebuild App
```bash
# Clean and rebuild
rm -rf node_modules
npm install
npm start
```

## 📊 Error Patterns to Watch For

### Pattern 1: Database Not Initialized
```
❌ [DB] Failed to open database: [error]
❌ [APP] Failed to initialize app: [error]
```
**Solution:** Check file permissions, storage access

### Pattern 2: Concurrent Access
```
💾 [SAVE] Saving habits...
📖 [LOAD] Loading habits...  ← Called before save completes
```
**Solution:** Already fixed with `dbInitPromise` pattern

### Pattern 3: Null Database
```
❌ Error saving habit selection: Database not initialized
```
**Solution:** Already fixed with null check

## 🎯 Expected Behavior Now

1. **App starts:**
   - Database opens successfully
   - Tables created
   - Habits inserted
   - Migration runs
   - ✅ Ready to use

2. **Operations:**
   - All database calls wait for initialization
   - Concurrent calls handled gracefully
   - Errors logged with details
   - ✅ No NullPointerException

3. **Debugging:**
   - Clear console logs at each step
   - Error messages show exact problem
   - Stack traces available
   - ✅ Easy to diagnose issues

## 📝 Summary of Changes

### Files Modified:

1. **`app/database/habitDb.ts`**
   - ✅ Improved `getDatabase()` with promise handling
   - ✅ Added null checks to all operations
   - ✅ Enhanced error logging
   - ✅ Added initialization logging

2. **`app/_layout.tsx`**
   - ✅ Added detailed initialization logging
   - ✅ Better error handling
   - ✅ Error details in console

### Key Improvements:

1. **Thread Safety** 🔒
   - Prevents concurrent initialization
   - Handles race conditions

2. **Error Handling** 🛡️
   - Null checks everywhere
   - Detailed error messages
   - Stack traces

3. **Debugging** 🐛
   - Comprehensive logging
   - Clear progress indicators
   - Easy problem identification

---

**The NullPointerException should be fixed now!** 🎉

**Run the app and watch the console - it will tell you exactly what's happening!** 📱
