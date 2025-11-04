import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { HabitSelection } from '@/app/database/habitDb';
import {
  debugAllTables,
  debugStreakCalculation,
  debugUserHabits,
  formatHabitDateKey,
  getHabitStreaks,
  loadHabitSelection,
  saveHabitSelection,
  getCustomHabits,
} from '@/app/database/habitDb';
import { HABIT_CATEGORIES } from '../../(onboarding)/user-preference/UserPreferenceScreen';

type HabitCardItem = {
  id: string;
  title: string;
  frequency: string;
  icon: string;
  categoryId: number;
};

type CalendarDay = {
  key: string;
  label: string;
  day: number;
  isToday: boolean;
  date: Date;
};

const surfaceColor = '#F6EEE7';
const accent = '#FF7A00';
const lightCard = '#FFFFFF';
const textPrimary = '#1B1B1C';
const textMuted = '#7A726C';
const selectedCard = '#16A34A';
const selectedTextPrimary = '#FFFFFF';
const selectedTextSecondary = '#059669';
const selectedBorder = '#15803D';
const selectedCheckBackground = '#14532D';
const unselectedCheckIcon = '#8D8983';
const screenPadding = 24;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const parseDateParam = (value: unknown): Date | null => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return startOfDay(parsed);
};

function useWeekDays() {
  return useMemo(() => {
    const today = startOfDay(new Date());
    const start = new Date(today);
    start.setDate(today.getDate() - 14);

    return Array.from({ length: 29 }).map((_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const weekdayLabel = date
        .toLocaleDateString(undefined, { weekday: 'short' })
        .slice(0, 1)
        .toUpperCase();
      const isToday = date.getTime() === today.getTime();
      return {
        key: date.toISOString(),
        label: weekdayLabel,
        day: date.getDate(),
        isToday,
        date,
      };
    });
  }, []);
}

