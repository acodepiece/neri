# Streak System - How It Works

## Overview

The streak system tracks consecutive days a habit is completed. When you miss a day, the streak resets to 0 and starts fresh when you complete the habit again.

## Streak Rules

### ✅ Streak Increases
- Complete a habit today → Streak = 1
- Complete it again tomorrow → Streak = 2
- Complete it the next day → Streak = 3
- And so on...

### ❌ Streak Resets
- Miss a day → Streak resets to 0
- Next time you complete it → Streak starts at 1 again

## Examples

### Example 1: Perfect Streak
```
Day 1: ✅ Complete → Streak = 1
Day 2: ✅ Complete → Streak = 2
Day 3: ✅ Complete → Streak = 3
Day 4: ✅ Complete → Streak = 4
```

### Example 2: Broken Streak
```
Day 1: ✅ Complete → Streak = 1
Day 2: ✅ Complete → Streak = 2
Day 3: ❌ Missed   → Streak = 0
Day 4: ✅ Complete → Streak = 1 (starts fresh)
Day 5: ✅ Complete → Streak = 2
```

### Example 3: Multiple Breaks
```
Day 1: ✅ Complete → Streak = 1
Day 2: ✅ Complete → Streak = 2
Day 3: ✅ Complete → Streak = 3
Day 4: ❌ Missed   → Streak = 0
Day 5: ✅ Complete → Streak = 1
Day 6: ❌ Missed   → Streak = 0
Day 7: ✅ Complete → Streak = 1
Day 8: ✅ Complete → Streak = 2
```

## Visual Representation

### In the App
```
┌─────────────────────────────────────────┐
│ 💪  Exercise 30 minutes                 │
│     Daily                    🔥 5    ✓  │
└─────────────────────────────────────────┘
        ↑                        ↑
    Habit name              5-day streak
```

### When Streak is 0
```
┌─────────────────────────────────────────┐
│ 📚  Read for 20 minutes                 │
│     Daily                           ✓   │
└─────────────────────────────────────────┘
                              ↑
                    No streak badge shown
```

## How Calculation Works

### Algorithm
1. Start from today (or selected date)
2. Check if habit was completed today
3. If yes, streak = 1
4. Check yesterday - if completed, streak = 2
5. Check day before - if completed, streak = 3
6. Continue until you find a day that was NOT completed
7. Stop counting - that's your streak!

### SQL Query
```sql
SELECT date FROM user_habits 
WHERE habit_id = ? 
AND completed = 1 
AND date <= ? 
ORDER BY date DESC
```

### Code Logic
```typescript
let streak = 0;
for each completed date (newest first):
  if date == (today - streak days):
    streak++
  else:
    break  // Streak broken!
```

## Performance Optimizations

### Single Query for All Habits
Instead of querying each habit separately:
```typescript
// ❌ Slow (N queries)
for (const habitId of habitIds) {
  streak = await calculateStreak(habitId);
}

// ✅ Fast (1 query)
const allStreaks = await getHabitStreaks(habitIds);
```

### Limited History
- Only checks last 100 days
- Prevents slow queries for old data
- Most streaks won't exceed 100 days anyway

### Cached Results
- Streaks stored in component state
- Only recalculated when needed:
  - On screen load
  - When habit is toggled
  - When date changes

## Edge Cases

### Case 1: New Habit
```
First time completing → Streak = 1
```

### Case 2: Future Dates
```
Can't have streak for future dates
Streak calculated up to "today" or selected date
```

### Case 3: Past Dates
```
Viewing Jan 1: Shows streak as of Jan 1
Viewing Jan 15: Shows streak as of Jan 15
```

### Case 4: Same Day Toggle
```
Complete habit → Streak = 1
Uncomplete same day → Streak = 0
Complete again → Streak = 1
```

## Streak Display Rules

### Show Badge When:
- ✅ Streak > 0
- ✅ Habit exists in database
- ✅ User has completed it at least once

### Hide Badge When:
- ❌ Streak = 0
- ❌ Never completed
- ❌ Loading state

## Motivation System

### Streak Milestones
- 🔥 1-6 days: Getting started
- 🔥 7 days: One week!
- 🔥 14 days: Two weeks!
- 🔥 30 days: One month!
- 🔥 100 days: Century!
- 🔥 365 days: One year! 🎉

### Visual Feedback
- Badge color: Orange (#FF7A00)
- Fire emoji: 🔥
- Bold number for emphasis
- Subtle animation (future enhancement)

## Technical Details

### Database Schema
```sql
user_habits (
  id INTEGER PRIMARY KEY,
  habit_id TEXT,
  date TEXT,        -- YYYY-MM-DD
  completed INTEGER -- 0 or 1
)
```

### State Management
```typescript
const [habitStreaks, setHabitStreaks] = useState<Record<string, number>>({});

// Example state:
{
  'p1': 5,  // 5-day streak
  'w1': 0,  // No streak
  'r1': 12  // 12-day streak
}
```

### Update Triggers
1. **Initial Load**: Calculate all streaks
2. **Focus Effect**: Recalculate on screen focus
3. **Toggle Habit**: Update single habit streak
4. **Date Change**: Recalculate for new date

## Future Enhancements

Consider adding:
- 📊 Longest streak tracking
- 🏆 Streak achievements/badges
- 📈 Streak history graph
- 🔔 Streak reminder notifications
- 💪 Streak recovery (1-day grace period)
- 🎯 Streak goals and challenges
- 📱 Streak widgets
- 🌟 Streak leaderboard (if multi-user)

## Testing Scenarios

### Test Case 1: Build Streak
1. Complete habit today
2. Verify streak = 1
3. Complete tomorrow
4. Verify streak = 2

### Test Case 2: Break Streak
1. Have 5-day streak
2. Skip one day
3. Verify streak = 0
4. Complete next day
5. Verify streak = 1

### Test Case 3: Multiple Habits
1. Complete habit A (streak = 1)
2. Complete habit B (streak = 1)
3. Next day, complete only A
4. Verify A = 2, B = 0

### Test Case 4: Past Dates
1. View past date with 3-day streak
2. Verify shows streak = 3
3. Return to today
4. Verify shows current streak

---

**Remember:** Consistency is key! 🔥

*The streak system is designed to motivate you to build lasting habits through daily consistency.*
