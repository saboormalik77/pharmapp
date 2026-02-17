/**
 * FCM Token Helper
 * Gets FCM token for push notifications
 * Based on gift-backend implementation
 */

import { Platform, PermissionsAndroid } from 'react-native';

// Conditional import for Firebase (only works in development builds, not Expo Go)
let messaging: any = null;

try {
  messaging = require('@react-native-firebase/messaging').default;
} catch (error) {
  // Firebase messaging not available (likely running in Expo Go)
  console.warn('Firebase messaging not available (likely running in Expo Go)');
}

/**
 * Get FCM token if available
 * Returns null if Firebase is not available or token cannot be retrieved
 */
export async function getFCMToken(): Promise<string | null> {
  console.log('🔍 getFCMToken() called - checking Firebase availability...');
  
  if (!messaging) {
    // Firebase messaging not available (likely Expo Go)
    console.log('⚠️ Firebase messaging not available - FCM token will be null');
    console.log('💡 This is normal if running in Expo Go. Firebase requires a development build.');
    return null;
  }
  
  console.log('✅ Firebase messaging is available');

  try {
    // Request permission for iOS and Android 13+
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('⚠️ Push notification permission denied - FCM token will be null');
      return null;
    }

    // For Android 13+ (API level 33+), request POST_NOTIFICATIONS permission
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log('⚠️ Android notification permission denied - FCM token will be null');
          return null;
        }
      } catch (androidError) {
        console.error('⚠️ Error requesting Android notification permission:', androidError);
        // Continue anyway, might work on some devices
      }
    }

    // Get FCM token
    const token = await messaging().getToken();
    if (token && typeof token === 'string' && token.trim().length > 0) {
      console.log('✅ FCM Token retrieved:', token.substring(0, 20) + '...');
      return token;
    } else {
      console.log('⚠️ FCM token is empty or invalid');
      return null;
    }
  } catch (error: any) {
    console.error('❌ Failed to get FCM token:', error);
    console.error('Error details:', error?.message || JSON.stringify(error, null, 2));
    return null;
  }
}