export default function IndexScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();
  const paramSelectedDate = useMemo(() => parseDateParam(params.date), [params.date]);
  const { width: windowWidth } = useWindowDimensions();
  const [storedTaskIds, setStoredTaskIds] = useState<string[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => new Set());
  const [habitStreaks, setHabitStreaks] = useState<Record<string, number>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(
    () => paramSelectedDate ?? startOfDay(new Date()),
  );
  const selectionRef = useRef<HabitSelection>({
    categories: [],
    tasks: [],
    completed: [],
  });
  const hydratedDateRef = useRef<string | null>(null);
  const paramSelectedDateTime = paramSelectedDate ? paramSelectedDate.getTime() : null;
  const selectedDateKey = useMemo(() => formatHabitDateKey(selectedDate), [selectedDate]);
  const applySelection = useCallback((selection: HabitSelection) => {
    const uniqueTasks = Array.from(new Set(selection.tasks));
    const completed = Array.from(
      new Set((selection.completed ?? []).filter((taskId) => uniqueTasks.includes(taskId))),
    );

    const nextSelection: HabitSelection = {
      categories: Array.from(new Set(selection.categories)),
      tasks: uniqueTasks,
      completed,
    };

    selectionRef.current = nextSelection;
    setStoredTaskIds(nextSelection.tasks);
    setCompletedIds(new Set(nextSelection.completed ?? []));
  }, []);

  useEffect(() => {
    if (paramSelectedDateTime === null) {
      return;
    }

    setSelectedDate((current) => {
      if (current.getTime() === paramSelectedDateTime) {
        return current;
      }

      return new Date(paramSelectedDateTime);
    });
  }, [paramSelectedDateTime]);

  const handleSelectDate = useCallback(
    (nextDate: Date) => {
      const normalized = startOfDay(nextDate);
      setSelectedDate((current) => {
        if (current.getTime() === normalized.getTime()) {
          return current;
        }
        return normalized;
      });
      router.setParams({ date: formatHabitDateKey(normalized) });
    },
    [router],
  );

  const handleAddPress = useCallback(() => {
    router.push({
      pathname: '/customHabit',
      params: { date: selectedDateKey },
    });
  }, [selectedDateKey, router]);

  const [customHabits, setCustomHabits] = useState<any[]>([]);

  // Load custom habits from database
  useEffect(() => {
    const loadCustomHabits = async () => {
      console.log('\n🎨 [CUSTOM] Loading custom habits from database...');
      const habits = await getCustomHabits();
      console.log(`  ✅ Loaded ${habits.length} custom habits:`, habits);
      setCustomHabits(habits);
    };
    loadCustomHabits();
  }, []);

  useEffect(() => {
    hydratedDateRef.current = null;
  }, [selectedDateKey]);

  const allHabits = useMemo<HabitCardItem[]>(() => {
    // Combine default habits with custom habits
    const defaultHabits = HABIT_CATEGORIES.flatMap((category) =>
      category.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        frequency: 'Daily',
        icon: category.icon,
        categoryId: category.id,
      })),
    );

    const customHabitItems = customHabits.map((habit) => ({
      id: habit.id,
      title: habit.name,
      frequency: 'Daily',
      icon: habit.icon,
      categoryId: 999, // Custom category
    }));

    console.log(`\n📊 [HABITS] Total habits available:`, {
      default: defaultHabits.length,
      custom: customHabitItems.length,
      total: defaultHabits.length + customHabitItems.length
    });
    
    if (customHabitItems.length > 0) {
      console.log('  🎨 Custom habits:', customHabitItems.map(h => `${h.icon} ${h.title}`));
    }

    return [...defaultHabits, ...customHabitItems];
  }, [customHabits]);

  const habitLookup = useMemo(() => {
    const map = new Map<string, HabitCardItem>();
    allHabits.forEach((habit) => map.set(habit.id, habit));
    return map;
  }, [allHabits]);

  const debugCurrentState = useCallback(async () => {
    console.log('\n🐛 [DEBUG] Manual debug triggered');
    await debugAllTables();
    console.log('\n📊 Current State:');
    console.log('  Current date:', selectedDateKey);
    console.log('  Stored tasks:', storedTaskIds);
    console.log('  Completed IDs:', Array.from(completedIds));
    console.log('  Habit streaks:', habitStreaks);
    console.log('  Custom habits loaded:', customHabits.length);
    console.log('  Total habits available:', allHabits.length);
    console.log('\n🔍 Habit Lookup:');
    storedTaskIds.forEach(id => {
      const habit = habitLookup.get(id);
      if (habit) {
        console.log(`  ✅ ${id}: ${habit.icon} ${habit.title}`);
      } else {
        console.log(`  ❌ ${id}: NOT FOUND IN LOOKUP`);
      }
    });
  }, [selectedDateKey, storedTaskIds, completedIds, habitStreaks, customHabits, allHabits, habitLookup]);

  // Expose debug function globally for development
  React.useEffect(() => {
    (global as any).debugHabits = debugCurrentState;
    return () => {
      delete (global as any).debugHabits;
    };
  }, [debugCurrentState]);

  const computeCategoriesForTasks = useCallback(
    (tasks: string[]) => {
      const categories = tasks
        .map((taskId) => habitLookup.get(taskId)?.categoryId)
        .filter((value): value is number => typeof value === 'number');
      return Array.from(new Set(categories));
    },
    [habitLookup],
  );

  useEffect(() => {
    let isActive = true;

    const hydrate = async () => {
      console.log(`\n📆 [LOAD] Loading habits for ${selectedDateKey}`);
      
      const selection = await loadHabitSelection(selectedDateKey);
      if (!isActive) {
        return;
      }
      
      console.log('  📋 Loaded selection:', selection);
      applySelection(selection);
      
      // Load streaks for selected habits
      if (selection.tasks.length > 0) {
        console.log('  🔥 Calculating streaks for:', selection.tasks);
        const streaks = await getHabitStreaks(selection.tasks, selectedDateKey);
        console.log('  🎯 Streaks calculated:', streaks);
        if (isActive) {
          setHabitStreaks(streaks);
        }
      } else {
        console.log('  ⚠️ No tasks to calculate streaks for');
      }
      
      hydratedDateRef.current = selectedDateKey;
    };

    hydrate();

    return () => {
      isActive = false;
    };
  }, [selectedDateKey, applySelection]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const hydrate = async () => {
        console.log(`\n🔄 [FOCUS] Screen focused, reloading ${selectedDateKey}`);
        
        // Reload custom habits (in case new ones were added)
        console.log('  🎨 Reloading custom habits...');
        const habits = await getCustomHabits();
        console.log(`  ✅ Found ${habits.length} custom habits`);
        if (isActive) {
          setCustomHabits(habits);
        }
        
        // Force reload from database (don't use cached data)
        const selection = await loadHabitSelection(selectedDateKey);
        if (!isActive) {
          return;
        }
        
        console.log('  📋 Loaded selection on focus:', selection);
        applySelection(selection);
        
        // Load streaks for selected habits
        if (selection.tasks.length > 0) {
          console.log('  🔥 Calculating streaks for:', selection.tasks);
          const streaks = await getHabitStreaks(selection.tasks, selectedDateKey);
          console.log('  🎯 Streaks:', streaks);
          if (isActive) {
            setHabitStreaks(streaks);
          }
        } else {
          console.log('  ⚠️ No tasks to calculate streaks for');
          setHabitStreaks({});
        }
        
        hydratedDateRef.current = selectedDateKey;
      };

      hydrate();

      return () => {
        isActive = false;
      };
    }, [selectedDateKey, applySelection]),
  );

  const selectedHabits = useMemo(() => {
    const seen = new Set<string>();
    const ordered = storedTaskIds.reduce<HabitCardItem[]>((acc, taskId) => {
      if (seen.has(taskId)) {
        return acc;
      }
      const habit = habitLookup.get(taskId);
      if (habit) {
        seen.add(taskId);
        acc.push(habit);
      } else {
        console.warn(`  ⚠️ Habit not found in lookup: ${taskId}`);
      }
      return acc;
    }, []);

    console.log(`\n📋 [SELECTED] Displaying ${ordered.length} habits:`);
    ordered.forEach(h => console.log(`  ${h.icon} ${h.title} (${h.id})`));

    return ordered;
  }, [storedTaskIds, habitLookup]);

  const habitsForSelectedDay = selectedHabits;
  const weekDays = useWeekDays();
  const calendarPageWidth = Math.max(windowWidth - screenPadding * 2, 0);
  const calendarPages = useMemo<CalendarDay[][]>(() => {
    const chunkSize = 7;
    const pages: CalendarDay[][] = [];

    for (let index = 0; index < weekDays.length; index += chunkSize) {
      pages.push(weekDays.slice(index, index + chunkSize));
    }

    return pages;
  }, [weekDays]);
  const flatListRef = useRef<FlatList<CalendarDay[]> | null>(null);
  const hasSyncedPageRef = useRef(false);
  const activePageIndex = useMemo(() => {
    return calendarPages.findIndex((page) =>
      page.some((day) => startOfDay(day.date).getTime() === selectedDate.getTime()),
    );
  }, [calendarPages, selectedDate]);

  useEffect(() => {
    if (activePageIndex < 0 || !flatListRef.current) {
      return;
    }

    const animated = hasSyncedPageRef.current;
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToIndex({
        index: activePageIndex,
        animated,
      });
    });
    if (!hasSyncedPageRef.current) {
      hasSyncedPageRef.current = true;
    }
  }, [activePageIndex, calendarPageWidth]);

  const getItemLayout = useCallback(
    (data: ArrayLike<CalendarDay[]> | null | undefined, index: number) => ({
      length: calendarPageWidth,
      offset: calendarPageWidth * index,
      index,
    }),
    [calendarPageWidth],
  );

  const persistSelection = useCallback(
    (nextTasks: string[], completedOverride?: Set<string>) => {
      const uniqueTasks = Array.from(new Set(nextTasks));
      const nextCategories = computeCategoriesForTasks(uniqueTasks);
      const completedSource = completedOverride
        ? Array.from(completedOverride)
        : Array.from(completedIds);
      const filteredCompleted = completedSource.filter((taskId) => uniqueTasks.includes(taskId));
      const nextSelection: HabitSelection = {
        categories: nextCategories,
        tasks: uniqueTasks,
        completed: filteredCompleted,
      };

      selectionRef.current = nextSelection;

      saveHabitSelection(selectedDateKey, nextSelection, { propagateToFuture: false }).catch((error) => {
        console.warn('Unable to persist habit selection update', error);
      });
    },
    [computeCategoriesForTasks, selectedDateKey, completedIds],
  );

  // Debounce persist to avoid race conditions
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
    }, 300); // 300ms debounce
    
    return () => {
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
      }
    };
  }, [storedTaskIds, persistSelection, selectedDateKey]);

  const toggleHabit = (habitId: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      const willBeCompleted = !prev.has(habitId);

      if (next.has(habitId)) {
        next.delete(habitId);
      } else {
        next.add(habitId);
      }

      selectionRef.current = {
        ...selectionRef.current,
        completed: Array.from(next),
      };

      console.log(`\n🔄 [TOGGLE] ${habitId} -> ${willBeCompleted ? 'completed' : 'uncompleted'}`);

      // Save the current state to database (including suggested habits)
      saveHabitSelection(
        selectedDateKey,
        {
          categories: selectionRef.current.categories,
          tasks: selectionRef.current.tasks,
          completed: Array.from(next),
        },
        { propagateToFuture: false },
      )
        .then(async () => {
          console.log('  ✅ Saved successfully, recalculating streaks...');
          
          // Debug streak calculation
          await debugStreakCalculation(habitId, selectedDateKey);
          
          // Refresh streak for ALL habits (to ensure consistency)
          const allStreaks = await getHabitStreaks(selectionRef.current.tasks, selectedDateKey);
          console.log('  🔥 All streaks refreshed:', allStreaks);
          setHabitStreaks(allStreaks);
        })
        .catch((error) => {
          console.error('❌ Failed to toggle habit completion:', error);
        });

      return next;
    });
  };

  const handleRemoveHabit = useCallback(
    (habitId: string) => {
      setStoredTaskIds((prev) => {
        const next = prev.filter((id) => id !== habitId);

        selectionRef.current = {
          ...selectionRef.current,
          tasks: next,
          completed: selectionRef.current.completed?.filter((id) => id !== habitId) || [],
        };

        // Save the updated state to database
        saveHabitSelection(
          selectedDateKey,
          {
            categories: selectionRef.current.categories,
            tasks: next,
            completed: selectionRef.current.completed,
          },
          { propagateToFuture: false },
        ).catch((error) => {
          console.error('Failed to remove habit:', error);
        });

        return next;
      });
    },
    [selectedDateKey],
  );

  const renderDeleteAction = useCallback(() => {
    return (
      <View style={styles.deleteAction}>
        <Feather name="trash-2" size={18} color="#FFFFFF" />
      </View>
    );
  }, []);

  const isTodaySelected = selectedDate.getTime() === startOfDay(new Date()).getTime();

  return (
    <SafeAreaView style={[styles.safeArea, { paddingBottom: insets.bottom || 24 }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headingGroup}>
            <Text style={styles.heading}>Neri - Habit Track</Text>
            <Text style={styles.headingSub}>
              Review habits scheduled and completed across your week.
            </Text>
          </View>
          <FlatList
            ref={flatListRef}
            horizontal
            data={calendarPages}
            keyExtractor={(_, index) => `week-${index}`}
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            contentContainerStyle={styles.calendarRow}
            getItemLayout={getItemLayout}
            extraData={calendarPageWidth}
            onScrollToIndexFailed={({ index }) => {
              requestAnimationFrame(() => {
                flatListRef.current?.scrollToIndex({ index, animated: false });
              });
            }}
            renderItem={({ item: page }) => (
              <View style={[styles.calendarPage, { width: calendarPageWidth }]}>
                {page.map((day) => {
                  const isSelected = startOfDay(day.date).getTime() === selectedDate.getTime();
                  return (
                    <Pressable
                      key={day.key}
                      onPress={() => handleSelectDate(day.date)}
                      style={({ pressed }) => [styles.calendarItem, pressed && styles.calendarItemPressed]}
                    >
                      <Text
                        style={[
                          styles.calendarLabel,
                          day.isToday && styles.calendarLabelToday,
                          isSelected && styles.calendarLabelSelected,
                        ]}
                      >
                        {day.label}
                      </Text>
                      <View
                        style={[
                          styles.calendarDayWrapper,
                          day.isToday && styles.calendarDayWrapperToday,
                          isSelected && styles.calendarDayWrapperSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.calendarDay,
                            day.isToday && styles.calendarDayToday,
                            isSelected && styles.calendarDaySelected,
                          ]}
                        >
                          {day.day}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Habits</Text>
          <View style={styles.upcomingList}>
            {habitsForSelectedDay.length > 0 ? (
              habitsForSelectedDay.map((habit) => {
                const isSelectedHabit = completedIds.has(habit.id);
                return (
                  <Swipeable
                    key={habit.id}
                    overshootLeft={false}
                    leftThreshold={72}
                    renderLeftActions={renderDeleteAction}
                    onSwipeableOpen={(direction) => {
                      if (direction === 'left') {
                        handleRemoveHabit(habit.id);
                      }
                    }}
                  >
                    <Pressable
                      onPress={() => toggleHabit(habit.id)}
                      style={({ pressed }) => [
                        styles.habitCard,
                        isSelectedHabit && styles.habitCardSelected,
                        pressed && styles.cardPressed,
                      ]}
                    >
                      <View
                        style={[
                          styles.habitIconWrapper,
                          isSelectedHabit && styles.habitIconWrapperSelected,
                        ]}
                      >
                        <Text style={styles.habitIcon}>{habit.icon}</Text>
                      </View>
                      <View style={styles.habitContent}>
                        <Text
                          style={[
                            styles.habitTitle,
                            isSelectedHabit && styles.habitTitleSelected,
                          ]}
                        >
                          {habit.title}
                        </Text>
                        <Text
                          style={[
                            styles.habitSubtitle,
                            isSelectedHabit && styles.habitSubtitleSelected,
                          ]}
                        >
                          {habit.frequency}
                        </Text>
                      </View>
                      {habitStreaks[habit.id] > 0 && (
                        <View style={styles.streakBadge}>
                          <Text style={styles.streakIcon}>🔥</Text>
                          <Text style={styles.streakText}>{habitStreaks[habit.id]}</Text>
                        </View>
                      )}
                      <View
                        style={[
                          styles.habitCheck,
                          isSelectedHabit && styles.habitCheckSelected,
                        ]}
                      >
                        <Feather
                          name="check"
                          size={18}
                          color={isSelectedHabit ? '#FFFFFF' : unselectedCheckIcon}
                        />
                      </View>
                    </Pressable>
                  </Swipeable>
                );
              })
            ) : (
              <View style={styles.emptyStateCard}>
                <Text style={styles.emptyStateText}>No routines scheduled for this day.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      <View
        style={[
          styles.fabContainer,
          {
            bottom: Math.max(insets.bottom, 16),
            right: screenPadding,
          },
        ]}
      >
        <Pressable
          style={[styles.fab, !isTodaySelected && styles.fabDisabled]}
          onPress={handleAddPress}
          disabled={!isTodaySelected}
        >
          <Feather name="plus" size={22} color={isTodaySelected ? '#FFFFFF' : '#6F6B66'} />
        </Pressable>
        {!isTodaySelected && (
          <Text style={styles.fabHint}>Switch to today to add new habits</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: surfaceColor,
  },
  container: {
    paddingHorizontal: screenPadding,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 28,
  },
  header: {
    gap: 20,
    marginBottom: 8,
  },
  headingGroup: {
    flex: 1,
    gap: 6,
  },
  heading: {
    fontSize: 30,
    fontWeight: '700',
    color: textPrimary,
  },
  headingSub: {
    fontSize: 14,
    color: '#5E5A56',
    marginTop: 4,
  },
  calendarRow: {
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  calendarPage: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 4,
  },
  calendarItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
    minWidth: 40,
  },
  calendarItemPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.85,
    borderRadius: 24,
  },
  calendarLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: textMuted,
    marginBottom: 4,
  },
  calendarLabelToday: {
    color: textPrimary,
  },
  calendarLabelSelected: {
    color: '#047857',
    fontWeight: '700',
  },
  calendarDay: {
    fontSize: 16,
    fontWeight: '700',
    color: textPrimary,
  },
  calendarDayToday: {
    color: accent,
  },
  calendarDaySelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  calendarDayActive: {
    color: '#FFFFFF',
  },
  calendarDayWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E1DB',
    backgroundColor: '#FFFFFF',
  },
  calendarDayWrapperToday: {
    borderWidth: 1.5,
    borderColor: accent,
    backgroundColor: '#FFF7ED',
  },
  calendarDayWrapperSelected: {
    backgroundColor: '#34D399',
    borderWidth: 0,
    shadowColor: '#34D399',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: textPrimary,
  },
  emptyStateCard: {
    backgroundColor: lightCard,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: textMuted,
  },
  upcomingList: {
    gap: 14,
  },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 16,
    borderWidth: 1,
    borderColor: '#E9E6E2',
    shadowColor: '#D4CDC5',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 2,
  },
  habitCardSelected: {
    backgroundColor: selectedCard,
    borderColor: selectedBorder,
    shadowColor: '#22C55E',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 4,
  },
  habitIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F5F3F1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0DED9',
  },
  habitIconWrapperSelected: {
    backgroundColor: '#14532D',
    borderColor: selectedBorder,
  },
  habitIcon: {
    fontSize: 28,
  },
  habitContent: {
    flex: 1,
    gap: 4,
  },
  habitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: textPrimary,
  },
  habitTitleSelected: {
    color: selectedTextPrimary,
  },
  habitSubtitle: {
    fontSize: 14,
    color: textMuted,
  },
  habitSubtitleSelected: {
    color: selectedTextSecondary,
  },
  habitCheck: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#E4E1DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitCheckSelected: {
    backgroundColor: selectedCheckBackground,
    borderColor: selectedCheckBackground,
    shadowColor: '#065F46',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  fabContainer: {
    position: 'absolute',
    alignItems: 'flex-end',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 6,
  },
  fabDisabled: {
    backgroundColor: '#E7E3DE',
    shadowOpacity: 0,
    elevation: 0,
  },
  fabHint: {
    marginTop: 10,
    fontSize: 12,
    color: '#6B6A66',
  },
  deleteAction: {
    width: 72,
    height: '100%',
    backgroundColor: '#EF4444',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5E5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#FFE1B3',
  },
  streakIcon: {
    fontSize: 14,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF7A00',
  },
  cardPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.92,
  },
});
