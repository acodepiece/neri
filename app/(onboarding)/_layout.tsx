import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false }}
      initialRouteName="user-preference/select-habits"
    >
      <Stack.Screen name="user-preference/select-habits" />
    </Stack>
  );
}
