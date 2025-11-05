import * as SQLite from 'expo-sqlite';

// Open or create database
let db: SQLite.SQLiteDatabase | null = null;
let dbInitPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// Initialize database connection
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
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

export type HabitSelection = {
  categories: number[];
  tasks: string[];
  completed?: string[];
};

export type HabitDefinition = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  category_id: number | null;
  category_name: string | null;
};

export type SaveHabitSelectionOptions = {
  propagateToFuture?: boolean;
};

async function syncFutureHabitSelections(
  database: SQLite.SQLiteDatabase,
  sourceDate: string,
  tasks: string[],
) {
  try {
    const futureDates = await database.getAllAsync<{ date: string }>(
      'SELECT DISTINCT date FROM user_habits WHERE date > ? ORDER BY date LIMIT 120',
      [sourceDate],
    );

    if (futureDates.length === 0) {
      return;
    }

    console.log(
      `  🔁 Syncing future selections for ${sourceDate} across ${futureDates.length} date(s)`,
    );

    await database.withTransactionAsync(async () => {
      for (const { date } of futureDates) {
        await database.runAsync('DELETE FROM user_habits WHERE date = ?', [date]);

        if (tasks.length === 0) {
          console.log(`    ✂️ Cleared scheduled habits for ${date}`);
          continue;
        }

        for (const taskId of tasks) {
          await database.runAsync(
            'INSERT OR REPLACE INTO user_habits (habit_id, date, completed) VALUES (?, ?, 0)',
            [taskId, date],
          );
        }

        console.log(`    🔁 Synced ${tasks.length} habits to ${date}`);
      }
    });
  } catch (error) {
    console.warn('  ⚠️ Unable to sync future habit selections', error);
  }
}

// 🔧 Initialize all tables
export async function initDatabase() {
  const database = await getDatabase();
  
  await database.execAsync(
    `CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      category_id INTEGER,
      category_name TEXT
    );`
  );

  await database.execAsync(
    `CREATE TABLE IF NOT EXISTS user_habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id TEXT NOT NULL,
      date TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      UNIQUE(habit_id, date),
      FOREIGN KEY (habit_id) REFERENCES habits(id)
    );`
  );

  await database.execAsync(
    `CREATE TABLE IF NOT EXISTS habit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id TEXT,
      date TEXT,
      completed INTEGER DEFAULT 0,
      FOREIGN KEY (habit_id) REFERENCES habits(id)
    );`
  );

  await database.execAsync(
    `CREATE TABLE IF NOT EXISTS streaks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id TEXT,
      current_streak INTEGER DEFAULT 0,
      last_completed_date TEXT,
      FOREIGN KEY (habit_id) REFERENCES habits(id)
    );`
  );

  await database.execAsync(
    `CREATE INDEX IF NOT EXISTS idx_user_habits_date ON user_habits(date);`
  );
  
  await database.execAsync(
    `CREATE INDEX IF NOT EXISTS idx_user_habits_habit_date ON user_habits(habit_id, date);`
  );
}

// ✅ Insert habits from HABIT_CATEGORIES (called during migration or initialization)
export async function insertHabitsFromCategories(categories: any[]) {
  const database = await getDatabase();
  for (const category of categories) {
    for (const task of category.tasks) {
      const existing = await database.getFirstAsync(
        'SELECT id FROM habits WHERE id = ?',
        [task.id]
      );
      
      if (!existing) {
        await database.runAsync(
          'INSERT INTO habits (id, name, description, icon, category_id, category_name) VALUES (?, ?, ?, ?, ?, ?)',
          [task.id, task.title, task.duration || '', category.icon, category.id, category.name]
        );
      }
    }
  }
}

// 🎨 Create a custom habit
export async function createCustomHabit(
  name: string,
  description: string,
  icon: string
): Promise<string> {
  try {
    const database = await getDatabase();
    
    // Generate unique ID for custom habit (prefix with 'custom_')
    const habitId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`\n🎨 [CUSTOM] Creating custom habit:`, {
      id: habitId,
      name,
      description,
      icon
    });
    
    // Insert into habits table
    await database.runAsync(
      'INSERT INTO habits (id, name, description, icon, category_id, category_name) VALUES (?, ?, ?, ?, ?, ?)',
      [habitId, name, description, icon, 999, 'Custom']
    );
    
    console.log(`  ✅ Custom habit created successfully: ${habitId}`);
    return habitId;
  } catch (error) {
    console.error('❌ Error creating custom habit:', error);
    throw error;
  }
}

