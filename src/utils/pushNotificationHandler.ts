/**
 * Push Notification Handler
 * Handles incoming push notifications and navigates to appropriate screens
 * Works on both iOS and Android
 */

import { Platform } from 'react-native';
import { DrawerActions } from '@react-navigation/native';

// Conditional import for Firebase (only works in development builds, not Expo Go)
let messaging: any = null;
let navigationRef: any = null;

try {
  messaging = require('@react-native-firebase/messaging').default;
} catch (error) {
  // Firebase messaging not available (likely running in Expo Go)
  console.warn('Firebase messaging not available (likely running in Expo Go)');
}

/**
 * Set navigation reference for push notification navigation
 */
export function setNavigationRef(ref: any) {
  navigationRef = ref;
}

/**
 * Navigate to Inventory Analysis with return tab
 */
function navigateToInventoryAnalysis() {
  if (navigationRef?.current) {
    try {
      // Navigate through MainStack -> Main (TabNavigator) -> More (Drawer) -> InventoryAnalysis
      navigationRef.current.navigate('MainStack', {
        screen: 'Main',
        params: {
          screen: 'More',
          params: {
            screen: 'InventoryAnalysis',
            params: {
              activeTab: 'return',
            },
          },
        },
      });
      
      // Drawer will be closed by InventoryAnalysisScreen when it receives the activeTab param
      
      console.log('✅ Navigated to Inventory Analysis with return tab');
    } catch (error) {
      console.error('❌ Error navigating to Inventory Analysis:', error);
    }
  } else {
    console.warn('⚠️ Navigation ref not available');
  }
}

/**
 * Handle notification press/tap
 */
function handleNotificationPress(data: any) {
  console.log('📱 Push notification pressed with data:', data);
  
  // Check if it's an expiring products notification
  if (data?.type === 'expiring_products') {
    navigateToInventoryAnalysis();
  } else {
    // Default: navigate to Inventory Analysis with return tab
    navigateToInventoryAnalysis();
  }
}

/**
 * Request iOS notification permissions
 * This is required for iOS to receive push notifications
 */
async function requestIOSPermissions(): Promise<boolean> {
  if (!messaging || Platform.OS !== 'ios') {
    return true;
  }

  try {
    const authStatus = await messaging().requestPermission({
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
      announcement: true,
      carPlay: false,
      criticalAlert: false,
    });

    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('✅ iOS notification permissions granted:', authStatus);
    } else {
      console.warn('⚠️ iOS notification permissions denied:', authStatus);
    }

    return enabled;
  } catch (error) {
    console.error('❌ Error requesting iOS notification permissions:', error);
    return false;
  }
}

/**
 * Register for iOS remote notifications
 * This ensures the app is registered with APNs
 */
async function registerForRemoteNotifications(): Promise<void> {
  if (!messaging || Platform.OS !== 'ios') {
    return;
  }

  try {
    // Check if APNs token is available
    const apnsToken = await messaging().getAPNSToken();
    if (apnsToken) {
      console.log('✅ APNs token available:', apnsToken.substring(0, 20) + '...');
    } else {
      console.log('⚠️ APNs token not yet available, will be set when available');
      
      // On iOS, we need to wait for the APNs token to be set
      // The native code will handle this automatically
    }
  } catch (error) {
    console.error('❌ Error getting APNs token:', error);
  }
}

/**
 * Initialize push notification handlers
 * Works on both iOS and Android
 */
export async function initializePushNotificationHandlers() {
  if (!messaging) {
    console.warn('⚠️ Firebase messaging not available, push notification handlers not initialized');
    return;
  }

  console.log(`📱 Initializing push notification handlers for ${Platform.OS}...`);

  // Request permissions for iOS
  if (Platform.OS === 'ios') {
    const permissionGranted = await requestIOSPermissions();
    if (!permissionGranted) {
      console.warn('⚠️ iOS notification permissions not granted');
      // Continue anyway - user might grant permissions later
    }
    
    // Register for remote notifications on iOS
    await registerForRemoteNotifications();
  }

  // Handle notification when app is in foreground
  const unsubscribeOnMessage = messaging().onMessage(async (remoteMessage: any) => {
    console.log('📱 Push notification received in foreground:', remoteMessage);
    
    // On iOS, the notification will be shown by the native delegate
    // On Android, you might want to show a local notification here
    if (Platform.OS === 'android') {
      // You can show a local notification here if needed
      console.log('📱 Android foreground notification - consider showing local notification');
    }
  });

  // Handle notification when app is opened from background/quit state
  const unsubscribeOnNotificationOpened = messaging().onNotificationOpenedApp((remoteMessage: any) => {
    console.log('📱 Notification opened app from background:', remoteMessage);
    
    if (remoteMessage?.data) {
      handleNotificationPress(remoteMessage.data);
    }
  });

  // Check if app was opened from a notification (app was quit)
  messaging()
    .getInitialNotification()
    .then((remoteMessage: any) => {
      if (remoteMessage) {
        console.log('📱 Notification opened app from quit state:', remoteMessage);
        
        if (remoteMessage?.data) {
          // Use a small delay to ensure navigation is ready
          setTimeout(() => {
            handleNotificationPress(remoteMessage.data);
          }, 1000);
        }
      }
    })
    .catch((error: any) => {
      console.error('❌ Error getting initial notification:', error);
    });

  // Handle background messages
  // Note: On iOS, background messages are handled by the native AppDelegate
  // On Android, we set up the background handler
  if (Platform.OS === 'android') {
    messaging().setBackgroundMessageHandler(async (remoteMessage: any) => {
      console.log('📱 Message handled in background (Android):', remoteMessage);
    });
  }

  // Listen for token refresh
  const unsubscribeOnTokenRefresh = messaging().onTokenRefresh((token: string) => {
    console.log('📱 FCM token refreshed:', token.substring(0, 20) + '...');
    // You might want to send this new token to your server
  });

  console.log(`✅ Push notification handlers initialized for ${Platform.OS}`);

  // Return cleanup function
  return () => {
    unsubscribeOnMessage();
    unsubscribeOnNotificationOpened();
    unsubscribeOnTokenRefresh();
  };
}
