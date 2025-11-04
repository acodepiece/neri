import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { formatHabitDateKey } from '@/app/database/habitDb';
import {
  ReminderPreferences,
  ReminderOption,
  clearReminderPreferences,
  loadReminderPreferences,
  saveReminderPreferences,
} from '@/utils/notification-reminders';

type Params = {
  date?: string;
  selectionCount?: string;
};

const surfaceColor = '#F3F4F6';
const textPrimary = '#111827';
const textMuted = '#6B7280';
const cardBackground = '#FFFFFF';
const accent = '#4C1D95';
const accentSoft = '#EDE9FE';
const eveningAccent = '#0F172A';
const eveningSoft = '#E2E8F0';

type TimeOption = {
  label: string;
  hour: number;
  minute: number;
};

const MORNING_TIME_OPTIONS: TimeOption[] = [
  { label: '7:00 AM', hour: 7, minute: 0 },
  { label: '9:00 AM', hour: 9, minute: 0 },
  { label: '10:00 AM', hour: 10, minute: 0 },
  { label: '11:00 AM', hour: 11, minute: 0 },
];

const EVENING_TIME_OPTIONS: TimeOption[] = [
  { label: '6:00 PM', hour: 18, minute: 0 },
  { label: '7:00 PM', hour: 19, minute: 0 },
  { label: '8:00 PM', hour: 20, minute: 0 },
  { label: '9:00 PM', hour: 21, minute: 0 },
];

const TIME_OPTIONS: Record<ReminderOption, TimeOption[]> = {
  morning: MORNING_TIME_OPTIONS,
  evening: EVENING_TIME_OPTIONS,
};

const createDefaultPreferences = (): ReminderPreferences => ({
  morning: {
    enabled: false,
    hour: MORNING_TIME_OPTIONS[0].hour,
    minute: MORNING_TIME_OPTIONS[0].minute,
  },
  evening: {
    enabled: false,
    hour: EVENING_TIME_OPTIONS[0].hour,
    minute: EVENING_TIME_OPTIONS[0].minute,
  },
});

type TimeOptionButtonProps = {
  label: string;
  isSelected: boolean;
  isEnabled: boolean;
  disabled: boolean;
  onPress: () => void;
};

const TimeOptionButton: React.FC<TimeOptionButtonProps> = ({
  label,
  isSelected,
  isEnabled,
  disabled,
  onPress,
}) => {
  const animation = useRef(new Animated.Value(isSelected ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(animation, {
      toValue: isSelected ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 140,
    }).start();
  }, [animation, isSelected]);

  const scaleStyle = {
    transform: [
      {
        scale: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.05],
        }),
      },
    ],
  };

  const iconColor = isSelected
    ? '#FFFFFF'
    : disabled
    ? '#9CA3AF'
    : '#4B5563';

  return (
    <Animated.View style={[styles.timeButtonWrapper, scaleStyle]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.timeButton,
          isSelected && styles.timeButtonSelected,
          !isEnabled && styles.timeButtonInactive,
          disabled && styles.timeButtonDisabled,
          pressed && isEnabled && !disabled && styles.timeButtonPressed,
        ]}
      >
        <Feather name="clock" size={14} color={iconColor} />
        <Text
          style={[
            styles.timeButtonLabel,
            isSelected && styles.timeButtonLabelSelected,
            (!isEnabled || disabled) && styles.timeButtonLabelInactive,
          ]}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

