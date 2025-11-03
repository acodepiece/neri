import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';

import { formatHabitDateKey, loadHabitSelection } from '@/app/database/habitDb';

import UserPreferenceScreen, { HABIT_CATEGORIES } from './UserPreferenceScreen';

const planToCategoryMap: Record<string, number[]> = {
  gym: [2],
  water: [2],
  meals: [2],
  steps: [2],
  stretch: [2, 3],
  vitamins: [3],
  sugar: [3],
};

function parseSelectedPlans(value: unknown): string[] {
  if (typeof value !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
  } catch {
    // fall back to comma-separated parsing
    return value
      .split(',')
      .map((segment) => segment.trim())
      .filter(Boolean);
  }

  return [];
}

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function resolveDateKey(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.length > 0) {
      if (DATE_KEY_PATTERN.test(trimmed)) {
        return trimmed;
      }
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        return formatHabitDateKey(parsed);
      }
    }
  }
  return formatHabitDateKey(new Date());
}

export default function SelectHabitsScreen() {
  const params = useLocalSearchParams<{ categories?: string; date?: string }>();
  const [persistedTasks, setPersistedTasks] = useState<string[]>([]);
  const [persistedCategories, setPersistedCategories] = useState<number[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  const planIds = useMemo(() => parseSelectedPlans(params.categories), [params.categories]);
  const selectedDateKey = useMemo(() => resolveDateKey(params.date), [params.date]);

  const recommendedCategories = useMemo(() => {
    const categorySet = new Set<number>();

    planIds.forEach((planId) => {
      const mapped = planToCategoryMap[planId];
      mapped?.forEach((categoryId) => categorySet.add(categoryId));
    });

    persistedTasks.forEach((taskId) => {
      HABIT_CATEGORIES.forEach((category) => {
        if (category.tasks.some((task) => task.id === taskId)) {
          categorySet.add(category.id);
        }
      });
    });

    return Array.from(categorySet);
  }, [planIds, persistedTasks]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const hydrate = async () => {
        const selection = await loadHabitSelection(selectedDateKey);
        if (!isActive) {
          return;
        }

        setPersistedTasks(selection.tasks);
        setPersistedCategories(selection.categories);
        setIsHydrated(true);
      };

      hydrate();

      return () => {
        isActive = false;
      };
    }, [selectedDateKey]),
  );

  const initialCategories = useMemo(() => {
    if (!isHydrated) {
      return recommendedCategories;
    }

    return Array.from(new Set([...recommendedCategories, ...persistedCategories]));
  }, [recommendedCategories, persistedCategories, isHydrated]);

  const initialTasks = isHydrated ? persistedTasks : [];

  return (
    <UserPreferenceScreen
      dateKey={selectedDateKey}
      initialSelectedCategories={initialCategories}
      initialSelectedTasks={initialTasks}
    />
  );
}
