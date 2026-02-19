/**
 * FCM Token Helper
 * Gets FCM token for push notifications
 * Works on both iOS and Android
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
 * Request notification permissions for iOS
 * Returns true if permissions are granted
 */
async function requestIOSPermissions(): Promise<boolean> {
  if (!messaging) return false;

  try {
    const authStatus = await messaging().requestPermission({
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    });

    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    console.log(`📱 iOS notification permission status: ${authStatus}, enabled: ${enabled}`);
    return enabled;
  } catch (error) {
    console.error('❌ Error requesting iOS notification permissions:', error);
    return false;
  }
}

/**
 * Request notification permissions for Android 13+
 * Returns true if permissions are granted
 */
async function requestAndroidPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android' || Platform.Version < 33) {
    return true; // No runtime permission needed for Android < 13
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    const enabled = granted === PermissionsAndroid.RESULTS.GRANTED;
    console.log(`📱 Android notification permission: ${granted}, enabled: ${enabled}`);
    return enabled;
  } catch (error) {
    console.error('❌ Error requesting Android notification permission:', error);
    return false;
  }
}

/**
 * Ensure APNs token is available on iOS
 * This is required before getting FCM token on iOS
 */
async function ensureAPNsToken(): Promise<boolean> {
  if (Platform.OS !== 'ios' || !messaging) {
    return true;
  }

  try {
    // Check if APNs token is already available
    let apnsToken = await messaging().getAPNSToken();
    
    if (!apnsToken) {
      console.log('⏳ Waiting for APNs token...');
      
      // Wait a bit for APNs token to be set by the system
      // This can take a moment after app launch
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      apnsToken = await messaging().getAPNSToken();
    }

    if (apnsToken) {
      console.log('✅ APNs token available:', apnsToken.substring(0, 20) + '...');
      return true;
    } else {
      console.warn('⚠️ APNs token not available - push notifications may not work');
      console.warn('💡 Make sure you have a valid provisioning profile with Push Notifications capability');
      return false;
    }
  } catch (error) {
    console.error('❌ Error getting APNs token:', error);
    return false;
  }
}

/**
 * Get FCM token if available
 * Returns null if Firebase is not available or token cannot be retrieved
 * Works on both iOS and Android
 */
export async function getFCMToken(): Promise<string | null> {
  console.log(`🔍 getFCMToken() called on ${Platform.OS} - checking Firebase availability...`);
  
  if (!messaging) {
    // Firebase messaging not available (likely Expo Go)
    console.log('⚠️ Firebase messaging not available - FCM token will be null');
    console.log('💡 This is normal if running in Expo Go. Firebase requires a development build.');
    return null;
  }
  
  console.log('✅ Firebase messaging is available');

  try {
    // Request platform-specific permissions
    let permissionGranted = false;
    
    if (Platform.OS === 'ios') {
      permissionGranted = await requestIOSPermissions();
      
      if (permissionGranted) {
        // On iOS, we need to ensure APNs token is available before getting FCM token
        const apnsAvailable = await ensureAPNsToken();
        if (!apnsAvailable) {
          console.warn('⚠️ APNs token not available - FCM token may not work correctly');
          // Continue anyway - token might still work
        }
      }
    } else if (Platform.OS === 'android') {
      // Request Firebase permission first
      const authStatus = await messaging().requestPermission();
      permissionGranted =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      
      if (permissionGranted) {
        // For Android 13+, also request POST_NOTIFICATIONS permission
        const androidPermission = await requestAndroidPermissions();
        if (!androidPermission) {
          console.warn('⚠️ Android POST_NOTIFICATIONS permission denied');
          // Continue anyway - might work on some devices
        }
      }
    }

    if (!permissionGranted) {
      console.log('⚠️ Push notification permission denied - FCM token will be null');
      return null;
    }

    // Get FCM token
    console.log('📱 Getting FCM token...');
    const token = await messaging().getToken();
    
    if (token && typeof token === 'string' && token.trim().length > 0) {
      console.log(`✅ FCM Token retrieved on ${Platform.OS}:`, token.substring(0, 20) + '...');
      return token;
    } else {
      console.log('⚠️ FCM token is empty or invalid');
      return null;
    }
  } catch (error: any) {
    console.error('❌ Failed to get FCM token:', error);
    console.error('Error details:', error?.message || JSON.stringify(error, null, 2));
    
    // Provide helpful debugging info for iOS
    if (Platform.OS === 'ios') {
      console.log('💡 iOS FCM troubleshooting tips:');
      console.log('   1. Ensure you have a valid APNs key/certificate in Firebase Console');
      console.log('   2. Ensure Push Notifications capability is enabled in Xcode');
      console.log('   3. Ensure you have a valid provisioning profile');
      console.log('   4. Test on a real device (simulators have limited push support)');
    }
    
    return null;
  }
}

/**
 * Delete FCM token (useful for logout)
 */
export async function deleteFCMToken(): Promise<void> {
  if (!messaging) {
    return;
  }

  try {
    await messaging().deleteToken();
    console.log('✅ FCM token deleted');
  } catch (error) {
    console.error('❌ Error deleting FCM token:', error);
  }
}

/**
 * Check if notifications are enabled
 */
export async function areNotificationsEnabled(): Promise<boolean> {
  if (!messaging) {
    return false;
  }

  try {
    const authStatus = await messaging().hasPermission();
    return (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL
    );
  } catch (error) {
    console.error('❌ Error checking notification permissions:', error);
    return false;
  }
}
