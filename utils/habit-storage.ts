import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'habitSelected';
const LEGACY_KEY = '__legacy__';
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type HabitSelection = {
  categories: number[];
  tasks: string[];
  completed?: string[];
};

type HabitSelectionRecord = {
  version: 2;
  dates: Record<string, HabitSelection>;
};

const EMPTY_SELECTION: HabitSelection = { categories: [], tasks: [], completed: [] };

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export function formatHabitDateKey(date: Date): string {
  const normalized = startOfDay(date);
  const year = normalized.getFullYear();
  const month = `${normalized.getMonth() + 1}`.padStart(2, '0');
  const day = `${normalized.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDateKey(dateKey?: string): string {
  if (typeof dateKey === 'string') {
    const trimmed = dateKey.trim();
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

function sanitizeSelection(selection: Partial<HabitSelection> | null | undefined): HabitSelection {
  if (!selection) {
    return { ...EMPTY_SELECTION, completed: [] };
  }

  const categories = Array.isArray(selection.categories)
    ? selection.categories.filter((value): value is number => typeof value === 'number')
    : [];

  const tasks = Array.isArray(selection.tasks)
    ? selection.tasks.filter((value): value is string => typeof value === 'string')
    : [];

  const completed = Array.isArray(selection.completed)
    ? selection.completed.filter((value): value is string => typeof value === 'string')
    : [];

  const uniqueTasks = Array.from(new Set(tasks));
  const validCompleted = completed.filter((taskId) => uniqueTasks.includes(taskId));

  return {
    categories: Array.from(new Set(categories)),
    tasks: uniqueTasks,
    completed: Array.from(new Set(validCompleted)),
  };
}

function sanitizeSelectionMap(
  record: Record<string, Partial<HabitSelection> | null | undefined>,
): Record<string, HabitSelection> {
  return Object.entries(record).reduce<Record<string, HabitSelection>>((acc, [key, value]) => {
    if (typeof key !== 'string') {
      return acc;
    }

    const sanitized = sanitizeSelection(value);
    if (
      sanitized.categories.length === 0 &&
      sanitized.tasks.length === 0 &&
      (sanitized.completed?.length ?? 0) === 0
    ) {
      return acc;
    }

    const targetKey = key === LEGACY_KEY ? LEGACY_KEY : normalizeDateKey(key);
    acc[targetKey] = sanitized;
    return acc;
  }, {});
}

async function readSelectionMap(): Promise<Record<string, HabitSelection>> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {};
    }

    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed === 'object') {
      if ('dates' in parsed && parsed.dates && typeof parsed.dates === 'object') {
        return sanitizeSelectionMap(parsed.dates as Record<string, Partial<HabitSelection>>);
      }

      if ('categories' in parsed || 'tasks' in parsed) {
        const legacy = sanitizeSelection(parsed as Partial<HabitSelection>);
        if (legacy.categories.length === 0 && legacy.tasks.length === 0) {
          return {};
        }
        return { [LEGACY_KEY]: legacy };
      }
    }
  } catch (error) {
    console.warn('Unable to parse habit selection record', error);
  }

  return {};
}

async function writeSelectionMap(map: Record<string, HabitSelection>): Promise<void> {
  const entries = Object.entries(map).filter(([, value]) => {
    return (
      value.categories.length > 0 ||
      value.tasks.length > 0 ||
      (value.completed?.length ?? 0) > 0
    );
  });

  if (entries.length === 0) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }

  const filtered = entries.reduce<Record<string, HabitSelection>>((acc, [key, value]) => {
    acc[key] = sanitizeSelection(value);
    return acc;
  }, {});

  const payload: HabitSelectionRecord = {
    version: 2,
    dates: filtered,
  };

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export async function saveHabitSelection(
  dateKey: string,
  selection: HabitSelection,
): Promise<void> {
  try {
    const normalizedKey = normalizeDateKey(dateKey);
    const sanitizedSelection = sanitizeSelection(selection);

    const current = await readSelectionMap();
    delete current[LEGACY_KEY];

    const normalizedDate = new Date(normalizedKey).getTime();
    const isSelectionEmpty =
      sanitizedSelection.categories.length === 0 &&
      sanitizedSelection.tasks.length === 0 &&
      (sanitizedSelection.completed?.length ?? 0) === 0;

    if (isSelectionEmpty) {
      delete current[normalizedKey];
    } else {
      current[normalizedKey] = sanitizedSelection;
    }

    const futureKeys = Object.keys(current).filter((key) => {
      if (!DATE_KEY_PATTERN.test(key)) {
        return false;
      }

      const candidateTime = new Date(key).getTime();
      return candidateTime > normalizedDate;
    });

    futureKeys.forEach((key) => {
      if (isSelectionEmpty) {
        delete current[key];
        return;
      }

      current[key] = {
        categories: sanitizedSelection.categories,
        tasks: sanitizedSelection.tasks,
        completed: [],
      };
    });

    await writeSelectionMap(current);
  } catch (error) {
    console.warn('Unable to persist habit selection', error);
  }
}

export async function loadHabitSelection(dateKey?: string): Promise<HabitSelection> {
  const normalizedKey = normalizeDateKey(dateKey);

  try {
    const selections = await readSelectionMap();

    // 1. Exact match for the requested day
    if (selections[normalizedKey]) {
      return sanitizeSelection(selections[normalizedKey]);
    }

    // 2. Search for the **latest** day before the requested one that has a selection stored.
    const requestedDate = new Date(normalizedKey);
    const fallbackKey = Object.keys(selections)
      .filter((key) => DATE_KEY_PATTERN.test(key))
      .filter((key) => {
        const candidateDate = new Date(key);
        return candidateDate.getTime() < requestedDate.getTime();
      })
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .shift();

    if (fallbackKey && selections[fallbackKey]) {
      // When we inherit a previous day's template, reset the completed field
      const prev = sanitizeSelection(selections[fallbackKey]);
      return { ...prev, completed: [] };
    }

    // 3. Legacy/global selection as a last resort
    if (selections[LEGACY_KEY]) {
      return sanitizeSelection(selections[LEGACY_KEY]);
    }
  } catch (error) {
    console.warn('Unable to load habit selection', error);
  }

  return { ...EMPTY_SELECTION, completed: [] };
}

export async function loadAllHabitSelections(): Promise<Record<string, HabitSelection>> {
  try {
    const selections = await readSelectionMap();
    return Object.entries(selections).reduce<Record<string, HabitSelection>>(
      (acc, [key, value]) => {
        if (key === LEGACY_KEY) {
          return acc;
        }
        if (!DATE_KEY_PATTERN.test(key)) {
          return acc;
        }
        acc[key] = sanitizeSelection(value);
        return acc;
      },
      {},
    );
  } catch (error) {
    console.warn('Unable to load all habit selections', error);
  }

  return {};
}