// 📋 Get all custom habits
export async function getCustomHabits(): Promise<any[]> {
  try {
    const database = await getDatabase();
    const rows = await database.getAllAsync<{
      id: string;
      name: string;
      description: string;
      icon: string;
    }>(
      'SELECT id, name, description, icon FROM habits WHERE id LIKE "custom_%" ORDER BY id DESC'
    );
    
    console.log(`  📋 Found ${rows.length} custom habits`);
    return rows;
  } catch (error) {
    console.error('❌ Error getting custom habits:', error);
    return [];
  }
}

// 📚 Get all habit definitions (default + custom)
export async function getHabitDefinitions(): Promise<HabitDefinition[]> {
  const database = await getDatabase();
  try {
    return await database.getAllAsync<HabitDefinition>(
      'SELECT id, name, description, icon, category_id, category_name FROM habits ORDER BY id',
    );
  } catch (error) {
    console.error('❌ Error loading habit definitions:', error);
    return [];
  }
}

// 🗑️ Delete a custom habit
export async function deleteCustomHabit(habitId: string): Promise<void> {
  try {
    const database = await getDatabase();
    
    console.log(`\n🗑️ [DELETE] Deleting custom habit: ${habitId}`);
    
    // Delete from user_habits
    await database.runAsync('DELETE FROM user_habits WHERE habit_id = ?', [habitId]);
    
    // Delete from habits
    await database.runAsync('DELETE FROM habits WHERE id = ?', [habitId]);
    
    console.log(`  ✅ Custom habit deleted successfully`);
  } catch (error) {
    console.error('❌ Error deleting custom habit:', error);
    throw error;
  }
}

// 📅 Save habit selection for a specific date
export async function saveHabitSelection(
  dateKey: string,
  selection: HabitSelection,
  options: SaveHabitSelectionOptions = {},
): Promise<void> {
  try {
    const database = await getDatabase();
    
    if (!database) {
      throw new Error('Database not initialized');
    }
    
    const { propagateToFuture = false } = options;
    
    const uniqueTasks = Array.from(new Set(selection.tasks));
    const completedSet = new Set(selection.completed ?? []);

    console.log(`💾 [SAVE] Saving habits for ${dateKey}:`, {
      tasks: uniqueTasks,
      completed: Array.from(completedSet)
    });
    if (propagateToFuture) {
      console.log('  🔁 Future propagation enabled');
    }

    // Remove existing habits for this date
    await database.runAsync('DELETE FROM user_habits WHERE date = ?', [dateKey]);

    // Insert selected habits
    for (const taskId of uniqueTasks) {
      const isCompleted = completedSet.has(taskId) ? 1 : 0;
      await database.runAsync(
        'INSERT OR REPLACE INTO user_habits (habit_id, date, completed) VALUES (?, ?, ?)',
        [taskId, dateKey, isCompleted]
      );
      console.log(`  ✅ Saved ${taskId}: completed=${isCompleted}`);
    }
    
    // Keep future days in sync with the latest selection template
    if (propagateToFuture) {
      await syncFutureHabitSelections(database, dateKey, uniqueTasks);
    }

    // Debug: Show what was saved
    await debugUserHabits(dateKey);
  } catch (error) {
    console.error('❌ Error saving habit selection:', error);
    console.error('   Stack:', error);
    throw error;
  }
}

