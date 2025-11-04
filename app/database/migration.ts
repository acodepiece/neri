import AsyncStorage from '@react-native-async-storage/async-storage';
import { initDatabase, insertHabitsFromCategories, saveHabitSelection, formatHabitDateKey } from './habitDb';
import type { HabitSelection } from './habitDb';

const STORAGE_KEY = 'habitSelected';
const MIGRATION_FLAG_KEY = 'db_migration_completed';
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type HabitSelectionRecord = {
  version: 2;
  dates: Record<string, HabitSelection>;
};

/**
 * Migrate data from AsyncStorage to SQLite database
 */
export async function migrateToDatabase(habitCategories: any[]): Promise<void> {
  try {
    // Check if migration already completed
    const migrationCompleted = await AsyncStorage.getItem(MIGRATION_FLAG_KEY);
    if (migrationCompleted === 'true') {
      console.log('Migration already completed, skipping...');
      return;
    }

    console.log('Starting migration from AsyncStorage to SQLite...');

    // Initialize database
    await initDatabase();

    // Insert all habits from categories
    await insertHabitsFromCategories(habitCategories);

    // Read data from AsyncStorage
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) {
      console.log('No AsyncStorage data found to migrate');
      await AsyncStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      return;
    }

    const parsed = JSON.parse(stored);
    let selections: Record<string, HabitSelection> = {};

    // Handle different storage formats
    if (parsed && typeof parsed === 'object') {
      if ('dates' in parsed && parsed.dates && typeof parsed.dates === 'object') {
        // Version 2 format
        selections = parsed.dates as Record<string, HabitSelection>;
      } else if ('categories' in parsed || 'tasks' in parsed) {
        // Legacy format - single selection
        const legacySelection = parsed as HabitSelection;
        if (legacySelection.tasks && legacySelection.tasks.length > 0) {
          // Apply to today
          const today = formatHabitDateKey(new Date());
          selections[today] = legacySelection;
        }
      }
    }

    // Migrate each date's selection to database
    let migratedCount = 0;
    for (const [dateKey, selection] of Object.entries(selections)) {
      // Skip invalid date keys
      if (!DATE_KEY_PATTERN.test(dateKey)) {
        continue;
      }

      // Ensure selection has required fields
      if (!selection.tasks || selection.tasks.length === 0) {
        continue;
      }

      try {
        await saveHabitSelection(
          dateKey,
          {
            categories: selection.categories || [],
            tasks: selection.tasks || [],
            completed: selection.completed || [],
          },
          { propagateToFuture: false },
        );
        migratedCount++;
      } catch (error) {
        console.error(`Error migrating date ${dateKey}:`, error);
      }
    }

    console.log(`Migration completed: ${migratedCount} dates migrated`);

    // Mark migration as completed
    await AsyncStorage.setItem(MIGRATION_FLAG_KEY, 'true');

    // Optionally, clear old AsyncStorage data
    // await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Reset migration flag (for testing purposes)
 */
export async function resetMigration(): Promise<void> {
  await AsyncStorage.removeItem(MIGRATION_FLAG_KEY);
  console.log('Migration flag reset');
}
