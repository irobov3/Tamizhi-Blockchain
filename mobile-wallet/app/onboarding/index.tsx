// Redirect onboarding root to welcome screen
import { Redirect } from 'expo-router';
export default function OnboardingIndex() {
  return <Redirect href="/onboarding/welcome" />;
}
