import { Feather } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { resetAllHabitProgress } from '@/app/database/habitDb';

type SettingItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  iconBackground: string;
  iconColor?: string;
  onPress?: () => void;
};

type SettingSection = {
  id: string;
  items: SettingItem[];
};

const surfaceColor = '#F6EEE7';
const cardColor = '#FFFFFF';
const borderColor = '#E6D6CB';
const textPrimary = '#1B1B1C';
const textMuted = '#7A726C';

const sections: SettingSection[] = [
  {
    id: 'preferences',
    items: [
      {
        id: 'language',
        title: 'Language',
        subtitle: 'English',
        icon: 'globe',
        iconBackground: '#FFEAD2',
      },
      {
        id: 'week-start',
        title: 'Week starts on',
        subtitle: 'Monday',
        icon: 'calendar',
        iconBackground: '#E6F3FF',
        iconColor: '#2563EB',
      },
      {
        id: 'theme',
        title: 'Theme',
        subtitle: 'Light',
        icon: 'moon',
        iconBackground: '#EDE7FF',
        iconColor: '#7C3AED',
      },
    ],
  },
  {
    id: 'data',
    items: [
      {
        id: 'backups',
        title: 'Backups',
        subtitle: 'Export and import your data',
        icon: 'cloud',
        iconBackground: '#DFF3E8',
        iconColor: '#0F766E',
      },
      {
        id: 'archived',
        title: 'Archived Habits',
        subtitle: 'Access your archived habits',
        icon: 'archive',
        iconBackground: '#F6E8DA',
        iconColor: '#B45309',
      },
      {
        id: 'reset',
        title: 'Reset habits',
        subtitle: 'Clear scheduled habits and streak data',
        icon: 'refresh-ccw',
        iconBackground: '#FEE2E2',
        iconColor: '#DC2626',
      },
    ],
  },
  {
    id: 'support',
    items: [
      {
        id: 'share',
        title: 'Share app',
        subtitle: 'Share Habit Streak with a friend!',
        icon: 'send',
        iconBackground: '#D1FAE5',
        iconColor: '#16A34A',
      },
      {
        id: 'review',
        title: 'Review app',
        subtitle: 'Help us grow with a 5 star review',
        icon: 'star',
        iconBackground: '#FEF3C7',
        iconColor: '#F59E0B',
      },
      {
        id: 'contact',
        title: 'Contact developer',
        subtitle: 'Let me know how I can help you :)',
        icon: 'mail',
        iconBackground: '#E9E7FF',
        iconColor: '#6B21A8',
      },
    ],
  },
  {
    id: 'subscription',
    items: [
      {
        id: 'subscription',
        title: 'Subscription',
        subtitle: 'Manage your plan',
        icon: 'crown',
        iconBackground: '#FEE2E2',
        iconColor: '#DC2626',
      },
    ],
  },
];

const noop = () => {};

const SettingsScreen = () => {
  const [isResetting, setIsResetting] = useState(false);

  const handleConfirmReset = useCallback(async () => {
    try {
      setIsResetting(true);
      await resetAllHabitProgress();
      Alert.alert('Habits reset', 'Your habit schedule and streak data have been cleared.');
    } catch (error) {
      console.error('Failed to reset habits', error);
      Alert.alert('Reset failed', 'Unable to reset habit data. Please try again.');
    } finally {
      setIsResetting(false);
    }
  }, []);

  const handleResetHabits = useCallback(() => {
    if (isResetting) {
      return;
    }
    Alert.alert(
      'Reset habits?',
      'This will remove all scheduled habit data and streak progress. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: handleConfirmReset },
      ],
    );
  }, [handleConfirmReset, isResetting]);

  const settingsSections = useMemo<SettingSection[]>(() => {
    return sections.map((section) => ({
      ...section,
      items: section.items.map((item) => {
        if (item.id === 'reset') {
          return {
            ...item,
            subtitle: isResetting ? 'Clearing data...' : item.subtitle,
            onPress: handleResetHabits,
          };
        }
        return item;
      }),
    }));
  }, [handleResetHabits, isResetting]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Settings</Text>

        {settingsSections.map((section) => (
          <View key={section.id} style={styles.sectionCard}>
            {section.items.map((item, index) => (
              <Pressable
                key={item.id}
                onPress={item.onPress ?? noop}
                disabled={item.id === 'reset' && isResetting}
                style={[
                  styles.item,
                  index !== section.items.length - 1 && styles.itemDivider,
                  item.id === 'reset' && isResetting && styles.itemDisabled,
                ]}
              >
                <View style={[styles.iconWrapper, { backgroundColor: item.iconBackground }]}>
                  <Feather name={item.icon} size={18} color={item.iconColor ?? textPrimary} />
                </View>
                <View style={styles.textWrapper}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  {item.subtitle ? <Text style={styles.itemSubtitle}>{item.subtitle}</Text> : null}
                </View>
                <Feather
                  name="chevron-right"
                  size={18}
                  color={item.id === 'reset' && isResetting ? '#D1CBC4' : '#B8B0A7'}
                />
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: surfaceColor,
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 18,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: textPrimary,
  },
  sectionCard: {
    backgroundColor: cardColor,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 18,
    gap: 16,
    backgroundColor: cardColor,
  },
  itemDisabled: {
    opacity: 0.6,
  },
  itemDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EFE7DF',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrapper: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: textPrimary,
  },
  itemSubtitle: {
    fontSize: 13,
    color: textMuted,
  },
});
