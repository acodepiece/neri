# Quick Start Guide - SQLite Migration

## ✅ Migration Complete!

Your habit tracking app now uses SQLite database instead of AsyncStorage. All existing functionality is preserved and enhanced.

## 🚀 Running the App

```bash
# Install dependencies (if needed)
npm install

# Start the app
npm start

# Or run directly on a platform
npm run android
npm run ios
```

## 📊 What Happens on First Launch

1. **Database Initialization**: Creates `habitstreak.db` with all tables
2. **Habit Population**: Inserts all habits from `HABIT_CATEGORIES`
3. **Data Migration**: Automatically migrates existing AsyncStorage data (one-time only)
4. **App Loads**: Normal app flow continues

## 🔍 Key Files Modified

### New Files
- `app/database/habitDb.ts` - Database schema and operations
- `app/database/migration.ts` - Migration utility
- `DATABASE_MIGRATION_SUMMARY.md` - Detailed documentation
- `QUICK_START_GUIDE.md` - This file

### Updated Files
- `app/_layout.tsx` - Database initialization on startup
- `app/(tabs)/(home)/index.tsx` - Home screen using database
- `app/(onboarding)/user-preference/select-habits.tsx` - Selection screen
- `app/(onboarding)/user-preference/UserPreferenceScreen.tsx` - Preference screen
- `app/(tabs)/(explore)/index.tsx` - Explore screen
- `app/(tabs)/(streak)/index.tsx` - Streak screen

### Deprecated (but kept)
- `utils/habit-storage.ts` - Old AsyncStorage implementation (no longer used)

## 🎯 How It Works

### Saving Habits
```typescript
import { saveHabitSelection } from '@/app/database/habitDb';

await saveHabitSelection('2025-01-15', {
  categories: [1, 2],
  tasks: ['p1', 'w1', 'r1'],
  completed: ['p1']
});
```

### Loading Habits
```typescript
import { loadHabitSelection } from '@/app/database/habitDb';

const selection = await loadHabitSelection('2025-01-15');
// Returns: { categories: [1, 2], tasks: ['p1', 'w1', 'r1'], completed: ['p1'] }
```

### Toggling Completion
```typescript
import { toggleHabitCompletion } from '@/app/database/habitDb';

await toggleHabitCompletion('p1', '2025-01-15', true); // Mark complete
await toggleHabitCompletion('p1', '2025-01-15', false); // Mark incomplete
```

### Removing Habits
```typescript
import { removeHabitFromDate } from '@/app/database/habitDb';

await removeHabitFromDate('p1', '2025-01-15');
```

## 🧪 Testing Checklist

- [ ] Fresh install works (no existing data)
- [ ] Migration works (with existing AsyncStorage data)
- [ ] Add habits for today
- [ ] Mark habits as complete/incomplete
- [ ] Remove habits via swipe
- [ ] Navigate between dates
- [ ] Check explore screen shows correct data
- [ ] Check streak screen shows analytics
- [ ] Add habits for future dates
- [ ] Check past dates

## 🐛 Troubleshooting

### Database Not Initializing
- Check console for errors in `app/_layout.tsx`
- Ensure `expo-sqlite` is installed: `npm install expo-sqlite`

### Migration Not Running
- Check AsyncStorage for `db_migration_completed` flag
- To force re-migration (testing only):
  ```typescript
  import { resetMigration } from '@/app/database/migration';
  await resetMigration();
  ```

### Data Not Persisting
- Check database operations in console
- Verify `saveHabitSelection` is being called
- Check for transaction errors

### TypeScript Errors
- Run `npm run lint` to check for issues
- Ensure all imports use `@/app/database/habitDb` instead of `@/utils/habit-storage`

## 📱 Database Location

The SQLite database file is stored at:
- **iOS**: `~/Library/Application Support/[app-id]/habitstreak.db`
- **Android**: `/data/data/[package-name]/databases/habitstreak.db`

You can inspect it using:
- [DB Browser for SQLite](https://sqlitebrowser.org/)
- Expo dev tools (future feature)

## 🔄 Rollback (Emergency Only)

If you need to rollback to AsyncStorage:

1. Revert imports in all screens back to `@/utils/habit-storage`
2. Comment out database initialization in `app/_layout.tsx`
3. The old AsyncStorage data is still intact

## 🎉 Benefits You Get

✅ **Performance**: Faster queries, especially for analytics
✅ **Reliability**: ACID transactions, data integrity
✅ **Scalability**: Ready for advanced features
✅ **Analytics**: Complex queries for streaks and statistics
✅ **Offline-first**: All data stored locally
✅ **Type-safe**: Full TypeScript support

## 📚 Next Steps

Consider adding:
- Streak calculation using database queries
- Habit statistics and trends
- Export/import functionality
- Custom habit creation
- Habit reminders
- Multi-device sync preparation

## 💡 Tips

- Database operations are async - always use `await`
- Use transactions for batch operations
- Dates are stored as YYYY-MM-DD strings
- Completion status is 0 (incomplete) or 1 (complete)
- The database auto-inherits habits from previous dates

## 🆘 Support

If you encounter issues:
1. Check console logs for errors
2. Review `DATABASE_MIGRATION_SUMMARY.md` for details
3. Inspect database schema in `app/database/habitDb.ts`
4. Test migration logic in `app/database/migration.ts`

---

**Happy Habit Tracking! 🎯**
