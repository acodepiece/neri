import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  ListRenderItem,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { saveHabitSelection } from '@/app/database/habitDb';

type HabitTask = {
  id: string;
  title: string;
  duration: string;
  icon: string;
};

type HabitCategory = {
  id: number;
  name: string;
  icon: string;
  palette: {
    background: string;
    border: string;
    accent: string;
  };
  tasks: HabitTask[];
};

type FlattenedHabit = {
  id: string;
  title: string;
  duration: string;
  categoryId: number;
  categoryName: string;
  icon: string;
  palette: HabitCategory['palette'];
};

export const HABIT_CATEGORIES: HabitCategory[] = [
  {
    id: 1,
    name: 'Daily Essentials',
    icon: '🌟',
    palette: {
      background: '#F5F3FF',
      border: '#C4B5FD',
      accent: '#8B5CF6',
    },
    tasks: [
      { id: 'habit_read', title: 'Read 40 pages of a book', duration: 'Today', icon: '📖' },
      { id: 'habit_steps', title: 'Complete 5,000 steps', duration: 'Today', icon: '👣' },
      { id: 'habit_water', title: 'Drink 3L of water', duration: 'Today', icon: '💧' },
      { id: 'habit_journal', title: 'Write a journal entry', duration: '10 min', icon: '📝' },
      { id: 'habit_meditate', title: 'Do a meditation session', duration: '15 min', icon: '🧘' },
    ],
  },
];

type UserPreferenceProps = {
  dateKey: string;
  initialSelectedCategories?: number[];
  initialSelectedTasks?: string[];
};

export default function UserPreferenceScreen({
  dateKey,
  initialSelectedCategories = [],
  initialSelectedTasks = [],
}: UserPreferenceProps) {
  const router = useRouter();
  const [selectedTasks, setSelectedTasks] = useState<string[]>(() =>
    Array.from(new Set(initialSelectedTasks)),
  );
  const [isSaving, setIsSaving] = useState(false);

  const selectedCount = selectedTasks.length;
  const minimalHabits = useMemo<FlattenedHabit[]>(() => {
    const allTasks = HABIT_CATEGORIES.flatMap((category) =>
      category.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        duration: task.duration,
        categoryId: category.id,
        categoryName: category.name,
        icon: task.icon,
        palette: category.palette,
      })),
    );

    return allTasks.slice(0, 10);
  }, []);

  useEffect(() => {
    const allowedIds = new Set(minimalHabits.map((habit) => habit.id));
    const sanitized = Array.from(new Set(initialSelectedTasks)).filter((id) =>
      allowedIds.has(id),
    );
    setSelectedTasks(sanitized);
  }, [initialSelectedTasks, minimalHabits]);

  const toggleTask = useCallback((taskId: string) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId) ? prev.filter((value) => value !== taskId) : [...prev, taskId],
    );
  }, []);

  const recommendedCategoryIds = useMemo(
    () => Array.from(new Set(initialSelectedCategories)),
    [initialSelectedCategories],
  );

  const selectedCategoryIds = useMemo(() => {
    const categorySet = new Set<number>();

    HABIT_CATEGORIES.forEach((category) => {
      if (category.tasks.some((task) => selectedTasks.includes(task.id))) {
        categorySet.add(category.id);
      }
    });

    return Array.from(categorySet);
  }, [selectedTasks]);

  const handleContinue = useCallback(async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await saveHabitSelection(
        dateKey,
        {
          categories: selectedCategoryIds,
          tasks: selectedTasks,
        },
        { propagateToFuture: true },
      );

      Alert.alert('Habits Saved', `You selected ${selectedCount} tasks to track!`);
      router.push({
        pathname: '/(onboarding)/notification-reminder',
        params: {
          date: dateKey,
          selectionCount: String(selectedCount),
        },
      });
    } finally {
      setIsSaving(false);
    }
  }, [dateKey, isSaving, selectedCategoryIds, selectedTasks, selectedCount, router]);

  const renderHabitItem = useCallback<ListRenderItem<FlattenedHabit>>(
    ({ item }) => {
      const isSelected = selectedTasks.includes(item.id);
      const isRecommended = recommendedCategoryIds.includes(item.categoryId);

      return (
        <Pressable
          onPress={() => toggleTask(item.id)}
          style={[
            styles.habitRow,
            { borderColor: isSelected ? item.palette.border : '#E5E7EB' },
            isSelected && styles.habitRowSelected,
          ]}
        >
          <View style={styles.habitInfo}>
            <View
              style={[
                styles.habitIconBadge,
                { backgroundColor: isSelected ? item.palette.accent : '#F3F4F6' },
              ]}
            >
              <Text style={[styles.habitIcon, isSelected && styles.habitIconSelected]}>
                {item.icon}
              </Text>
            </View>
            <View style={styles.habitCopy}>
              <Text style={[styles.habitTitle, isSelected && styles.habitTitleSelected]}>
                {item.title}
              </Text>
              <View style={styles.habitMetaRow}>
                <Text style={styles.habitDuration}>{item.duration}</Text>
                <Text style={styles.habitCategoryLabel}>{item.categoryName}</Text>
                {isRecommended && (
                  <View style={styles.recommendedPill}>
                    <Text style={styles.recommendedPillText}>Recommended</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          <View
            style={[
              styles.checkbox,
              isSelected && {
                backgroundColor: item.palette.accent,
                borderColor: item.palette.accent,
              },
            ]}
          >
            {isSelected && <Feather name="check" size={14} color="#FFFFFF" />}
          </View>
        </Pressable>
      );
    },
    [recommendedCategoryIds, selectedTasks, toggleTask],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        <View style={styles.headerContainer}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>Choose Your Habits</Text>
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{selectedCount} selected</Text>
            </View>
          </View>
        </View>

        <FlatList
          data={minimalHabits}
          keyExtractor={(item) => item.id}
          renderItem={renderHabitItem}
          contentContainerStyle={styles.listContent}
          extraData={selectedTasks}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />

        <View style={styles.footer}>
          <Pressable
            style={[
              styles.primaryButton,
              (selectedCount === 0 || isSaving) && styles.primaryButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={selectedCount === 0 || isSaving}
          >
            <Text style={styles.primaryButtonText}>
              {selectedCount > 0
                ? `Start Tracking (${selectedCount} habits)`
                : 'Select habits to start tracking'}
            </Text>
            {selectedCount > 0 && <Feather name="arrow-right" size={18} color="#FFFFFF" />}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  root: {
    flex: 1,
  },
  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 12,
    elevation: 4,
    zIndex: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  headerBadgeText: {
    color: '#6D28D9',
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  separator: {
    height: 16,
  },
  habitRow: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 10,
    elevation: 3,
  },
  habitRowSelected: {
    shadowOpacity: 0.14,
  },
  habitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  habitIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  habitIcon: {
    fontSize: 26,
  },
  habitIconSelected: {
    color: '#FFFFFF',
  },
  habitCopy: {
    flex: 1,
    gap: 6,
  },
  habitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  habitTitleSelected: {
    color: '#111827',
  },
  habitMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  habitDuration: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  habitCategoryLabel: {
    fontSize: 12,
    color: '#4B5563',
  },
  recommendedPill: {
    backgroundColor: '#ECFEFF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  recommendedPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0E7490',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: -6 },
    shadowRadius: 10,
    elevation: 8,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4C1D95',
    paddingVertical: 16,
    borderRadius: 20,
    gap: 10,
  },
  primaryButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