export async function addHabitToFutureSelections(
  habitId: string,
  startDate: string,
): Promise<void> {
  const database = await getDatabase();

  try {
    const futureDates = await database.getAllAsync<{ date: string }>(
      'SELECT DISTINCT date FROM user_habits WHERE date > ? ORDER BY date LIMIT 120',
      [startDate],
    );

    if (futureDates.length === 0) {
      return;
    }

    let additions = 0;

    await database.withTransactionAsync(async () => {
      for (const { date } of futureDates) {
        const existing = await database.getFirstAsync<{ id: number }>(
          'SELECT id FROM user_habits WHERE habit_id = ? AND date = ? LIMIT 1',
          [habitId, date],
        );

        if (existing) {
          continue;
        }

        await database.runAsync(
          'INSERT INTO user_habits (habit_id, date, completed) VALUES (?, ?, 0)',
          [habitId, date],
        );
        additions += 1;
      }
    });

    if (additions > 0) {
      console.log(
        `  🔁 Added custom habit ${habitId} to ${additions} future date${additions === 1 ? '' : 's'}`,
      );
    }
  } catch (error) {
    console.warn('⚠️ Unable to append habit to future selections', error);
  }
}

// 🧾 Load habit selection for a specific date
export async function loadHabitSelection(dateKey: string): Promise<HabitSelection> {
  const database = await getDatabase();
  try {
    console.log(`\n📖 [LOAD] Loading habit selection for ${dateKey}`);
    
    const rows = await database.getAllAsync<{ habit_id: string; completed: number }>(
      'SELECT habit_id, completed FROM user_habits WHERE date = ? ORDER BY id',
      [dateKey]
    );

    console.log(`  📊 Found ${rows.length} habits in database for this date`);

    // If no habits for this date, return suggested habits from previous date
    if (!rows || rows.length === 0) {
      console.log(`  💡 No habits found, getting suggestions from previous day...`);
      const suggestedTasks = await getSuggestedHabitsFromPreviousDay(dateKey);

      if (suggestedTasks.length > 0) {
        const categories = await getCategoriesForTasks(suggestedTasks);
        const suggestedSelection: HabitSelection = {
          categories,
          tasks: suggestedTasks,
          completed: [],
        };

        try {
          console.log(`  💾 Persisting ${suggestedTasks.length} suggested habits for ${dateKey}`);
          await saveHabitSelection(dateKey, suggestedSelection, { propagateToFuture: false });
        } catch (persistError) {
          console.warn('  ⚠️ Unable to persist suggested habits automatically', persistError);
        }

        console.log(`  ✅ Returning ${suggestedTasks.length} suggested habits (uncompleted)`);
        return suggestedSelection;
      }

      console.log(`  ⚠️ No suggestions available, returning empty`);
      return { categories: [], tasks: [], completed: [] };
    }

    const tasks = rows.map((row: { habit_id: string; completed: number }) => row.habit_id);
    const completed = rows.filter((row: { habit_id: string; completed: number }) => row.completed === 1).map((row: { habit_id: string; completed: number }) => row.habit_id);
    const categories = await getCategoriesForTasks(tasks);

    console.log(`  ✅ Returning ${tasks.length} habits from database (${completed.length} completed)`);
    return {
      categories,
      tasks,
      completed,
    };
  } catch (error) {
    console.error('❌ Error loading habit selection:', error);
    return { categories: [], tasks: [], completed: [] };
  }
}

// 💡 Get suggested habits from most recent previous date (for convenience)
export async function getSuggestedHabitsFromPreviousDay(dateKey: string): Promise<string[]> {
  const database = await getDatabase();
  try {
    console.log(`\n💡 [SUGGEST] Getting suggested habits for ${dateKey}`);
    const latestRow = await database.getFirstAsync<{ latestDate: string }>(
      'SELECT date AS latestDate FROM user_habits WHERE date < ? ORDER BY date DESC LIMIT 1',
      [dateKey],
    );

    if (!latestRow?.latestDate) {
      console.log(`  ⚠️ No previous habits found`);
      return [];
    }

    console.log(`  📅 Most recent date with habits: ${latestRow.latestDate}`);

    const latestRows = await database.getAllAsync<{ habit_id: string }>(
      'SELECT habit_id FROM user_habits WHERE date = ? ORDER BY id',
      [latestRow.latestDate],
    );

    const habitIds = latestRows.map((row) => row.habit_id);
    const customCount = habitIds.filter((id) => id.startsWith('custom_')).length;
    const defaultCount = habitIds.length - customCount;

    console.log(
      `  ✅ Suggesting ${habitIds.length} habits (${customCount} custom, ${defaultCount} default)`,
    );
    habitIds.forEach((id) => {
      const type = id.startsWith('custom_') ? '🎨 CUSTOM' : '📦 DEFAULT';
      console.log(`    ${type}: ${id}`);
    });

    return habitIds;
  } catch (error) {
    console.error('❌ Error getting suggested habits:', error);
    return [];
  }
}

