import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { View, Text, ActivityIndicator, StyleSheet, Dimensions, Platform } from 'react-native';
import { 
  Home, 
  ShoppingBag, 
  Search,
  Package, 
  Settings,
  FileText,
  Box,
  Store,
  Menu,
  Building2,
  LogOut,
  User,
  CreditCard,
} from 'lucide-react-native';

import { useAuthStore } from '../store/authStore';

// Auth Screens
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';

// Main Screens
import { DashboardScreen } from '../screens/DashboardScreen';
import { DocumentsScreen } from '../screens/DocumentsScreen';
import { ProductsScreen } from '../screens/ProductsScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { PackagesScreen } from '../screens/PackagesScreen';
import { MarketplaceScreen } from '../screens/MarketplaceScreen';
import { OrdersScreen } from '../screens/OrdersScreen';
import { OrderDetailScreen } from '../screens/OrderDetailScreen';
import { CartScreen } from '../screens/CartScreen';
import { TopDistributorsScreen } from '../screens/TopDistributorsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { SubscriptionScreen } from '../screens/SubscriptionScreen';

// Responsive helpers
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;
const isSmallDevice = SCREEN_WIDTH < 375;
const isLargeDevice = SCREEN_WIDTH >= 414;
const isShortScreen = SCREEN_HEIGHT < 700;

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  MainStack: undefined;
  Login: undefined;
  Register: undefined;
  Dashboard: undefined;
  Documents: undefined;
  Products: undefined;
  Search: undefined;
  Packages: undefined;
  Marketplace: undefined;
  Orders: undefined;
  OrderDetail: { orderId: string };
  TopDistributors: undefined;
  Settings: undefined;
  Subscription: undefined;
  Cart: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

const TEAL_500 = '#14B8A6';
const TEAL_600 = '#0D9488';
const GRAY_400 = '#9CA3AF';

// Custom Drawer Content with proper styling
function CustomDrawerContent(props: any) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const avatarIconSize = 22;
  const logoutIconSize = 18;
  const badgeIconSize = 10;

  return (
    <DrawerContentScrollView 
      {...props} 
      contentContainerStyle={styles.drawerContent}
      showsVerticalScrollIndicator={false}
    >
      {/* User Info Header */}
      <View style={styles.drawerHeader}>
        <View style={styles.drawerAvatarContainer}>
          <View style={styles.drawerAvatar}>
            <User color={TEAL_500} size={avatarIconSize} />
          </View>
        </View>
        <View style={styles.drawerUserInfo}>
          <Text style={styles.drawerUserName} numberOfLines={1}>
            {user?.name || 'User'}
          </Text>
          <Text style={styles.drawerUserEmail} numberOfLines={1}>
            {user?.email || 'user@example.com'}
          </Text>
          {user?.pharmacy_name && (
            <View style={styles.pharmacyBadge}>
              <Building2 color="#FFFFFF" size={badgeIconSize} />
              <Text style={styles.drawerPharmacyName} numberOfLines={1}>
                {user.pharmacy_name}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Navigation Items - no flex to prevent stretching */}
      <View style={styles.drawerItemsContainer}>
        <Text style={styles.drawerSectionTitle}>MENU</Text>
        <DrawerItemList {...props} />
      </View>

      {/* Logout Button - at the bottom */}
      <View style={styles.drawerFooter}>
        <DrawerItem
          label="Logout"
          icon={({ size }) => <LogOut color="#EF4444" size={logoutIconSize} />}
          labelStyle={styles.logoutLabel}
          style={styles.logoutItem}
          onPress={async () => {
            await logout();
          }}
        />
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>
    </DrawerContentScrollView>
  );
}

// Component that shows drawer - it will auto-open via defaultStatus
function MoreTabScreen() {
  return <DrawerNavigatorContent />;
}

function TabNavigator() {
  const tabIconSize = moderateScale(18);
  // iOS needs more bottom padding to account for home indicator
  const tabBarHeight = Platform.OS === 'ios' ? moderateScale(85) : moderateScale(60);
  const tabBarPaddingBottom = Platform.OS === 'ios' ? moderateScale(28) : moderateScale(8);
  
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: TEAL_500,
        tabBarInactiveTintColor: GRAY_400,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          height: tabBarHeight,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: moderateScale(8),
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: moderateScale(9),
          fontWeight: '600',
          marginTop: moderateScale(2),
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ color }) => <Home color={color} size={tabIconSize} />,
          tabBarLabel: 'Dashboard',
        }}
      />
      <Tab.Screen
        name="MarketplaceTab"
        component={MarketplaceScreen}
        options={{
          tabBarIcon: ({ color }) => <Store color={color} size={tabIconSize} />,
          tabBarLabel: 'Marketplace',
        }}
      />
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ color }) => <Search color={color} size={tabIconSize} />,
          tabBarLabel: 'Search',
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersScreen}
        options={{
          tabBarIcon: ({ color }) => <ShoppingBag color={color} size={tabIconSize} />,
          tabBarLabel: 'Orders',
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreTabScreen}
        options={{
          tabBarIcon: ({ color }) => <Menu color={color} size={tabIconSize} />,
          tabBarLabel: 'More',
        }}
      />
    </Tab.Navigator>
  );
}

