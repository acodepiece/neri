# Architecture Overview - SQLite Migration

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        App Startup                          │
│                      (app/_layout.tsx)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├─► initDatabase()
                     ├─► insertHabitsFromCategories()
                     └─► migrateToDatabase() [one-time]
                     │
┌────────────────────▼────────────────────────────────────────┐
│                   SQLite Database                           │
│                  (habitstreak.db)                           │
├─────────────────────────────────────────────────────────────┤
│  Tables:                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   habits     │  │ user_habits  │  │ habit_logs   │     │
│  │              │  │              │  │              │     │
│  │ • id (PK)    │  │ • id (PK)    │  │ • id (PK)    │     │
│  │ • name       │  │ • habit_id   │  │ • habit_id   │     │
│  │ • icon       │  │ • date       │  │ • date       │     │
│  │ • category   │  │ • completed  │  │ • completed  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  Indexes:                                                   │
│  • idx_user_habits_date                                     │
│  • idx_user_habits_habit_date                               │
└─────────────────────────────────────────────────────────────┘
                     │
                     │ CRUD Operations
                     │
┌────────────────────▼────────────────────────────────────────┐
│              Database Layer (habitDb.ts)                    │
├─────────────────────────────────────────────────────────────┤
│  Functions:                                                 │
│  • saveHabitSelection(dateKey, selection)                   │
│  • loadHabitSelection(dateKey)                              │
│  • loadAllHabitSelections()                                 │
│  • toggleHabitCompletion(habitId, dateKey, completed)       │
│  • removeHabitFromDate(habitId, dateKey)                    │
│  • formatHabitDateKey(date)                                 │
└─────────────────────────────────────────────────────────────┘
                     │
                     │ Used by
                     │
┌────────────────────▼────────────────────────────────────────┐
│                    UI Screens                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    Home     │  │   Explore   │  │   Streak    │        │
│  │   Screen    │  │   Screen    │  │   Screen    │        │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤        │
│  │ • Load      │  │ • Load      │  │ • Load All  │        │
│  │ • Save      │  │ • Analytics │  │ • Stats     │        │
│  │ • Toggle    │  │ • Calendar  │  │ • Heatmap   │        │
│  │ • Remove    │  │             │  │ • Top Habits│        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────────────────────────────────────┐           │
│  │      Habit Selection Screen                 │           │
│  ├─────────────────────────────────────────────┤           │
│  │ • Load existing selection                   │           │
│  │ • Save new selection                        │           │
│  └─────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Loading Habits for a Date

```
User selects date
       │
       ▼
loadHabitSelection(dateKey)
       │
       ├─► Query: SELECT * FROM user_habits WHERE date = ?
       │
       ├─► If found: Return habits with completion status
       │
       └─► If not found:
           ├─► Query: Find most recent previous date
           ├─► Load habits from that date
           └─► Return with completed = []
```

### 2. Saving Habits

```
User selects habits
       │
       ▼
saveHabitSelection(dateKey, selection)
       │
       ├─► BEGIN TRANSACTION
       ├─► DELETE FROM user_habits WHERE date = ?
       ├─► INSERT INTO user_habits (habit_id, date, completed)
       │   FOR EACH selected habit
       └─► COMMIT
```

### 3. Toggling Completion

```
User taps habit
       │
       ▼
toggleHabitCompletion(habitId, dateKey, completed)
       │
       └─► UPDATE user_habits 
           SET completed = ? 
           WHERE habit_id = ? AND date = ?
```

### 4. Removing Habit

```
User swipes to delete
       │
       ▼
removeHabitFromDate(habitId, dateKey)
       │
       └─► DELETE FROM user_habits 
           WHERE habit_id = ? AND date = ?
```

## Migration Flow

```
App First Launch
       │
       ▼
Check migration flag
       │
       ├─► If completed: Skip
       │
       └─► If not completed:
           │
           ├─► Read AsyncStorage data
           │
           ├─► Parse storage format
           │   ├─► Version 2: { dates: {...} }
           │   └─► Legacy: { categories, tasks, completed }
           │
           ├─► For each date:
           │   └─► saveHabitSelection(date, selection)
           │
           └─► Set migration flag = true
```