// 🔍 Get categories for given task IDs
async function getCategoriesForTasks(taskIds: string[]): Promise<number[]> {
  if (taskIds.length === 0) return [];

  const database = await getDatabase();
  const placeholders = taskIds.map(() => '?').join(',');
  const rows = await database.getAllAsync<{ category_id: number }>(
    `SELECT DISTINCT category_id FROM habits WHERE id IN (${placeholders})`,
    taskIds
  );

  const categories = rows.map((row: { category_id: number }) => row.category_id).filter((id: number | null): id is number => id !== null);
  
  console.log(`  🏷️ [CATEGORIES] Found ${categories.length} categories for ${taskIds.length} tasks:`, categories);
  
  return categories;
}

// 📊 Load all habit selections (for streak/analytics screens)
export async function loadAllHabitSelections(): Promise<Record<string, HabitSelection>> {
  const database = await getDatabase();
  try {
    const rows = await database.getAllAsync<{ date: string; habit_id: string; completed: number }>(
      'SELECT date, habit_id, completed FROM user_habits ORDER BY date, id'
    );

    const selectionMap: Record<string, HabitSelection> = {};

    for (const row of rows) {
      if (!selectionMap[row.date]) {
        selectionMap[row.date] = {
          categories: [],
          tasks: [],
          completed: [],
        };
      }

      selectionMap[row.date].tasks.push(row.habit_id);
      if (row.completed === 1) {
        selectionMap[row.date].completed!.push(row.habit_id);
      }
    }

    // Get categories for each date
    for (const dateKey in selectionMap) {
      const categories = await getCategoriesForTasks(selectionMap[dateKey].tasks);
      selectionMap[dateKey].categories = categories;
    }

    return selectionMap;
  } catch (error) {
    console.error('Error loading all habit selections:', error);
    return {};
  }
}

// 🗑️ Remove a habit from a specific date
export async function removeHabitFromDate(habitId: string, dateKey: string): Promise<void> {
  const database = await getDatabase();
  try {
    await database.runAsync('DELETE FROM user_habits WHERE habit_id = ? AND date = ?', [
      habitId,
      dateKey,
    ]);
  } catch (error) {
    console.error('Error removing habit:', error);
    throw error;
  }
}

// ✅ Toggle habit completion for a specific date
export async function toggleHabitCompletion(
  habitId: string,
  dateKey: string,
  completed: boolean
): Promise<void> {
  const database = await getDatabase();
  try {
    await database.runAsync(
      'UPDATE user_habits SET completed = ? WHERE habit_id = ? AND date = ?',
      [completed ? 1 : 0, habitId, dateKey]
    );
  } catch (error) {
    console.error('Error toggling habit completion:', error);
    throw error;
  }
}

export async function resetAllHabitProgress(): Promise<void> {
  const database = await getDatabase();

  try {
    await database.withTransactionAsync(async () => {
      console.log('\n🧹 [RESET] Clearing habit progress data...');
      await database.runAsync('DELETE FROM user_habits');
      await database.runAsync('DELETE FROM habit_logs');
      await database.runAsync('DELETE FROM streaks');
    });
    console.log('  ✅ Habit progress reset complete');
  } catch (error) {
    console.error('❌ Failed to reset habit progress', error);
    throw error;
  }
}

