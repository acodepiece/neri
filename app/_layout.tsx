import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react'; // Ensure React and all hooks are imported
import { View, ActivityIndicator } from 'react-native'; // Import for loading screen
import { useColorScheme } from '@/hooks/use-color-scheme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDatabase, insertHabitsFromCategories } from '@/app/database/habitDb';
import { migrateToDatabase } from '@/app/database/migration';
import { HABIT_CATEGORIES } from '@/app/(onboarding)/user-preference/UserPreferenceScreen';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // State to hold the fetched value (string or null)
  const [habitSelection, setHabitSelection] = useState<string | null>(null);
  // State to track if the data is currently loading
  const [isLoading, setIsLoading] = useState(true); // <-- Start as true

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 [APP] Starting app initialization...');
        
        // Initialize database
        console.log('📦 [APP] Initializing database...');
        await initDatabase();
        console.log('✅ [APP] Database initialized');
        
        // Insert all habits from categories
        console.log('📋 [APP] Inserting habits from categories...');
        await insertHabitsFromCategories(HABIT_CATEGORIES);
        console.log('✅ [APP] Habits inserted');
        
        // Run migration from AsyncStorage to SQLite
        console.log('🔄 [APP] Running migration...');
        await migrateToDatabase(HABIT_CATEGORIES);
        console.log('✅ [APP] Migration complete');
        
        // Check onboarding status
        const selection = await AsyncStorage.getItem('habitSelected');
        setHabitSelection(selection);
        
        console.log('🎉 [APP] App initialization complete!');
      } catch (e) {
        console.error('❌ [APP] Failed to initialize app:', e);
        console.error('   Error details:', JSON.stringify(e, null, 2));
        setHabitSelection(null); 
      } finally {
        setIsLoading(false); 
      }
    };

    initializeApp();
  }, []); 
  
  // NOTE: Remove console.log(habitSelection) from the component body 
  // as it causes side effects on every render. Use it inside useEffect or render.

  // --- Conditional Rendering ---
  if (isLoading) {
    // Show a blank or splash screen while the initial route is being determined.
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colorScheme === 'dark' ? DarkTheme.colors.background : DefaultTheme.colors.background }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Once loading is complete, render the main Stack with the correct initial route.
  const initialRoute = habitSelection ? "(tabs)" : "(onboarding)";
  alert(habitSelection)

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <GestureHandlerRootView>
      <Stack initialRouteName={initialRoute}>
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      </GestureHandlerRootView>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}