## Database Schema Relationships

```
┌──────────────────┐
│     habits       │
│                  │
│ id (PK)          │◄─────────┐
│ name             │          │
│ icon             │          │
│ category_id      │          │
└──────────────────┘          │
                              │
                              │ FOREIGN KEY
                              │
                    ┌─────────┴──────────┐
                    │   user_habits      │
                    │                    │
                    │ id (PK)            │
                    │ habit_id (FK)      │
                    │ date               │
                    │ completed          │
                    │                    │
                    │ UNIQUE(habit_id,   │
                    │        date)       │
                    └────────────────────┘
```

## State Management

### Home Screen State Flow

```
Component Mount
       │
       ▼
useEffect(() => {
  loadHabitSelection(selectedDateKey)
})
       │
       ▼
Update Local State:
  • storedTaskIds
  • completedIds
       │
       ▼
Render UI
       │
       ├─► User toggles habit
       │   └─► toggleHabitCompletion() → Update DB
       │
       ├─► User removes habit
       │   └─► removeHabitFromDate() → Update DB
       │
       └─► User changes date
           └─► loadHabitSelection(newDate) → Update state
```

## Performance Optimizations

### Indexes
```sql
-- Fast date-based queries
CREATE INDEX idx_user_habits_date 
ON user_habits(date);

-- Fast habit+date lookups
CREATE INDEX idx_user_habits_habit_date 
ON user_habits(habit_id, date);
```

### Transactions
```typescript
// Atomic saves - all or nothing
BEGIN TRANSACTION
  DELETE old habits
  INSERT new habits
COMMIT
```

### Query Optimization
```typescript
// Single query with JOINs instead of multiple queries
SELECT h.*, uh.completed 
FROM habits h
LEFT JOIN user_habits uh ON h.id = uh.habit_id
WHERE uh.date = ?
```

## Error Handling

```
Database Operation
       │
       ├─► Success: Return data
       │
       └─► Error:
           ├─► Log to console
           ├─► Rollback transaction (if applicable)
           └─► Return empty/default data
```

## Type Safety

```typescript
// Strict TypeScript types throughout

type HabitSelection = {
  categories: number[];
  tasks: string[];
  completed?: string[];
};

// Database operations return typed data
const selection: HabitSelection = await loadHabitSelection(date);

// Type-safe queries
const rows = await db.getAllAsync<{ habit_id: string; completed: number }>(
  'SELECT habit_id, completed FROM user_habits WHERE date = ?',
  [dateKey]
);
```

## Scalability Considerations

### Current Capacity
- ✅ Handles thousands of habit entries
- ✅ Efficient date-range queries
- ✅ Fast completion toggles

### Future Enhancements
- 📊 Streak calculations (using window functions)
- 📈 Aggregated statistics (using GROUP BY)
- 🔔 Reminders (new table: habit_reminders)
- ☁️ Cloud sync (sync_status column)
- 📤 Export (JSON/CSV generation)

## Security

### Data Protection
- ✅ Local-only storage (no network transmission)
- ✅ SQLite file in app's private directory
- ✅ No sensitive data stored

### SQL Injection Prevention
- ✅ Parameterized queries (no string concatenation)
- ✅ Type-safe inputs

```typescript
// ✅ Safe - parameterized
db.runAsync('SELECT * FROM habits WHERE id = ?', [habitId]);

// ❌ Unsafe - string concatenation (NOT USED)
db.runAsync(`SELECT * FROM habits WHERE id = '${habitId}'`);
```

## Monitoring & Debugging

### Console Logging
```typescript
// All database operations log errors
catch (error) {
  console.error('Error loading habit selection:', error);
}
```

### Database Inspection
- Use DB Browser for SQLite
- Export database file from device
- Inspect tables, indexes, and data

---

**Architecture designed for:**
- 🚀 Performance
- 🔒 Reliability
- 📈 Scalability
- 💻 Maintainability
