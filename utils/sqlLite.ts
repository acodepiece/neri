import * as SQLite from 'expo-sqlite';
const db = SQLite.openDatabaseSync('habitstreak.db');

export const initDatabase = async () => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      reminder_time TEXT,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS habit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER,
      date TEXT,
      completed INTEGER,
      updated_at TEXT,
      FOREIGN KEY (habit_id) REFERENCES habits(id)
    );

    CREATE TABLE IF NOT EXISTS streaks (
      habit_id INTEGER PRIMARY KEY,
      current_streak INTEGER DEFAULT 0,
      best_streak INTEGER DEFAULT 0,
      last_completed_date TEXT,
      FOREIGN KEY (habit_id) REFERENCES habits(id)
    );
  `);

  console.log('✅ Habit Streak DB initialized');
};