// Drawer navigator content - auto opens when More tab is selected
function DrawerNavigatorContent() {
  // Icons and fonts for drawer
  const drawerIconSize = 20;
  const drawerWidth = Math.min(SCREEN_WIDTH * 0.85, 320);
  
  return (
    <Drawer.Navigator
      defaultStatus="open"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerActiveTintColor: TEAL_500,
        drawerInactiveTintColor: '#374151',
        drawerActiveBackgroundColor: '#F0FDFA',
        drawerType: 'front',
        lazy: false,
        drawerStyle: {
          width: drawerWidth,
          backgroundColor: '#FFFFFF',
        },
        headerStyle: {
          backgroundColor: TEAL_500,
          elevation: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontSize: 16,
          fontWeight: '600',
        },
        drawerLabelStyle: {
          fontSize: 14,
          fontWeight: '500',
          marginLeft: 8,
        },
        drawerItemStyle: {
          borderRadius: 8,
          marginHorizontal: 10,
          marginVertical: 2,
        },
      }}
    >
      <Drawer.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          drawerIcon: ({ color }) => <Home color={color} size={drawerIconSize} />,
        }}
      />
      <Drawer.Screen
        name="Documents"
        component={DocumentsScreen}
        options={{
          drawerIcon: ({ color }) => <FileText color={color} size={drawerIconSize} />,
          title: 'Upload Documents',
        }}
      />
      <Drawer.Screen
        name="Products"
        component={ProductsScreen}
        options={{
          drawerIcon: ({ color }) => <Package color={color} size={drawerIconSize} />,
          title: 'My Products',
        }}
      />
      <Drawer.Screen
        name="Search"
        component={SearchScreen}
        options={{
          drawerIcon: ({ color }) => <Search color={color} size={drawerIconSize} />,
        }}
      />
      <Drawer.Screen
        name="Packages"
        component={PackagesScreen}
        options={{
          drawerIcon: ({ color }) => <Box color={color} size={drawerIconSize} />,
        }}
      />
      <Drawer.Screen
        name="Marketplace"
        component={MarketplaceScreen}
        options={{
          drawerIcon: ({ color }) => <Store color={color} size={drawerIconSize} />,
        }}
      />
      <Drawer.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          drawerIcon: ({ color }) => <ShoppingBag color={color} size={drawerIconSize} />,
        }}
      />
      <Drawer.Screen
        name="TopDistributors"
        component={TopDistributorsScreen}
        options={{
          drawerIcon: ({ color }) => <Building2 color={color} size={drawerIconSize} />,
          title: 'Top Distributors',
        }}
      />
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          drawerIcon: ({ color }) => <Settings color={color} size={drawerIconSize} />,
        }}
      />
      <Drawer.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{
          drawerIcon: ({ color }) => <CreditCard color={color} size={drawerIconSize} />,
        }}
      />
    </Drawer.Navigator>
  );
}

// Main drawer navigator wrapper
function DrawerNavigator() {
  return <DrawerNavigatorContent />;
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
    </Stack.Navigator>
  );
}

export function AppNavigator() {
  const { isLoading, isAuthenticated, loadStoredAuth } = useAuthStore();

  useEffect(() => {
    loadStoredAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={TEAL_500} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="MainStack" component={MainStack} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: moderateScale(12),
    fontSize: moderateScale(14),
    color: '#6B7280',
    fontWeight: '500',
  },
  drawerContent: {
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
  },
  drawerHeader: {
    backgroundColor: TEAL_500,
    paddingHorizontal: moderateScale(10),
    paddingTop: Platform.OS === 'ios' ? moderateScale(10) : moderateScale(8),
    paddingBottom: moderateScale(12),
    borderBottomLeftRadius: moderateScale(12),
    borderBottomRightRadius: moderateScale(12),
  },
  drawerAvatarContainer: {
    alignItems: 'flex-start',
    marginBottom: moderateScale(6),
  },
  drawerAvatar: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  drawerUserInfo: {
  },
  drawerUserName: {
    fontSize: moderateScale(13),
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 0,
  },
  drawerUserEmail: {
    fontSize: moderateScale(10),
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: moderateScale(4),
  },
  pharmacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: moderateScale(6),
    paddingVertical: moderateScale(2),
    borderRadius: moderateScale(8),
    alignSelf: 'flex-start',
    gap: moderateScale(3),
  },
  drawerPharmacyName: {
    fontSize: moderateScale(8),
    color: '#FFFFFF',
    fontWeight: '500',
  },
  drawerSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginLeft: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  drawerItemsContainer: {
    paddingTop: 0,
  },
  drawerFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    marginTop: 8,
  },
  logoutItem: {
    marginHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  logoutLabel: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 8,
  },
});
