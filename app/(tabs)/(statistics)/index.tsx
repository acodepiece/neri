import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Circle, Svg } from 'react-native-svg';

import { formatHabitDateKey, getHabitDefinitions, loadHabitSelection } from '@/app/database/habitDb';
import type { HabitDefinition, HabitSelection } from '@/app/database/habitDb';

type CalendarDay = {
  key: string;
  label: string;
  date: Date;
  day: number;
};

type HabitCard = {
  id: string;
  title: string;
  frequency: string;
  icon: string;
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

function useWeekDays(): CalendarDay[] {
  return useMemo(() => {
    const today = startOfDay(new Date());
    const start = new Date(today);
    start.setDate(today.getDate() - 14);

    return Array.from({ length: 29 }).map((_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const label = date
        .toLocaleDateString(undefined, { weekday: 'short' })
        .slice(0, 1)
        .toUpperCase();

      return {
        key: date.toISOString(),
        label,
        date,
        day: date.getDate(),
      };
    });
  }, []);
}

const StatisticsScreen = () => {
  const weekDays = useWeekDays();
  const { width: windowWidth } = useWindowDimensions();
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()));
  const [selectedSelection, setSelectedSelection] = useState<HabitSelection | null>(null);
  const [dateCompletions, setDateCompletions] = useState<Map<string, { total: number; completed: number }>>(new Map());
  const [habitDefinitions, setHabitDefinitions] = useState<HabitDefinition[]>([]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadDefinitions = async () => {
        try {
          const definitions = await getHabitDefinitions();
          if (isActive) {
            setHabitDefinitions(definitions);
          }
        } catch (error) {
          console.error('❌ Error loading habit definitions:', error);
        }
      };

      loadDefinitions();

      return () => {
        isActive = false;
      };
    }, []),
  );

  const habitLookup = useMemo(() => {
    const map = new Map<string, HabitCard>();
    habitDefinitions.forEach((habit) => {
      const description = habit.description?.trim();
      const frequency =
        description && description.length > 0
          ? description
          : habit.category_id === 999
          ? 'Custom habit'
          : 'Daily';
      const icon = habit.icon && habit.icon.length > 0 ? habit.icon : '✨';

      map.set(habit.id, {
        id: habit.id,
        title: habit.name,
        frequency,
        icon,
      });
    });
    return map;
  }, [habitDefinitions]);

  const loadSelectionForDate = useCallback(async (date: Date) => {
    return loadHabitSelection(formatHabitDateKey(date));
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const load = async () => {
        const selection = await loadSelectionForDate(selectedDate);

        if (isActive) {
          setSelectedSelection(selection);
        }
      };

      const loadAllDateCompletions = async () => {
        const completionMap = new Map<string, { total: number; completed: number }>();
        
        for (const day of weekDays) {
          const dateKey = formatHabitDateKey(day.date);
          const selection = await loadHabitSelection(dateKey);
          
          if (selection && selection.tasks.length > 0) {
            completionMap.set(dateKey, {
              total: selection.tasks.length,
              completed: selection.completed?.length || 0,
            });
          }
        }
        
        if (isActive) {
          setDateCompletions(completionMap);
        }
      };

      load();
      loadAllDateCompletions();

      return () => {
        isActive = false;
      };
    }, [loadSelectionForDate, selectedDate, weekDays]),
  );

  const handleSelectDay = useCallback((date: Date) => {
    setSelectedDate(startOfDay(date));
  }, []);

  const completedSet = useMemo(() => new Set(selectedSelection?.completed ?? []), [selectedSelection]);

  const habitsForSelectedDate = useMemo(() => {
    if (!selectedSelection) {
      return [];
    }

    const seen = new Set<string>();
    return selectedSelection.tasks.reduce<HabitCard[]>((acc, taskId) => {
      if (seen.has(taskId)) {
        return acc;
      }
      const habit = habitLookup.get(taskId);
      if (habit) {
        acc.push(habit);
        seen.add(taskId);
      }
      return acc;
    }, []);
  }, [selectedSelection, habitLookup]);

  const selectedDateLabel = useMemo(() => {
    return selectedDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  }, [selectedDate]);

  const completionRatio = useMemo(() => {
    if (habitsForSelectedDate.length === 0) {
      return 0;
    }
    return Math.min(1, Math.max(0, completedSet.size / habitsForSelectedDate.length));
  }, [completedSet, habitsForSelectedDate]);

  const animatedProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: completionRatio,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [completionRatio, animatedProgress]);

  const radius = 110;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;
  const AnimatedCircle = useMemo(() => Animated.createAnimatedComponent(Circle), []);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const datePages = useMemo<CalendarDay[][]>(() => {
    const chunkSize = 7;
    const pages: CalendarDay[][] = [];
    for (let index = 0; index < weekDays.length; index += chunkSize) {
      pages.push(weekDays.slice(index, index + chunkSize));
    }
    return pages;
  }, [weekDays]);

  const datePagerWidth = windowWidth - 32;
  const flatListRef = useRef<FlatList<CalendarDay[]> | null>(null);
  const hasSyncedPageRef = useRef(false);

  const activePageIndex = useMemo(() => {
    return datePages.findIndex((page) =>
      page.some((day) => startOfDay(day.date).getTime() === selectedDate.getTime()),
    );
  }, [datePages, selectedDate]);

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
  }, [activePageIndex, datePagerWidth]);

  const getItemLayout = useCallback(
    (_: CalendarDay[][], index: number) => ({
      length: datePagerWidth,
      offset: datePagerWidth * index,
      index,
    }),
    [datePagerWidth],
  );

  const habitFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    habitFade.setValue(0);
    Animated.timing(habitFade, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [habitsForSelectedDate, completedSet, habitFade]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Insights</Text>
          <Text style={styles.headerSubtitle}>
            Track your habit streaks and see how consistent you have been this week.
          </Text>
        </View>
        <View>
          <View style={styles.dateSection}>
            <FlatList
              ref={flatListRef}
              horizontal
              data={datePages}
              keyExtractor={(_, index) => `week-${index}`}
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              getItemLayout={getItemLayout}
              contentContainerStyle={styles.dateRow}
              onScrollToIndexFailed={({ index }) => {
                requestAnimationFrame(() => {
                  flatListRef.current?.scrollToIndex({ index, animated: false });
                });
              }}
              renderItem={({ item: page }) => (
                <View style={[styles.datePage, { width: datePagerWidth }]}> 
                  {page.map((day) => {
                    const isSelected = startOfDay(day.date).getTime() === selectedDate.getTime();
                    const isToday = startOfDay(day.date).getTime() === startOfDay(new Date()).getTime();
                    const dateKey = formatHabitDateKey(day.date);
                    const completion = dateCompletions.get(dateKey);
                    const completionRatio = completion ? completion.completed / completion.total : 0;
                    const isFullyCompleted = completion && completion.completed === completion.total && completion.total > 0;
                    
                    const circleSize = 48;
                    const strokeWidth = 3;
                    const radius = (circleSize - strokeWidth) / 2;
                    const circumference = 2 * Math.PI * radius;
                    const strokeDashoffset = circumference * (1 - completionRatio);

                    return (
                      <Pressable
                        key={day.key}
                        style={styles.dateItem}
                        onPress={() => handleSelectDay(day.date)}
                      >
                        <Text style={[styles.dayText, isSelected && styles.selectedDay]}>{day.label}</Text>
                        <View style={styles.dateCircleContainer}>
                          <Svg width={circleSize} height={circleSize}>
                            <Circle
                              cx={circleSize / 2}
                              cy={circleSize / 2}
                              r={radius}
                              stroke="#E5E1DB"
                              strokeWidth={strokeWidth}
                              fill="none"
                            />
                            {completion && completion.total > 0 && (
                              <Circle
                                cx={circleSize / 2}
                                cy={circleSize / 2}
                                r={radius}
                                stroke={isFullyCompleted ? '#10B981' : '#34D399'}
                                strokeWidth={strokeWidth}
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                fill="none"
                                rotation="-90"
                                origin={`${circleSize / 2}, ${circleSize / 2}`}
                              />
                            )}
                          </Svg>
                          <View
                            style={[
                              styles.dateCircleInner,
                              isToday && styles.dateCircleToday,
                              isSelected && styles.dateCircleSelected,
                              isFullyCompleted && styles.dateCircleCompleted,
                            ]}
                          >
                            {isFullyCompleted ? (
                              <Feather name="check" size={18} color="#FFFFFF" />
                            ) : (
                              <Text style={[styles.dateNumber, isSelected && styles.dateNumberSelected]}>
                                {day.day}
                              </Text>
                            )}
                          </View>
                        </View>
                        {isSelected && <View style={styles.dateIndicator} />}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            />
          </View>

          {/* <View style={styles.progressSection}>
            <View style={styles.progressContainer}>
              <Svg height={(radius + strokeWidth) * 2} width={(radius + strokeWidth) * 2}>
                <Circle
                  cx={radius + strokeWidth}
                  cy={radius + strokeWidth}
                  r={radius}
                  stroke="#D1D5DB"
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                <AnimatedCircle
                  cx={radius + strokeWidth}
                  cy={radius + strokeWidth}
                  r={radius}
                  stroke="#10B981"
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${circumference}`}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="none"
                />
              </Svg>
              <View style={styles.progressCenter}>
                <Text style={styles.progressValue}>{Math.round(completionRatio * 100)}%</Text>
                <Text style={styles.progressLabel}>of habits complete</Text>
              </View>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryChip}>
                <Text style={styles.summaryLabel}>Scheduled</Text>
                <Text style={styles.summaryValue}>{habitsForSelectedDate.length}</Text>
              </View>
              <View style={styles.summaryChip}>
                <Text style={styles.summaryLabel}>Completed</Text>
                <Text style={styles.summaryValue}>{completedSet.size}</Text>
              </View>
            </View>
          </View> */}

          <Animated.View style={[styles.taskSection, { opacity: habitFade }]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Habits for {selectedDateLabel}</Text>
              <Text style={styles.sectionMeta}>
                {completedSet.size}/{habitsForSelectedDate.length}
              </Text>
            </View>
            <View style={styles.habitList}>
              {habitsForSelectedDate.length > 0 ? (
                habitsForSelectedDate.map((habit) => {
                  const isCompleted = completedSet.has(habit.id);
                  return (
                    <View
                      key={habit.id}
                      style={[styles.habitCard, isCompleted && styles.habitCardCompleted]}
                    >
                      <View style={styles.habitIconWrapper}>
                        <Text style={styles.habitIcon}>{habit.icon}</Text>
                      </View>
                      <View style={styles.habitContent}>
                        <Text
                          style={[styles.habitTitle, isCompleted && styles.habitTitleCompleted]}
                          numberOfLines={1}
                        >
                          {habit.title}
                        </Text>
                        <Text style={styles.habitSubtitle}>{habit.frequency}</Text>
                      </View>
                      <View
                        style={[
                          styles.habitStatus,
                          isCompleted && styles.habitStatusCompleted,
                        ]}
                      >
                        <Feather
                          name={isCompleted ? 'check' : 'clock'}
                          size={16}
                          color={isCompleted ? '#047857' : '#6b7280'}
                        />
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.habitEmptyState}>
                  {/* <Text style={styles.habitEmptyTitle}>No habits scheduled</Text>
                  <Text style={styles.habitEmptySubtitle}>
                    Assign habits on the home tab to track them here.
                  </Text> */}
                </View>
              )}
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6EEE7',
    paddingTop: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 24,
  },
  header: {
    gap: 20,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1B1B1C',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#5E5A56',
    marginTop: 4,
  },

  dateSection: {
    paddingVertical: 16,
  },
  dateRow: {
    paddingHorizontal: 0,
  },
  datePage: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  dateItem: {
    alignItems: 'center',
    gap: 8,
    minWidth: 40,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7A726C',
    marginBottom: 4,
  },
  selectedDay: {
    color: '#047857',
    fontWeight: '700',
  },
  dateCircleContainer: {
    position: 'relative',
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCircleInner: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E1DB',
  },
  dateCircleSelected: {
    borderWidth: 2,
    borderColor: '#34D399',
  },
  dateCircleToday: {
    borderWidth: 1.5,
    borderColor: '#FF7A00',
    backgroundColor: '#FFF7ED',
  },
  dateCircleCompleted: {
    backgroundColor: '#10B981',
    borderWidth: 0,
  },
  dateNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B1B1C',
  },
  dateNumberSelected: {
    color: '#1B1B1C',
    fontWeight: '700',
  },
  dateIndicator: {
    marginTop: 6,
    width: 20,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#10B981',
  },
  progressSection: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressValue: {
    fontSize: 38,
    fontWeight: '700',
    color: '#1B1B1C',
  },
  progressLabel: {
    fontSize: 13,
    color: '#7A726C',
    marginTop: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
  },
  summaryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    minWidth: 110,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#065F46',
    marginTop: 4,
  },
  taskSection: {
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B1B1C',
  },
  sectionMeta: {
    fontSize: 13,
    color: '#7A726C',
    fontWeight: '600',
  },
  habitList: {
    gap: 12,
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
  habitCardCompleted: {
    backgroundColor: '#D1FAE5',
    borderColor: '#10B981',
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
    color: '#1B1B1C',
  },
  habitTitleCompleted: {
    color: '#065F46',
  },
  habitSubtitle: {
    fontSize: 14,
    color: '#7A726C',
  },
  habitStatus: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#E4E1DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  habitStatusCompleted: {
    borderColor: '#10B981',
    backgroundColor: '#10B981',
  },
  habitEmptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  habitEmptyTitle: {
    fontSize: 14,
    color: '#7A726C',
  },
  habitEmptySubtitle: {
    fontSize: 13,
    color: '#7A726C',
    textAlign: 'center',
  },
});
export default StatisticsScreen;
