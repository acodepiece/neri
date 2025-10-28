import React, { useEffect, useState } from 'react';
import {
  Alert,
  LayoutAnimation,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

type HabitTask = {
  id: string;
  title: string;
  duration: string;
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

export const HABIT_CATEGORIES: HabitCategory[] = [
  {
    id: 1,
    name: 'Productivity',
    icon: '📊',
    palette: {
      background: '#EFF6FF',
      border: '#93C5FD',
      accent: '#3B82F6',
    },
    tasks: [
      { id: 'p1', title: 'Deep work for 2 hours', duration: '120 min' },
      { id: 'p2', title: 'Complete 3 important tasks', duration: '90 min' },
      { id: 'p3', title: 'Review and plan tomorrow', duration: '15 min' },
      { id: 'p4', title: 'No social media before noon', duration: 'All day' },
      { id: 'p5', title: 'Time blocking schedule', duration: '30 min' },
    ],
  },
  {
    id: 2,
    name: 'Workout',
    icon: '💪',
    palette: {
      background: '#FEF2F2',
      border: '#FCA5A5',
      accent: '#F97316',
    },
    tasks: [
      { id: 'w1', title: 'Run for 30 minutes', duration: '30 min' },
      { id: 'w2', title: 'Strength training', duration: '45 min' },
      { id: 'w3', title: '10,000 steps daily', duration: 'All day' },
      { id: 'w4', title: 'Yoga or stretching', duration: '20 min' },
      { id: 'w5', title: 'HIIT workout', duration: '25 min' },
    ],
  },
  {
    id: 3,
    name: 'Reading',
    icon: '📚',
    palette: {
      background: '#ECFDF5',
      border: '#6EE7B7',
      accent: '#10B981',
    },
    tasks: [
      { id: 'r1', title: 'Read for 30 minutes', duration: '30 min' },
      { id: 'r2', title: 'Finish one chapter', duration: '45 min' },
      { id: 'r3', title: 'Read before bed', duration: '20 min' },
      { id: 'r4', title: 'Audiobook during commute', duration: '30 min' },
      { id: 'r5', title: 'Take reading notes', duration: '15 min' },
    ],
  },
  {
    id: 4,
    name: 'Meditation',
    icon: '🧘',
    palette: {
      background: '#F5F3FF',
      border: '#C4B5FD',
      accent: '#8B5CF6',
    },
    tasks: [
      { id: 'm1', title: 'Morning meditation', duration: '10 min' },
      { id: 'm2', title: 'Breathing exercises', duration: '5 min' },
      { id: 'm3', title: 'Guided meditation', duration: '15 min' },
      { id: 'm4', title: 'Mindful walking', duration: '20 min' },
      { id: 'm5', title: 'Evening reflection', duration: '10 min' },
    ],
  },
  {
    id: 5,
    name: 'Healthy Eating',
    icon: '🥗',
    palette: {
      background: '#FEFCE8',
      border: '#FDE68A',
      accent: '#F59E0B',
    },
    tasks: [
      { id: 'h1', title: 'Drink 8 glasses of water', duration: 'All day' },
      { id: 'h2', title: 'Eat 5 servings of vegetables', duration: 'All day' },
      { id: 'h3', title: 'No processed sugar', duration: 'All day' },
      { id: 'h4', title: 'Meal prep for the week', duration: '120 min' },
      { id: 'h5', title: 'Healthy breakfast', duration: '20 min' },
    ],
  },
  {
    id: 6,
    name: 'Sleep Schedule',
    icon: '😴',
    palette: {
      background: '#EEF2FF',
      border: '#A5B4FC',
      accent: '#6366F1',
    },
    tasks: [
      { id: 's1', title: 'Sleep by 10 PM', duration: '8 hours' },
      { id: 's2', title: 'No screens 1 hour before bed', duration: '60 min' },
      { id: 's3', title: 'Wake up at 6 AM', duration: '—' },
      { id: 's4', title: 'Consistent sleep schedule', duration: 'All day' },
      { id: 's5', title: '7-8 hours of sleep', duration: '8 hours' },
    ],
  },
];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type UserPreferenceProps = {
  initialSelectedCategories?: number[];
};

export default function UserPreference({ initialSelectedCategories = [] }: UserPreferenceProps) {
  const [preselectedCategories, setPreselectedCategories] = useState<number[]>(() =>
    Array.from(new Set(initialSelectedCategories)),
  );
  const [expandedCategories, setExpandedCategories] = useState<number[]>(() =>
    Array.from(new Set(initialSelectedCategories)),
  );
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  const selectedCount = selectedTasks.length;

  useEffect(() => {
    const next = Array.from(new Set(initialSelectedCategories));
    setPreselectedCategories(next);
    setExpandedCategories(next);
  }, [initialSelectedCategories]);

  const toggleCategory = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCategories((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
  };

  const toggleTask = (taskId: string) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId) ? prev.filter((value) => value !== taskId) : [...prev, taskId],
    );
  };

  const handleContinue = () => {
    Alert.alert('Habits Selected', `You selected ${selectedCount} tasks to track!`);
  };

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

        <ScrollView contentContainerStyle={styles.content}>
          {HABIT_CATEGORIES.map((category) => {
            const isExpanded = expandedCategories.includes(category.id);
            const isPreSelected = preselectedCategories.includes(category.id);
            const palette = category.palette;

            return (
              <View
                key={category.id}
                style={[
                  styles.categoryCard,
                  { borderColor: isExpanded ? palette.border : '#E5E7EB' },
                  isPreSelected && styles.categoryCardSelected,
                ]}
              >
                <Pressable
                  style={styles.categoryHeader}
                  onPress={() => toggleCategory(category.id)}
                >
                  <View style={styles.categoryHeaderLeft}>
                    <Text style={styles.categoryHeaderIcon}>{category.icon}</Text>
                    <View>
                      <View style={styles.categoryTitleRow}>
                        <Text style={styles.categoryTitle}>{category.name}</Text>
                        {isPreSelected && (
                          <View style={styles.selectedPill}>
                            <Text style={styles.selectedPillText}>Selected</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.categoryMeta}>
                        {category.tasks.length} habits available
                      </Text>
                    </View>
                  </View>
                  <Feather
                    name="chevron-down"
                    size={22}
                    color="#6B7280"
                    style={[styles.chevron, isExpanded && styles.chevronExpanded]}
                  />
                </Pressable>

                {isExpanded && (
                  <View style={[styles.taskList, { backgroundColor: palette.background }]}>
                    {category.tasks.map((task) => {
                      const isTaskSelected = selectedTasks.includes(task.id);
                      return (
                        <Pressable
                          key={task.id}
                          onPress={() => toggleTask(task.id)}
                          style={[
                            styles.taskCard,
                            {
                              borderColor: isTaskSelected ? palette.border : '#F3F4F6',
                              shadowOpacity: isTaskSelected ? 0.12 : 0.04,
                              transform: [{ scale: isTaskSelected ? 1.02 : 1 }],
                            },
                          ]}
                        >
                          <View style={styles.taskLeft}>
                            <View
                              style={[
                                styles.checkbox,
                                isTaskSelected && {
                                  backgroundColor: palette.accent,
                                  borderColor: palette.accent,
                                },
                              ]}
                            >
                              {isTaskSelected && (
                                <Feather name="check" size={14} color="#FFFFFF" />
                              )}
                            </View>
                            <Text style={styles.taskTitle}>{task.title}</Text>
                          </View>
                          <Text style={styles.taskDuration}>{task.duration}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[
              styles.primaryButton,
              selectedCount === 0 && styles.primaryButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={selectedCount === 0}
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
  categoryList: {
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    gap: 8,
  },
  categoryChipSelected: {
    shadowColor: '#6D28D9',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 4,
  },
  categoryIcon: {
    fontSize: 18,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  categoryStar: {
    backgroundColor: '#6D28D9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  categoryStarText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
  },
  categoryCard: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  categoryCardSelected: {
    shadowOpacity: 0.15,
    borderColor: '#C4B5FD',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryHeaderIcon: {
    fontSize: 32,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  selectedPill: {
    backgroundColor: '#6D28D9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  selectedPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  chevron: {
    transform: [{ rotate: '0deg' }],
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  taskList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
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
  taskTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  taskDuration: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    marginLeft: 12,
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
