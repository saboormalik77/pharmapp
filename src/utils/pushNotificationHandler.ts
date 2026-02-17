/**
 * Push Notification Handler
 * Handles incoming push notifications and navigates to appropriate screens
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
 * Initialize push notification handlers
 */
export function initializePushNotificationHandlers() {
  if (!messaging) {
    console.warn('⚠️ Firebase messaging not available, push notification handlers not initialized');
    return;
  }

  // Handle notification when app is in foreground
  messaging().onMessage(async (remoteMessage: any) => {
    console.log('📱 Push notification received in foreground:', remoteMessage);
    
    // You can show a local notification here if needed
    // For now, we'll just log it
  });

  // Handle notification when app is opened from background/quit state
  messaging().onNotificationOpenedApp((remoteMessage: any) => {
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

  // Handle notification tap when app is in background (Android)
  if (Platform.OS === 'android') {
    messaging().setBackgroundMessageHandler(async (remoteMessage: any) => {
      console.log('📱 Message handled in background:', remoteMessage);
    });
  }

  console.log('✅ Push notification handlers initialized');
}

