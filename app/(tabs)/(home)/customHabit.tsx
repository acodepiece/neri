import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { Dimensions } from 'react-native';
import { createCustomHabit, loadHabitSelection, saveHabitSelection, formatHabitDateKey } from '@/app/database/habitDb';
import {
    Animated,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const surfaceColor = '#F6EEE7';
const accent = '#FF7A00';
const lightCard = '#FFFFFF';
const textPrimary = '#1B1B1C';
const textMuted = '#7A726C';
const borderColor = '#E6D6CB';
const screenPadding = 24;

// Expanded emoji collection - 45 emojis (3 pages of 15)
const EMOJI_OPTIONS = [
  // Page 1 - Health & Fitness
  '🔥', '💪', '🏃', '🧘', '🚴',
  '🏋️', '🤸', '🥇', '⚡', '💯',
  '🎯', '✨', '🌟', '⭐', '🏆',
  
  // Page 2 - Wellness & Lifestyle
  '🌿', '💧', '🌞', '🌙', '🛏️',
  '🧠', '🎧', '📚', '📝', '✍️',
  '🍎', '🥗', '🥤', '☕', '🍵',
  
  // Page 3 - Activities & Hobbies
  '🎨', '🎭', '🎪', '🎬', '📷',
  '🎸', '🎹', '🎤', '🎮', '🧩',
  '🧹', '🌱', '🌻', '🌺', '🦋',
];

export default function CustomHabitScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const dateKey = (params.date as string) || formatHabitDateKey(new Date());
  const defaultEmoji = useMemo(() => EMOJI_OPTIONS[0] ?? '🌿', []);
  const [habitName, setHabitName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(defaultEmoji);
  const [scaleAnim] = useState(new Animated.Value(1));
  
  // Calculate emoji pages (15 emojis per page)
  const EMOJIS_PER_PAGE = 15;
  const emojiPages = useMemo(() => {
    const pages = [];
    for (let i = 0; i < EMOJI_OPTIONS.length; i += EMOJIS_PER_PAGE) {
      pages.push(EMOJI_OPTIONS.slice(i, i + EMOJIS_PER_PAGE));
    }
    return pages;
  }, []);

  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmoji(emoji);
    
    // Animate selection
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.2,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSave = async () => {
    // Validate input
    if (!habitName.trim()) {
      Alert.alert('Missing Information', 'Please enter a habit name.');
      return;
    }

    try {
      console.log('\n💾 [SAVE] Saving custom habit:', {
        name: habitName,
        description,
        emoji: selectedEmoji,
        date: dateKey
      });

      // Create custom habit in database
      const habitId = await createCustomHabit(
        habitName.trim(),
        description.trim(),
        selectedEmoji
      );

      console.log(`  ✅ Custom habit created with ID: ${habitId}`);

      // Load current selection for today
      const currentSelection = await loadHabitSelection(dateKey);
      console.log('  📋 Current selection:', currentSelection);

      // Add the new custom habit to today's selection
      const updatedTasks = [...currentSelection.tasks, habitId];
      const updatedSelection = {
        ...currentSelection,
        tasks: updatedTasks,
        categories: [...currentSelection.categories, 999], // Add custom category
      };

      console.log('  💾 Adding custom habit to today\'s selection:', updatedSelection);
      await saveHabitSelection(dateKey, updatedSelection, { propagateToFuture: false });
      console.log('  ✅ Custom habit added to today\'s habits!');

      // Small delay to ensure database write completes
      await new Promise(resolve => setTimeout(resolve, 100));

      // Show success message
      Alert.alert(
        'Success! 🎉',
        `"${habitName}" has been added and selected for today!`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to home screen
              router.back();
            },
          },
        ]
      );
    } catch (error) {
      console.error('❌ Error saving custom habit:', error);
      Alert.alert(
        'Error',
        'Failed to save habit. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Feather name="chevron-left" size={24} color={textPrimary} />
          </Pressable>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Create custom habit</Text>
            <Text style={styles.headerSubtitle}>
              Personalize your streak with a routine that fits your lifestyle.
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.label}>Habit name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Morning stretch, Read 10 pages"
              placeholderTextColor={textMuted}
              value={habitName}
              onChangeText={setHabitName}
              returnKeyType="next"
              maxLength={50}
            />

            <Text style={[styles.label, styles.sectionSpacing]}>Description</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Add a short note about why or how you practice this habit. (Optional)"
              placeholderTextColor={textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              maxLength={200}
            />
          </View>

          <View style={styles.card}>
            <View style={styles.emojiHeader}>
              <Text style={styles.label}>Choose an emoji</Text>
              <Animated.Text style={[styles.selectedEmojiDisplay, { transform: [{ scale: scaleAnim }] }]}>
                {selectedEmoji}
              </Animated.Text>
            </View>
            
            <Text style={styles.emojiHelperText}>
              Swipe to see more • {EMOJI_OPTIONS.length} emojis available
            </Text>
            
            <View style={styles.emojiContainer}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.emojiScrollView}
                contentContainerStyle={styles.emojiScrollContent}
              >
                {emojiPages.map((page, pageIndex) => (
                  <View key={pageIndex} style={styles.emojiPage}>
                    <View style={styles.emojiGrid}>
                      {page.map((emoji) => {
                        const isSelected = emoji === selectedEmoji;
                        return (
                          <Pressable
                            key={emoji}
                            onPress={() => handleEmojiSelect(emoji)}
                            style={[styles.emojiOption, isSelected && styles.emojiOptionSelected]}
                            accessibilityRole="button"
                            accessibilityLabel={`Select ${emoji}`}
                          >
                            <Text style={[styles.emojiText, isSelected && styles.emojiTextSelected]}>
                              {emoji}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
            
            <View style={styles.pageIndicatorContainer}>
              {emojiPages.map((_, index) => (
                <View key={index} style={styles.pageIndicatorDot} />
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable style={styles.primaryButton} onPress={handleSave}>
            <Text style={styles.primaryButtonText}>Save Habit</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: surfaceColor,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: screenPadding,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: lightCard,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: textMuted,
    lineHeight: 20,
  },
  scrollContent: {
    paddingHorizontal: screenPadding,
    paddingVertical: 16,
    paddingBottom: 48,
    gap: 18,
  },
  card: {
    backgroundColor: lightCard,
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 7,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: textPrimary,
  },
  emojiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  selectedEmojiDisplay: {
    fontSize: 40,
    lineHeight: 44,
    marginLeft: 'auto',
  },
  sectionSpacing: {
    marginTop: 20,
  },
  input: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#FDF8F4',
    borderWidth: 1,
    borderColor,
    fontSize: 16,
    color: textPrimary,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  multilineInput: {
    minHeight: 120,
    paddingTop: 16,
    lineHeight: 22,
  },
  emojiHelperText: {
    fontSize: 13,
    color: textMuted,
    lineHeight: 18,
    marginBottom: 16,
  },
  emojiContainer: {
    overflow: 'hidden',
    marginHorizontal: -22, // Negative margin to extend to card edges
    marginBottom: 8,
  },
  emojiScrollView: {
    flexGrow: 0,
  },
  emojiScrollContent: {
    paddingHorizontal: 22, // Match card padding
  },
  emojiPage: {
    width: 310, // Card width minus padding (adjusted for proper fit)
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  emojiOption: {
    width: 54, // 5 columns with space-between: (310 - 4*8 gaps) / 5 = ~54px
    height: 54,
    borderRadius: 18,
    backgroundColor: '#FDF8F4',
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  emojiOptionSelected: {
    backgroundColor: '#FFF5E5',
    borderColor: accent,
    shadowColor: accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,

  },
  emojiText: {
    fontSize: 24,
  },
  emojiTextSelected: {
    fontSize: 26,
  },
  pageIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingBottom: 4,
    
  },
  pageIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E6D6CB',
  },
  footer: {
    paddingHorizontal: screenPadding,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    paddingTop: 12,
    backgroundColor: surfaceColor,
  },
  primaryButton: {
    height: 56,
    borderRadius: 18,
    backgroundColor: accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF7A00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