// 📅 Format date to YYYY-MM-DD
export function formatHabitDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 🔥 Calculate streak for a habit (optimized)
export async function calculateHabitStreak(habitId: string, upToDate?: string): Promise<number> {
  const database = await getDatabase();
  try {
    const targetDate = upToDate || formatHabitDateKey(new Date());
    
    // Get recent completed dates for this habit (last 100 days max)
    const rows = await database.getAllAsync<{ date: string }>(
      'SELECT date FROM user_habits WHERE habit_id = ? AND completed = 1 AND date <= ? ORDER BY date DESC LIMIT 100',
      [habitId, targetDate]
    );

    if (!rows || rows.length === 0) {
      console.log(`🔥 [STREAK] ${habitId}: No completed dates found. Streak = 0`);
      return 0;
    }

    let streak = 0;
    const checkDate = new Date(targetDate);
    checkDate.setHours(0, 0, 0, 0);

    // Count consecutive days backwards from target date
    for (let i = 0; i < rows.length; i++) {
      const rowDate = new Date(rows[i].date);
      rowDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(checkDate);
      expectedDate.setDate(checkDate.getDate() - streak);

      if (rowDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else {
        // Streak broken - stop counting
        break;
      }
    }

    console.log(`🔥 [STREAK] ${habitId}: ${streak} (from ${rows.length} completed dates)`);
    return streak;
  } catch (error) {
    console.error('❌ Error calculating streak:', error);
    return 0;
  }
}

// 🔥 Get streaks for multiple habits (optimized - single query)
export async function getHabitStreaks(habitIds: string[], upToDate?: string): Promise<Record<string, number>> {
  if (habitIds.length === 0) return {};
  
  const database = await getDatabase();
  const targetDate = upToDate || formatHabitDateKey(new Date());
  const streaks: Record<string, number> = {};
  
  try {
    // Initialize all streaks to 0
    habitIds.forEach(id => streaks[id] = 0);
    
    // Get all completed dates for these habits in one query
    const placeholders = habitIds.map(() => '?').join(',');
    const rows = await database.getAllAsync<{ habit_id: string; date: string }>(
      `SELECT habit_id, date FROM user_habits 
       WHERE habit_id IN (${placeholders}) 
       AND completed = 1 
       AND date <= ? 
       ORDER BY habit_id, date DESC`,
      [...habitIds, targetDate]
    );

    if (!rows || rows.length === 0) return streaks;

    // Group dates by habit_id
    const habitDates: Record<string, string[]> = {};
    rows.forEach(row => {
      if (!habitDates[row.habit_id]) {
        habitDates[row.habit_id] = [];
      }
      habitDates[row.habit_id].push(row.date);
    });

    // Calculate streak for each habit
    const checkDate = new Date(targetDate);
    checkDate.setHours(0, 0, 0, 0);

    for (const habitId of habitIds) {
      const dates = habitDates[habitId];
      if (!dates || dates.length === 0) {
        streaks[habitId] = 0;
        continue;
      }

      let streak = 0;
      for (let i = 0; i < dates.length; i++) {
        const rowDate = new Date(dates[i]);
        rowDate.setHours(0, 0, 0, 0);

        const expectedDate = new Date(checkDate);
        expectedDate.setDate(checkDate.getDate() - streak);

        if (rowDate.getTime() === expectedDate.getTime()) {
          streak++;
        } else {
          break;
        }
      }
      
      streaks[habitId] = streak;
    }

    return streaks;
  } catch (error) {
    console.error('Error calculating streaks:', error);
    return streaks;
  }
}

// 🧾 Get today’s habits with completion & streak
export async function getTodaysHabits() {
  const database = await getDatabase();
  const today = new Date().toISOString().split('T')[0];
  return await database.getAllAsync(`
    SELECT h.id, h.name,
           IFNULL(l.completed, 0) AS completed,
           IFNULL(s.current_streak, 0) AS streak
    FROM habits h
    LEFT JOIN habit_logs l
      ON h.id = l.habit_id AND l.date = ?
    LEFT JOIN streaks s
      ON h.id = s.habit_id
    ORDER BY h.id;
  `, [today]);
}

// 🐛 DEBUG: Show all habits
export async function showAllHabits() {
  const db = await getDatabase();
  const rows = await db.getAllAsync('SELECT * FROM habits');
  console.log('📋 [DEBUG] All Habits:', rows);
  return rows;
}

// 🐛 DEBUG: Show all user_habits entries
export async function debugUserHabits(dateKey?: string) {
  const db = await getDatabase();
  if (dateKey) {
    const rows = await db.getAllAsync(
      'SELECT * FROM user_habits WHERE date = ? ORDER BY habit_id',
      [dateKey]
    );
    console.log(`📅 [DEBUG] User Habits for ${dateKey}:`, rows);
    return rows;
  } else {
    const rows = await db.getAllAsync(
      'SELECT * FROM user_habits ORDER BY date DESC, habit_id LIMIT 50'
    );
    console.log('📅 [DEBUG] Recent User Habits (last 50):', rows);
    return rows;
  }
}

// 🐛 DEBUG: Show streak calculation details for a habit
export async function debugStreakCalculation(habitId: string, upToDate?: string) {
  const database = await getDatabase();
  const targetDate = upToDate || formatHabitDateKey(new Date());
  
  console.log(`\n🔥 [DEBUG] Calculating streak for habit: ${habitId} up to ${targetDate}`);
  
  // Get all completed dates
  const rows = await database.getAllAsync<{ date: string; completed: number }>(
    'SELECT date, completed FROM user_habits WHERE habit_id = ? AND date <= ? ORDER BY date DESC LIMIT 20',
    [habitId, targetDate]
  );
  
  console.log('  📊 Completed dates found:', rows);
  
  const completedRows = rows.filter(r => r.completed === 1);
  console.log('  ✅ Filtered completed (=1):', completedRows);
  
  if (completedRows.length === 0) {
    console.log('  ❌ No completed dates found. Streak = 0\n');
    return 0;
  }
  
  let streak = 0;
  const checkDate = new Date(targetDate);
  checkDate.setHours(0, 0, 0, 0);
  
  console.log('  🔍 Checking consecutive days from', targetDate);
  
  for (let i = 0; i < completedRows.length; i++) {
    const rowDate = new Date(completedRows[i].date);
    rowDate.setHours(0, 0, 0, 0);
    
    const expectedDate = new Date(checkDate);
    expectedDate.setDate(checkDate.getDate() - streak);
    
    const rowDateStr = formatHabitDateKey(rowDate);
    const expectedDateStr = formatHabitDateKey(expectedDate);
    
    console.log(`    Day ${i}: Expected ${expectedDateStr}, Got ${rowDateStr}, Match: ${rowDateStr === expectedDateStr}`);
    
    if (rowDate.getTime() === expectedDate.getTime()) {
      streak++;
      console.log(`      ✅ Streak = ${streak}`);
    } else {
      console.log(`      ❌ Streak broken at ${streak}`);
      break;
    }
  }
  
  console.log(`  🎯 Final Streak: ${streak}\n`);
  return streak;
}

// 🐛 DEBUG: Show all database tables and their contents
export async function debugAllTables() {
  const db = await getDatabase();
  
  console.log('\n═══════════════════════════════════════════');
  console.log('🗄️  DATABASE DEBUG - ALL TABLES');
  console.log('═══════════════════════════════════════════\n');
  
  // Habits table
  const habits = await db.getAllAsync('SELECT * FROM habits');
  console.log('📋 HABITS TABLE:', habits.length, 'rows');
  console.table(habits);
  
  // User habits table
  const userHabits = await db.getAllAsync(
    'SELECT * FROM user_habits ORDER BY date DESC, habit_id LIMIT 30'
  );
  console.log('\n📅 USER_HABITS TABLE (last 30):', userHabits.length, 'rows');
  console.table(userHabits);
  
  // Streaks table
  const streaks = await db.getAllAsync('SELECT * FROM streaks');
  console.log('\n🔥 STREAKS TABLE:', streaks.length, 'rows');
  console.table(streaks);
  
  // Habit logs table
  const logs = await db.getAllAsync(
    'SELECT * FROM habit_logs ORDER BY date DESC LIMIT 20'
  );
  console.log('\n📝 HABIT_LOGS TABLE (last 20):', logs.length, 'rows');
  console.table(logs);
  
  console.log('\n═══════════════════════════════════════════\n');
}
