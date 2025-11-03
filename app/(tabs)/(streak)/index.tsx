import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { HABIT_CATEGORIES } from '../../(onboarding)/user-preference/UserPreferenceScreen';
import {
  formatHabitDateKey,
  loadAllHabitSelections,
  type HabitSelection,
} from '@/app/database/habitDb';

type RangePreset = 'week' | 'month' | 'year' | 'all';

type DayRecord = {
  dateKey: string;
  date: Date;
  selection: HabitSelection;
};

type TopHabit = {
  rank: number;
  title: string;
  icon: string;
  completionRate: number;
  streakDays: number;
};

const surfaceColor = '#F6EEE7';
const cardColor = '#FFFFFF';
const borderColor = '#E6E0D5';
const textPrimary = '#1B1B1C';
const textMuted = '#7A726C';
const accent = '#FF7A00';
const heatmapBaseColor = '#F3F1EB';
const heatmapPalette = ['#E5DFD2', '#D5C8A9', '#C0AE7C', '#9E8A52', '#6F5C33'];
const heatmapActiveFill = '#FF8C42';
const heatmapActiveRing = '#FFE1C4';

const startOfDay = (input: Date) =>
  new Date(input.getFullYear(), input.getMonth(), input.getDate());

const addDays = (date: Date, amount: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return startOfDay(next);
};

const startOfWeek = (date: Date) => {
  const next = startOfDay(date);
  const day = next.getDay();
  return addDays(next, -day);
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const startOfYear = (date: Date) => new Date(date.getFullYear(), 0, 1);

const endOfWeek = (date: Date) => addDays(date, 6);
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
const endOfYear = (date: Date) => new Date(date.getFullYear(), 11, 31);

const alignAnchor = (preset: RangePreset, date: Date) => {
  switch (preset) {
    case 'week':
      return startOfWeek(date);
    case 'month':
      return startOfMonth(date);
    case 'year':
      return startOfYear(date);
    case 'all':
    default:
      return startOfDay(date);
  }
};

const shiftAnchor = (preset: RangePreset, anchor: Date, delta: number) => {
  switch (preset) {
    case 'week':
      return addDays(anchor, delta * 7);
    case 'month':
      return new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1);
    case 'year':
      return new Date(anchor.getFullYear() + delta, 0, 1);
    case 'all':
    default:
      return anchor;
  }
};

const formatRangeLabel = (start: Date, end: Date) => {
  const baseOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  const startLabel = start.toLocaleDateString(undefined, baseOptions);
  const endLabel = end.toLocaleDateString(undefined, baseOptions);
  if (startLabel === endLabel) {
    return startLabel;
  }
  return `${startLabel} - ${endLabel}`;
};

const calculateCurrentStreak = (dateKeys: string[]): number => {
  if (!dateKeys.length) {
    return 0;
  }

  const ordered = Array.from(new Set(dateKeys))
    .map((key) => startOfDay(new Date(key)))
    .sort((a, b) => b.getTime() - a.getTime());

  let streak = 0;
  let expected: Date | null = null;

  for (const date of ordered) {
    if (streak === 0) {
      streak = 1;
      expected = addDays(date, -1);
      continue;
    }

    if (!expected) {
      break;
    }

    if (date.getTime() === expected.getTime()) {
      streak += 1;
      expected = addDays(date, -1);
    } else {
      break;
    }
  }

  return streak;
};

const getHeatmapIntensity = (completions: number) => {
  if (completions === 0) {
    return 0;
  }
  if (completions === 1) {
    return 1;
  }
  if (completions <= 3) {
    return 2;
  }
  if (completions <= 5) {
    return 3;
  }
  return 4;
};

