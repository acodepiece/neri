import React, { useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

type PlanItem = {
  id: string;
  label: string;
  emoji: string;
  defaultSelected?: boolean;
};

type PlanCardProps = {
  item: PlanItem;
  isSelected: boolean;
  onToggle: () => void;
};

const planItems: PlanItem[] = [
  { id: 'gym', label: 'Gym Workout', emoji: '🏋️‍♂️', defaultSelected: true },
  { id: 'water', label: 'Drink Enough Water', emoji: '💧' },
  { id: 'meals', label: 'Balanced Meals', emoji: '🥗' },
  { id: 'steps', label: '10k Steps', emoji: '👣' },
  { id: 'stretch', label: 'Stretching', emoji: '🤸‍♂️' },
  { id: 'vitamins', label: 'Take Vitamins', emoji: '💊' },
  { id: 'sugar', label: 'Sugar Resist', emoji: '🍬' },
];

const surfaceColor = '#F6EEE7';
const accentColor = '#1A1A1A';
const mutedCheckBackground = '#FFFFFF';
const mutedCheckBorder = '#E6E0DB';
const mutedText = '#746E6A';

export default function UserPreferenceHome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () =>
      new Set(planItems.filter((item) => item.defaultSelected).map((item) => item.id)),
  );

  const selectedCount = selectedIds.size;

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']} mode="padding">
      <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Your Personalized Plan is Ready!</Text>
            <Text style={styles.subtitle}>
              Based on your answers, here is the recommended starting plan to help you feel more
              energetic and healthy.
            </Text>
          </View>

          <View style={styles.itemsContainer}>
            {planItems.map((item) => {
              const isSelected = selectedIds.has(item.id);

              return (
                <PlanCard
                  key={item.id}
                  item={item}
                  isSelected={isSelected}
                  onToggle={() => handleToggle(item.id)}
                />
              );
            })}
          </View>
        </ScrollView>

        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            const ids = Array.from(selectedIds);
            console.log('Selected plan IDs:', ids);
            router.push({
              pathname: '/component/userPreference/txt',
              params: { categories: JSON.stringify(ids) },
            });
          }}
        >
          <Text style={styles.primaryButtonText}>{`Continue (${selectedCount})`}</Text>
          <Feather name="arrow-right" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function PlanCard({ item, isSelected, onToggle }: PlanCardProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const animateTo = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      damping: 20,
      stiffness: 260,
      mass: 0.7,
      useNativeDriver: true,
    }).start();

    Animated.timing(opacity, {
      toValue: toValue === 1 ? 1 : 0.94,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onToggle}
      onPressIn={() => animateTo(0.97)}
      onPressOut={() => animateTo(1)}
      android_ripple={{ color: '#EDE7E1' }}
    >
      <Animated.View
        style={[
          styles.planCard,
          { transform: [{ scale }], opacity },
        ]}
      >
        <Text style={styles.planEmoji}>{item.emoji}</Text>

        <Text style={styles.planLabel}>{item.label}</Text>

        <View
          style={[
            styles.checkmark,
            isSelected ? styles.checkmarkHighlight : styles.checkmarkMuted,
          ]}
        >
          <Feather
            name="check"
            size={18}
            color={isSelected ? '#FFFFFF' : accentColor}
          />
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: surfaceColor,
  },
  container: {
    flex: 1,
    backgroundColor: surfaceColor,
    paddingHorizontal: 20,
    gap: 24,
  },
  contentContainer: {
    paddingTop: 24,
    paddingBottom: 24,
    gap: 28,
  },
  headerContainer: {
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    color: accentColor,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    color: mutedText,
  },
  itemsContainer: {
    gap: 14,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 3,
    gap: 16,
  },
  planEmoji: {
    fontSize: 32,
  },
  planLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: accentColor,
  },
  checkmark: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkHighlight: {
    backgroundColor: accentColor,
  },
  checkmarkMuted: {
    backgroundColor: mutedCheckBackground,
    borderWidth: 1,
    borderColor: mutedCheckBorder,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: accentColor,
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 18,
    gap: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