export default function NotificationReminderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const [preferences, setPreferences] = useState<ReminderPreferences>(() => createDefaultPreferences());
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedHabitCount = useMemo(() => {
    const raw = params.selectionCount;
    const parsed = typeof raw === 'string' ? parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [params.selectionCount]);

  const targetDateKey = useMemo(() => {
    const raw = params.date;
    if (typeof raw === 'string' && raw.trim().length > 0) {
      return raw;
    }
    return formatHabitDateKey(new Date());
  }, [params.date]);

  useEffect(() => {
    let isActive = true;

    const hydrate = async () => {
      try {
        const stored = await loadReminderPreferences();
        if (!isActive) {
          return;
        }

        setPreferences({
          morning: { ...stored.morning },
          evening: { ...stored.evening },
        });

        if (Platform.OS === 'web') {
          setHasPermission(false);
          return;
        }

        const { status } = await Notifications.getPermissionsAsync();
        if (!isActive) {
          return;
        }

        if (status === 'granted') {
          setHasPermission(true);
          return;
        }

        const requested = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: false,
            allowSound: true,
          },
        });
        if (!isActive) {
          return;
        }
        setHasPermission(requested.status === 'granted');
      } catch (error) {
        console.warn('[notifications] Unable to hydrate reminder preferences', error);
        if (isActive) {
          setHasPermission(false);
        }
      } finally {
        if (isActive) {
          setIsHydrated(true);
        }
      }
    };

    hydrate();

    return () => {
      isActive = false;
    };
  }, []);

  const showPermissionAlert = useCallback(() => {
    Alert.alert(
      'Enable notifications',
      'Notifications are currently disabled. Update your system settings to turn on reminders.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open settings',
          onPress: () => {
            if (Platform.OS !== 'web') {
              Linking.openSettings().catch(() => {
                Alert.alert('Unable to open settings');
              });
            }
          },
        },
      ],
    );
  }, []);

  const handleToggle = useCallback(
    (option: ReminderOption, nextValue: boolean) => {
      if (hasPermission === false && nextValue) {
        showPermissionAlert();
        return;
      }

      setPreferences((prev) => {
        const defaults = TIME_OPTIONS[option][0];
        const current = prev[option];
        return {
          ...prev,
          [option]: {
            enabled: nextValue,
            hour: current?.hour ?? defaults.hour,
            minute: current?.minute ?? defaults.minute,
          },
        };
      });
    },
    [hasPermission, showPermissionAlert],
  );

  const handleTimeSelect = useCallback(
    (option: ReminderOption, time: TimeOption) => {
      if (hasPermission === false) {
        showPermissionAlert();
        return;
      }

      setPreferences((prev) => ({
        ...prev,
        [option]: {
          enabled: true,
          hour: time.hour,
          minute: time.minute,
        },
      }));
    },
    [hasPermission, showPermissionAlert],
  );

  const navigateToHome = useCallback(() => {
    router.replace({
      pathname: '/(tabs)/(home)',
      params: { date: targetDateKey },
    });
  }, [router, targetDateKey]);

  const persistPreferences = useCallback(
    async (nextPreferences: ReminderPreferences, skipScheduling: boolean) => {
      if (skipScheduling) {
        await clearReminderPreferences();
        const defaults = createDefaultPreferences();
        setPreferences(defaults);
        return defaults;
      }

      const payload: ReminderPreferences = {
        morning: { ...nextPreferences.morning },
        evening: { ...nextPreferences.evening },
      };

      const applied = await saveReminderPreferences(payload);
      const normalized: ReminderPreferences = {
        morning: { ...applied.morning },
        evening: { ...applied.evening },
      };
      setPreferences(normalized);
      return normalized;
    },
    [],
  );

  const markOnboardingComplete = useCallback(async () => {
    try {
      await AsyncStorage.setItem('habitSelected', 'true');
    } catch (error) {
      console.warn('[notifications] Unable to persist onboarding flag', error);
    }
  }, []);

  const handleFinish = useCallback(async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      const skipScheduling = hasPermission === false;
      await persistPreferences(preferences, skipScheduling);
      await markOnboardingComplete();
      navigateToHome();
    } catch (error) {
      console.error('[notifications] Failed to save preferences', error);
      Alert.alert('Something went wrong', 'Unable to save reminder preferences right now.');
    } finally {
      setIsSaving(false);
    }
  }, [hasPermission, isSaving, markOnboardingComplete, navigateToHome, persistPreferences, preferences]);

  const handleSkip = useCallback(async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await persistPreferences(createDefaultPreferences(), true);
      await markOnboardingComplete();
      navigateToHome();
    } catch (error) {
      console.error('[notifications] Failed to skip reminders', error);
      Alert.alert('Something went wrong', 'Unable to update reminders right now. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, markOnboardingComplete, navigateToHome, persistPreferences]);

  const renderReminderCard = useCallback(
    (option: ReminderOption) => {
      const setting = preferences[option];
      const isEnabled = setting.enabled;
      const isMorning = option === 'morning';
      const timeOptions = TIME_OPTIONS[option];
      const selectedTime =
        timeOptions.find(
          (time) => time.hour === setting.hour && time.minute === setting.minute,
        ) ?? timeOptions[0];
      const title = isMorning ? 'Morning momentum' : 'Evening wrap-up';
      const description = isMorning
        ? 'Pick the moment you want a nudge to start strong.'
        : 'Choose when we should remind you to close out the day.';
      const accentStyles = isMorning
        ? {
            card: styles.cardMorning,
            badge: styles.badgeMorning,
            bellColor: accent,
          }
        : {
            card: styles.cardEvening,
            badge: styles.badgeEvening,
            bellColor: eveningAccent,
          };
      const permissionBlocked = hasPermission === false;

      return (
        <View
          key={option}
          style={[
            styles.reminderCard,
            accentStyles.card,
            isEnabled && styles.reminderCardActive,
          ]}
        >
          <View style={styles.reminderHeader}>
            <View style={[styles.iconBadge, accentStyles.badge]}>
              <Feather
                name={(isMorning ? 'sunrise' : 'moon') as 'sunrise' | 'moon'}
                size={22}
                color={accentStyles.bellColor}
              />
            </View>
            <View style={styles.reminderCopy}>
              <Text style={[styles.reminderTitle, isEnabled && styles.reminderTitleActive]}>
                {title}
              </Text>
              <View style={styles.reminderMeta}>
                <Feather name="bell" size={14} color={accentStyles.bellColor} />
                <Text
                  style={[
                    styles.reminderMetaText,
                    isEnabled && { color: accentStyles.bellColor },
                  ]}
                >
                  {isEnabled ? selectedTime.label : 'Reminder off'}
                </Text>
              </View>
              <Text style={[styles.reminderSubtitle, isEnabled && styles.reminderSubtitleActive]}>
                {description}
              </Text>
            </View>
            <Switch
              value={isEnabled}
              onValueChange={(value) => handleToggle(option, value)}
              thumbColor={isEnabled ? '#FFFFFF' : '#D1D5DB'}
              trackColor={{ false: '#E5E7EB', true: '#4C1D95' }}
              disabled={permissionBlocked}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.timeSelector}>
            <Text style={styles.timeSelectorLabel}>Preferred time</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.timeButtonRow}
            >
              {timeOptions.map((time) => {
                const isSelected =
                  isEnabled &&
                  time.hour === selectedTime.hour &&
                  time.minute === selectedTime.minute;
                return (
                  <TimeOptionButton
                    key={`${option}-${time.hour}-${time.minute}`}
                    label={time.label}
                    isSelected={isSelected}
                    isEnabled={isEnabled}
                    disabled={permissionBlocked}
                    onPress={() => handleTimeSelect(option, time)}
                  />
                );
              })}
            </ScrollView>
          </View>
        </View>
      );
    },
    [handleTimeSelect, handleToggle, hasPermission, preferences],
  );

  if (!isHydrated) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.loadingState]}>
        <ActivityIndicator size="large" color={accent} />
        <Text style={styles.loadingLabel}>Preparing notifications…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Stay on track</Text>
          <Text style={styles.subtitle}>
            {selectedHabitCount
              ? `Great choice—${selectedHabitCount} habits ready to build momentum.`
              : 'Personal reminders help keep your streak alive.'}
          </Text>
        </View>

        {hasPermission === false && (
          <View style={styles.permissionBanner}>
            <Feather name="alert-triangle" size={18} color="#F59E0B" />
            <View style={styles.permissionCopy}>
              <Text style={styles.permissionTitle}>Notifications are turned off</Text>
              <Text style={styles.permissionSubtitle}>
                Enable notifications in your device settings to receive reminders.
              </Text>
            </View>
            <Pressable
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Linking.openSettings().catch(() => {
                    Alert.alert('Unable to open settings');
                  });
                }
              }}
              style={styles.permissionAction}
            >
              <Text style={styles.permissionActionText}>Open</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Choose your cadence</Text>
          <View style={styles.cardList}>
            {(['morning', 'evening'] as ReminderOption[]).map(renderReminderCard)}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.skipButton} onPress={handleSkip} disabled={isSaving}>
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </Pressable>
        <Pressable
          style={[styles.primaryButton, isSaving && styles.primaryButtonDisabled]}
          onPress={handleFinish}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Finish setup</Text>
          )}
        </Pressable>
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
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 40,
    gap: 28,
  },
  header: {
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: textPrimary,
  },
  subtitle: {
    fontSize: 16,
    color: textMuted,
    lineHeight: 22,
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  permissionCopy: {
    flex: 1,
    gap: 4,
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  permissionSubtitle: {
    fontSize: 13,
    color: '#B45309',
  },
  permissionAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F59E0B',
  },
  permissionActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cardList: {
    gap: 16,
  },
  reminderCard: {
    borderRadius: 20,
    backgroundColor: cardBackground,
    padding: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reminderCardActive: {
    borderColor: accent,
    shadowOpacity: 0.14,
  },
  cardMorning: {
    backgroundColor: accentSoft,
  },
  cardEvening: {
    backgroundColor: eveningSoft,
  },
  reminderHeader: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  badgeMorning: {
    backgroundColor: '#F5F3FF',
  },
  badgeEvening: {
    backgroundColor: '#E2E8F0',
  },
  reminderCopy: {
    flex: 1,
    gap: 6,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: textPrimary,
  },
  reminderTitleActive: {
    color: accent,
  },
  reminderSubtitle: {
    fontSize: 14,
    color: textMuted,
    lineHeight: 20,
  },
  reminderSubtitleActive: {
    color: '#4C1D95',
  },
  reminderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reminderMetaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  timeSelector: {
    gap: 12,
  },
  timeSelectorLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 12,
  },
  timeButtonWrapper: {
    borderRadius: 16,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  timeButtonSelected: {
    backgroundColor: accent,
    borderColor: accent,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 12,
    elevation: 3,
  },
  timeButtonInactive: {
    opacity: 0.75,
  },
  timeButtonDisabled: {
    opacity: 0.5,
  },
  timeButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  timeButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  timeButtonLabelSelected: {
    color: '#FFFFFF',
  },
  timeButtonLabelInactive: {
    color: '#6B7280',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: Platform.select({ ios: 32, default: 24 }),
    paddingTop: 16,
    gap: 12,
    backgroundColor: surfaceColor,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 16,
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: textMuted,
  },
  primaryButton: {
    backgroundColor: accent,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: surfaceColor,
    gap: 16,
  },
  loadingLabel: {
    fontSize: 14,
    color: textMuted,
  },
});
