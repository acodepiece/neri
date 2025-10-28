import React, { useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';

import UserPreference from './userPreference';

const planToCategoryMap: Record<string, number[]> = {
  gym: [2],
  water: [5],
  meals: [5],
  steps: [2],
  stretch: [4],
  vitamins: [5],
  sugar: [5],
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

export default function UserPreferenceRoute() {
  const params = useLocalSearchParams<{ categories?: string }>();

  const initialCategoryIds = useMemo(() => {
    const selectedPlans = parseSelectedPlans(params.categories);
    const categorySet = new Set<number>();

    selectedPlans.forEach((planId) => {
      const mapped = planToCategoryMap[planId];
      mapped?.forEach((categoryId) => categorySet.add(categoryId));
    });

    return Array.from(categorySet);
  }, [params.categories]);

  return <UserPreference initialSelectedCategories={initialCategoryIds} />;
}
