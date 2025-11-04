import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { AndroidImportance, AndroidNotificationPriority } from 'expo-notifications';
import { Platform } from 'react-native';

export type ReminderOption = 'morning' | 'evening';

export type ReminderSetting = {
  enabled: boolean;
  hour: number;
  minute: number;
};

export type ReminderPreferences = Record<ReminderOption, ReminderSetting>;

type ReminderMetadata = ReminderSetting & {
  notificationId?: string;
};

type PersistedReminderState = Record<ReminderOption, ReminderMetadata>;

type PersistedPayload = {
  version: 1;
  reminders: PersistedReminderState;
};

const STORAGE_KEY = 'habitReminderPreferences';

const DEFAULT_TIMES: Record<ReminderOption, { hour: number; minute: number }> = {
  morning: { hour: 7, minute: 0 },
  evening: { hour: 20, minute: 0 },
};

function createDefaultState(): PersistedReminderState {
  return {
    morning: {
      enabled: false,
      hour: DEFAULT_TIMES.morning.hour,
      minute: DEFAULT_TIMES.morning.minute,
    },
    evening: {
      enabled: false,
      hour: DEFAULT_TIMES.evening.hour,
      minute: DEFAULT_TIMES.evening.minute,
    },
  };
}

const REMINDER_CONFIG: Record<
  ReminderOption,
  {
    title: string;
    body: string;
  }
> = {
  morning: {
    title: 'Good morning! 🌅',
    body: 'Kick off your day by finishing your habits.',
  },
  evening: {
    title: 'Evening check-in 🌙',
    body: 'Wrap up the day by completing your habits.',
  },
};

let channelInitialized = false;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: Platform.OS === 'ios',
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android' || channelInitialized) {
    return;
  }

  await Notifications.setNotificationChannelAsync('habit-reminders', {
    name: 'Habit Reminders',
    importance: AndroidImportance.HIGH,
    enableLights: true,
    enableVibrate: true,
    sound: 'default',
  });
  channelInitialized = true;
}

function sanitizeState(candidate: unknown): PersistedReminderState {
  const next = createDefaultState();

  if (candidate && typeof candidate === 'object') {
    (['morning', 'evening'] as ReminderOption[]).forEach((key) => {
      const value = (candidate as Record<string, unknown>)[key];
      if (value && typeof value === 'object') {
        const meta = value as Partial<ReminderMetadata>;
        const defaults = DEFAULT_TIMES[key];
        next[key] = {
          enabled: Boolean(meta.enabled),
          hour:
            typeof meta.hour === 'number' && Number.isFinite(meta.hour)
              ? meta.hour
              : defaults.hour,
          minute:
            typeof meta.minute === 'number' && Number.isFinite(meta.minute)
              ? meta.minute
              : defaults.minute,
          notificationId: typeof meta.notificationId === 'string' ? meta.notificationId : undefined,
        };
      }
    });
  }

  return next;
}

async function readPersistedState(): Promise<PersistedReminderState> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return createDefaultState();
    }

    const parsed = JSON.parse(stored) as PersistedPayload | null;
    if (parsed && typeof parsed === 'object' && 'reminders' in parsed) {
      return sanitizeState(parsed.reminders);
    }
  } catch (error) {
    console.warn('[reminders] Unable to parse reminder preferences', error);
  }

  return createDefaultState();
}

async function writePersistedState(state: PersistedReminderState): Promise<void> {
  const payload: PersistedPayload = {
    version: 1,
    reminders: state,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

async function scheduleReminder(
  option: ReminderOption,
  hour: number,
  minute: number,
): Promise<string> {
  await ensureAndroidChannel();
  const config = REMINDER_CONFIG[option];
  const trigger: Notifications.DailyTriggerInput & { channelId?: string } = {
    hour,
    minute,
    repeats: true,
  };

  if (Platform.OS === 'android') {
    trigger.channelId = 'habit-reminders';
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: config.title,
      body: config.body,
      sound: Platform.OS === 'ios' ? 'default' : undefined,
      priority: AndroidNotificationPriority.HIGH,
    },
    trigger,
  });
}

async function cancelReminder(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.warn('[reminders] Unable to cancel notification', notificationId, error);
  }
}

export async function loadReminderPreferences(): Promise<ReminderPreferences> {
  const state = await readPersistedState();
  return {
    morning: {
      enabled: state.morning.enabled,
      hour: state.morning.hour,
      minute: state.morning.minute,
    },
    evening: {
      enabled: state.evening.enabled,
      hour: state.evening.hour,
      minute: state.evening.minute,
    },
  };
}

export async function saveReminderPreferences(
  preferences: ReminderPreferences,
): Promise<ReminderPreferences> {
  const current = await readPersistedState();
  const next: PersistedReminderState = createDefaultState();

  for (const option of ['morning', 'evening'] as ReminderOption[]) {
    const desired = preferences[option];
    const existing = current[option];
    const defaults = DEFAULT_TIMES[option];
    const targetHour =
      typeof desired.hour === 'number' && Number.isFinite(desired.hour)
        ? desired.hour
        : defaults.hour;
    const targetMinute =
      typeof desired.minute === 'number' && Number.isFinite(desired.minute)
        ? desired.minute
        : defaults.minute;

    let notificationId = existing.notificationId;

    if (desired.enabled) {
      const timeChanged =
        existing.hour !== targetHour || existing.minute !== targetMinute || !existing.enabled;
      if (notificationId && timeChanged) {
        await cancelReminder(notificationId);
        notificationId = undefined;
      }

      if (!notificationId) {
        try {
          notificationId = await scheduleReminder(option, targetHour, targetMinute);
        } catch (error) {
          console.error('[reminders] Failed to schedule reminder', option, error);
          notificationId = undefined;
        }
      }

      next[option] = {
        enabled: Boolean(notificationId),
        hour: targetHour,
        minute: targetMinute,
        notificationId,
      };
    } else {
      if (notificationId) {
        await cancelReminder(notificationId);
      }
      next[option] = {
        enabled: false,
        hour: targetHour,
        minute: targetMinute,
      };
    }
  }

  await writePersistedState(next);

  return {
    morning: {
      enabled: next.morning.enabled,
      hour: next.morning.hour,
      minute: next.morning.minute,
    },
    evening: {
      enabled: next.evening.enabled,
      hour: next.evening.hour,
      minute: next.evening.minute,
    },
  };
}

export async function clearReminderPreferences(): Promise<void> {
  const current = await readPersistedState();
  for (const option of ['morning', 'evening'] as ReminderOption[]) {
    const meta = current[option];
    if (meta.notificationId) {
      await cancelReminder(meta.notificationId);
    }
  }
  await AsyncStorage.removeItem(STORAGE_KEY);
}
