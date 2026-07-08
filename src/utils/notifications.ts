import { Platform } from 'react-native';

/**
 * Expo Go SDK 53+ on Android crashes if it even imports the native Push Token 
 * registrar without a custom Development Build. 
 * 
 * To ensure you can preview the app safely in Expo Go, this engine acts as a 
 * local mock. In a production EAS build, these would map directly to `expo-notifications`.
 */

export async function registerForPushNotificationsAsync() {
  console.log('[Notification Engine] Permissions requested (Mocked for Expo Go safe-preview)');
  return "mock-token";
}

export async function scheduleDailyReminder() {
  console.log('[Notification Engine] Scheduled: Daily Check-in');
}

export async function scheduleMedicineReminder() {
  console.log('[Notification Engine] Scheduled: Medicine Reminder');
}

export async function scheduleWaterReminder() {
  console.log('[Notification Engine] Scheduled: Hydration Check');
}

export async function schedulePeriodReminder(predictedDate: Date) {
  console.log(`[Notification Engine] Scheduled: Period Reminder for ${predictedDate}`);
}

export async function scheduleOvulationReminder(ovulationDate: Date) {
  console.log(`[Notification Engine] Scheduled: Ovulation Reminder for ${ovulationDate}`);
}

export async function cancelAllNotifications() {
  console.log('[Notification Engine] Cancelled all notifications');
}