export default function StreakScreen() {
  const { width } = useWindowDimensions();
  const heatmapColumns = Math.max(1, Math.floor(width / 18));
  const [preset, setPreset] = useState<RangePreset>('week');
  const [anchorDate, setAnchorDate] = useState<Date>(() =>
    alignAnchor('week', startOfDay(new Date())),
  );
  const [records, setRecords] = useState<DayRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      setIsLoading(true);

      const hydrate = async () => {
        console.log('\n📊 [STREAK] Loading all habit selections...');
        const selections = await loadAllHabitSelections();
        if (!isActive) {
          return;
        }

        const nextRecords = Object.entries(selections)
          .map(([dateKey, selection]) => ({
            dateKey,
            date: startOfDay(new Date(dateKey)),
            selection,
          }))
          .sort((a, b) => a.date.getTime() - b.date.getTime());

        console.log(`  ✅ Loaded ${nextRecords.length} days of data`);
        console.log(`  📈 Total completions: ${nextRecords.reduce((sum, r) => sum + (r.selection.completed?.length ?? 0), 0)}`);
        setRecords(nextRecords);
        setIsLoading(false);
      };

      hydrate();

      return () => {
        isActive = false;
      };
    }, []),
  );

  const today = startOfDay(new Date());
  const alignedAnchor = useMemo(() => alignAnchor(preset, anchorDate), [preset, anchorDate]);

  const range = useMemo(() => {
    if (preset === 'all') {
      if (!records.length) {
        return { start: alignedAnchor, end: alignedAnchor };
      }
      return {
        start: records[0].date,
        end: records[records.length - 1].date,
      };
    }

    switch (preset) {
      case 'week':
        return {
          start: alignedAnchor,
          end: endOfWeek(alignedAnchor),
        };
      case 'month':
        return {
          start: alignedAnchor,
          end: endOfMonth(alignedAnchor),
        };
      case 'year':
        return {
          start: alignedAnchor,
          end: endOfYear(alignedAnchor),
        };
      default:
        return { start: alignedAnchor, end: alignedAnchor };
    }
  }, [preset, alignedAnchor, records]);

  const canNavigateBackward = useMemo(() => {
    if (preset === 'all') {
      return false;
    }
    if (!records.length) {
      return true;
    }
    const earliest = records[0].date.getTime();
    return range.start.getTime() > earliest;
  }, [preset, range.start, records]);

  const canNavigateForward = useMemo(() => {
    if (preset === 'all') {
      return false;
    }
    return range.end.getTime() < today.getTime();
  }, [preset, range.end, today]);

  const filteredRecords = useMemo(() => {
    return records.filter(
      (record) =>
        record.date.getTime() >= range.start.getTime() &&
        record.date.getTime() <= range.end.getTime(),
    );
  }, [records, range]);

  const completionDatesByHabit = useMemo(() => {
    const map = new Map<string, string[]>();
    records.forEach((record) => {
      const completed = record.selection.completed ?? [];
      completed.forEach((habitId) => {
        const bucket = map.get(habitId);
        if (bucket) {
          if (!bucket.includes(record.dateKey)) {
            bucket.push(record.dateKey);
          }
        } else {
          map.set(habitId, [record.dateKey]);
        }
      });
    });
    map.forEach((list, key) => {
      const normalized = Array.from(new Set(list)).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime(),
      );
      map.set(key, normalized);
    });
    return map;
  }, [records]);

  const allHabits = useMemo(() => {
    return HABIT_CATEGORIES.flatMap((category) =>
      category.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        icon: category.icon,
      })),
    );
  }, []);

  const habitLookup = useMemo(() => {
    const map = new Map<string, { title: string; icon: string }>();
    allHabits.forEach((habit) => map.set(habit.id, { title: habit.title, icon: habit.icon }));
    return map;
  }, [allHabits]);

  const totalCompletions = useMemo(() => {
    return filteredRecords.reduce((sum, record) => {
      return sum + (record.selection.completed?.length ?? 0);
    }, 0);
  }, [filteredRecords]);

  const totalScheduled = useMemo(() => {
    return filteredRecords.reduce((sum, record) => {
      return sum + record.selection.tasks.length;
    }, 0);
  }, [filteredRecords]);

  const completionRate = totalScheduled === 0 ? null : (totalCompletions / totalScheduled) * 100;

  const topHabits = useMemo(() => {
    const counts = new Map<string, number>();

    filteredRecords.forEach((record) => {
      (record.selection.completed ?? []).forEach((habitId) => {
        counts.set(habitId, (counts.get(habitId) ?? 0) + 1);
      });
    });

    const ranked = Array.from(counts.entries())
      .map(([habitId, count]) => {
        const meta = habitLookup.get(habitId);
        if (!meta) {
          return null;
        }
        const completionDates = completionDatesByHabit.get(habitId) ?? [];
        const streakDays = calculateCurrentStreak(completionDates);
        const rate = totalScheduled === 0 ? 0 : (count / filteredRecords.length) * 100;
        return {
          habitId,
          title: meta.title,
          icon: meta.icon,
          completionCount: count,
          streakDays,
          completionRate: rate,
        };
      })
      .filter((value): value is Exclude<typeof value, null> => value !== null)
      .sort((a, b) => {
        if (b.completionCount !== a.completionCount) {
          return b.completionCount - a.completionCount;
        }
        if (b.streakDays !== a.streakDays) {
          return b.streakDays - a.streakDays;
        }
        return a.title.localeCompare(b.title);
      })
      .slice(0, 3)
      .map((item, index): TopHabit => ({
        rank: index + 1,
        title: item.title,
        icon: item.icon,
        streakDays: item.streakDays,
        completionRate: item.completionRate,
      }));

    if (ranked.length > 0) {
      return ranked;
    }

    return Array.from({ length: 3 }).map(
      (_, index): TopHabit => ({
        rank: index + 1,
        title: 'No data yet',
        icon: '⏳',
        streakDays: 0,
        completionRate: 0,
      }),
    );
  }, [
    completionDatesByHabit,
    filteredRecords,
    habitLookup,
    totalScheduled,
  ]);

  const heatmapDays = useMemo(() => {
    const days: Array<{
      date: Date;
      dateKey: string;
      intensity: number;
      completions: number;
      scheduled: number;
      hasActivity: boolean;
      isLatestActive: boolean;
    }> = [];

    const todayKey = formatHabitDateKey(today);
    const recordMap = new Map(records.map((record) => [record.dateKey, record.selection]));

    const latestActiveRecord = [...records]
      .slice()
      .reverse()
      .find((record) => (record.selection.completed?.length ?? 0) > 0);
    const latestActiveKey = latestActiveRecord?.dateKey ?? null;

    const totalDays = 7 * 12; // 12 weeks
    for (let index = totalDays - 1; index >= 0; index -= 1) {
      const date = addDays(today, -index);
      const dateKey = formatHabitDateKey(date);
      const selection = recordMap.get(dateKey);
      const completions = selection?.completed?.length ?? 0;
      const scheduled = selection?.tasks.length ?? 0;
      const intensity = scheduled === 0 ? 0 : getHeatmapIntensity(completions);
      const hasActivity = completions > 0;
      const isLatestActive = latestActiveKey === dateKey;

      days.push({
        date,
        dateKey,
        intensity,
        completions,
        scheduled,
        hasActivity,
        isLatestActive,
      });
    }

    if (!days.some((day) => day.dateKey === todayKey)) {
      days.push({
        date: today,
        dateKey: todayKey,
        intensity: 0,
        completions: 0,
        scheduled: 0,
        hasActivity: false,
        isLatestActive: latestActiveKey === todayKey,
      });
    }

    return days;
  }, [records, today]);

  const handlePresetSelect = useCallback(
    (nextPreset: RangePreset) => {
      setPreset(nextPreset);
      setAnchorDate(alignAnchor(nextPreset, today));
    },
    [today],
  );

  const handleNavigate = useCallback(
    (direction: number) => {
      if (preset === 'all') {
        return;
      }
      setAnchorDate((current) => {
        const nextAnchor = shiftAnchor(preset, current, direction);
        const aligned = alignAnchor(preset, nextAnchor);
        if (direction > 0) {
          const nextRangeEnd =
            preset === 'week'
              ? endOfWeek(aligned)
              : preset === 'month'
              ? endOfMonth(aligned)
              : endOfYear(aligned);
          if (nextRangeEnd.getTime() > today.getTime()) {
            return current;
          }
        }
        return aligned;
      });
    },
    [preset, today],
  );

  const renderHeatmapCell = useCallback(
    ({ item }: { item: (typeof heatmapDays)[number] }) => {
      const backgroundColor = item.hasActivity
        ? heatmapPalette[item.intensity]
        : heatmapBaseColor;

      return (
        <View style={styles.heatmapCellWrapper}>
          {item.isLatestActive && <View style={styles.heatmapCellHalo} />}
          <View
            style={[
              styles.heatmapCell,
              {
                backgroundColor: item.isLatestActive ? heatmapActiveFill : backgroundColor,
                borderColor: item.isLatestActive ? heatmapActiveRing : 'transparent',
              },
            ]}
          />
        </View>
      );
    },
    [],
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 }}>
          <Text style={{ fontSize: 24 }}>📊</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: textMuted }}>Loading your progress...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.segmentedControl}>
          {(['week', 'month', 'year', 'all'] as RangePreset[]).map((value) => (
            <Pressable
              key={value}
              style={[styles.segment, preset === value && styles.segmentActive]}
              onPress={() => handlePresetSelect(value)}
            >
              <Text style={[styles.segmentLabel, preset === value && styles.segmentLabelActive]}>
                {value === 'week' && 'W'}
                {value === 'month' && 'M'}
                {value === 'year' && 'Y'}
                {value === 'all' && 'All'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.rangeHeader}>
          <Pressable
            onPress={() => handleNavigate(-1)}
            disabled={!canNavigateBackward}
            style={[styles.navButton, !canNavigateBackward && styles.navButtonDisabled]}
          >
            <Feather
              name="chevron-left"
              size={20}
              color={canNavigateBackward ? textPrimary : '#C8C3BC'}
            />
          </Pressable>
          <Text style={styles.rangeLabel}>{formatRangeLabel(range.start, range.end)}</Text>
          <Pressable
            onPress={() => handleNavigate(1)}
            disabled={!canNavigateForward}
            style={[styles.navButton, !canNavigateForward && styles.navButtonDisabled]}
          >
            <Feather
              name="chevron-right"
              size={20}
              color={canNavigateForward ? textPrimary : '#C8C3BC'}
            />
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Completions</Text>
            <Text style={styles.summaryValue}>{totalCompletions}</Text>
            <Text style={styles.summarySubtext}>tasks done</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Success Rate</Text>
            <Text style={styles.summaryValue}>
              {completionRate === null ? '-' : `${Math.round(completionRate)}%`}
            </Text>
            <Text style={styles.summarySubtext}>completion</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Activity Heatmap</Text>
          <FlatList
            data={heatmapDays}
            renderItem={renderHeatmapCell}
            keyExtractor={(item) => item.dateKey}
            numColumns={heatmapColumns}
            columnWrapperStyle={styles.heatmapRow}
            scrollEnabled={false}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Top Performing Habits</Text>
          <View style={styles.habitList}>
            {topHabits.map((habit) => (
              <View key={habit.rank} style={styles.habitRow}>
                <View style={styles.habitRank}>
                  <Text style={styles.habitRankLabel}>{habit.rank}</Text>
                </View>
                <View style={styles.habitDetails}>
                  <View style={styles.habitTitleRow}>
                    <Text style={styles.habitTitle}>{habit.title}</Text>
                    <Text style={styles.habitIcon}>{habit.icon}</Text>
                  </View>
                  <Text style={styles.habitSubtitle}>{habit.streakDays} days streak</Text>
                </View>
                <Text style={styles.habitRate}>{`${Math.round(habit.completionRate)}%`}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: surfaceColor,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 20,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F0E7DE',
    borderRadius: 16,
    padding: 4,
    justifyContent: 'space-between',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  segmentActive: {
    backgroundColor: cardColor,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: textMuted,
  },
  segmentLabelActive: {
    color: textPrimary,
  },
  rangeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rangeLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: textPrimary,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: cardColor,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: borderColor,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  navButtonDisabled: {
    backgroundColor: '#EAE4DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: cardColor,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: borderColor,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: textMuted,
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '800',
    color: textPrimary,
    letterSpacing: -1,
  },
  summarySubtext: {
    fontSize: 11,
    fontWeight: '500',
    color: textMuted,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: cardColor,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: borderColor,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 3,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: textPrimary,
  },
  heatmapRow: {
    gap: 6,
    marginBottom: 6,
  },
  heatmapCellWrapper: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heatmapCell: {
    width: 12,
    height: 12,
    borderRadius: 4,
    borderWidth: 1,
  },
  heatmapCellHalo: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: heatmapActiveRing,
    opacity: 0.35,
  },
  habitList: {
    gap: 16,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  habitRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF5E5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFE1B3',
  },
  habitRankLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: accent,
  },
  habitDetails: {
    flex: 1,
    gap: 4,
  },
  habitTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  habitTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: textPrimary,
  },
  habitSubtitle: {
    fontSize: 12,
    color: textMuted,
  },
  habitIcon: {
    fontSize: 18,
  },
  habitRate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
});
