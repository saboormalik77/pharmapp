import { registerRootComponent } from 'expo';
import App from './App';

// Firebase background message handler - Required for iOS/Android background push notifications
// This must be called BEFORE registerRootComponent per official Firebase docs
// https://rnfirebase.io/messaging/usage#background--quit-state-messages
let messaging = null;
try {
  messaging = require('@react-native-firebase/messaging').default;
} catch (error) {
  // Firebase messaging not available (likely running in Expo Go)
  console.warn('Firebase messaging not available (likely running in Expo Go)');
}

if (messaging) {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('🔔 [Background] Message handled in the background!', remoteMessage);
    // Handle background message - do NOT update UI here
    // You can update local storage, make network requests, etc.
  });
}

registerRootComponent(App);

