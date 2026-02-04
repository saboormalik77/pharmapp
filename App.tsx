import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Linking, AppState } from 'react-native';
import Toast from 'react-native-toast-message';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  const navigationRef = useRef<any>(null);

  useEffect(() => {
    // Handle deep link when app is already open
    const handleDeepLink = (event: { url: string }) => {
      const { url } = event;
      console.log('Deep link received:', url);
      
      // Handle orders redirect after checkout
      if (url.includes('orders') || url.includes('checkout=success')) {
        setTimeout(() => {
          if (navigationRef.current?.getRootState()) {
            try {
              navigationRef.current.navigate('MainStack', {
                screen: 'Main',
                params: {
                  screen: 'OrdersTab',
                },
              });
            } catch (error) {
              console.log('Navigation error:', error);
            }
          }
        }, 500);
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('Initial URL:', url);
        if (url.includes('orders') || url.includes('checkout=success')) {
          setTimeout(() => {
            if (navigationRef.current?.getRootState()) {
              try {
                navigationRef.current.navigate('MainStack', {
                  screen: 'Main',
                  params: {
                    screen: 'OrdersTab',
                  },
                });
              } catch (error) {
                console.log('Navigation error:', error);
              }
            }
          }, 1000);
        }
      }
    });

    // Also listen for app state changes (when app comes to foreground after Stripe checkout)
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        // Check for any pending deep links when app becomes active
        Linking.getInitialURL().then((url) => {
          if (url && (url.includes('orders') || url.includes('checkout=success'))) {
            setTimeout(() => {
              if (navigationRef.current?.getRootState()) {
                try {
                  navigationRef.current.navigate('MainStack', {
                    screen: 'Main',
                    params: {
                      screen: 'OrdersTab',
                    },
                  });
                } catch (error) {
                  console.log('Navigation error:', error);
                }
              }
            }, 500);
          }
        });
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      appStateSubscription.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef}>
        <StatusBar style="dark" />
        <AppNavigator />
        <Toast />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

