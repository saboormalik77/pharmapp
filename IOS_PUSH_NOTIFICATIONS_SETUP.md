# 🍎 iOS Push Notifications Setup Guide for PharmAnalytics

## 🔧 Configuration Applied

The following iOS push notification configurations have been implemented:

### app.json
- ✅ `expo-build-properties` plugin with `useFrameworks: "static"` and `deploymentTarget: "15.1"`
- ✅ Custom `./plugins/withFirebasePushNotifications.js` plugin
- ✅ `UIBackgroundModes: ["remote-notification", "fetch", "background-processing"]`
- ✅ `BGTaskSchedulerPermittedIdentifiers` for background task support
- ✅ `aps-environment: "production"` in entitlements
- ✅ `com.apple.developer.usernotifications.communication: true` entitlement

### iOS Native Code
- ✅ AppDelegate.swift with Firebase configuration
- ✅ APNs token registration
- ✅ FCM token handling
- ✅ Foreground notification display
- ✅ Background notification handling
- ✅ Podfile with `$RNFirebaseAsStaticFramework = true`

---

## 🔧 Firebase Console Setup (Required)

### Step 1: Upload APNs Authentication Key
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `pharmacy-d6fe2`
3. Go to **Project Settings** → **Cloud Messaging** → **iOS app configuration**
4. Click **Upload** next to "APNs Authentication Key"
5. Upload your `.p8` file from Apple Developer Account

### Step 2: Configure APNs Key Details
```
Key ID: [Your 10-character Key ID from Apple Developer]
Team ID: [Your Apple Developer Team ID]
Bundle ID: com.tmit.pharmanalytics (must match exactly)
```

### Step 3: Verify Configuration
- Ensure the uploaded key shows "Active" status
- Bundle ID must match your app.json: `com.tmit.pharmanalytics`
- Team ID must match your Apple Developer account

---

## 🏗️ Apple Developer Account Setup

### Required Capabilities
1. Log into [Apple Developer Console](https://developer.apple.com/)
2. Go to **Certificates, Identifiers & Profiles**
3. Select your App ID: `com.tmit.pharmanalytics`
4. Ensure these capabilities are enabled:
   - ✅ **Push Notifications**
   - ✅ **Background App Refresh**
   - ✅ **Remote notifications**

### Create APNs Authentication Key (if not done)
1. Go to **Keys** section
2. Click **+** to create new key
3. Select **Apple Push Notifications service (APNs)**
4. Download the `.p8` file (keep it safe!)
5. Note the **Key ID** (10 characters)

---

## 📱 Building for iOS

### Option 1: EAS Build (Recommended)
```bash
# Install dependencies (including expo-build-properties)
cd pharmacyapp
npm install

# Build for iOS development
eas build --profile development --platform ios

# Or for production
eas build --profile production --platform ios
```

### Option 2: Local Development Build
```bash
cd pharmacyapp

# Regenerate native iOS project with new configurations
npx expo prebuild --platform ios --clean

# Install pods
cd ios && pod install && cd ..

# Build and run
npx expo run:ios
```

---

## ⚠️ Important Notes

### Device Requirements
- ✅ **Must use a real iOS device** - iOS Simulator does NOT support push notifications
- ✅ **iOS 15.1+** recommended (set as deployment target)
- ✅ **Development build required** - Expo Go does not support Firebase native modules

### GoogleService-Info.plist
Ensure your `GoogleService-Info.plist` in the pharmacyapp root has:
- Correct `BUNDLE_ID`: `com.tmit.pharmanalytics`
- Correct `PROJECT_ID`: `pharmacy-d6fe2`
- `IS_GCM_ENABLED`: `true`

---

## 🔍 Troubleshooting

### FCM Token Not Generated
1. Verify APNs key is uploaded in Firebase Console
2. Check that Push Notifications capability is enabled in Apple Developer
3. Ensure running on a real device (not simulator)
4. Check console logs for APNs token registration

### Permission Denied
1. Check iOS Settings → Notifications → PharmAnalytics
2. Ensure notifications are enabled
3. Try deleting and reinstalling the app

### Build Fails
1. Run `npx expo prebuild --platform ios --clean` to regenerate native code
2. Run `cd ios && pod install --repo-update && cd ..`
3. Ensure `expo-build-properties` is in dependencies

---

## ✅ Verification Checklist

Before testing, ensure:

### Firebase Console
- [ ] APNs Authentication Key (.p8) uploaded
- [ ] Key ID and Team ID configured correctly
- [ ] Bundle ID: `com.tmit.pharmanalytics`
- [ ] Key shows "Active" status

### Apple Developer
- [ ] App ID `com.tmit.pharmanalytics` exists
- [ ] Push Notifications capability enabled
- [ ] APNs key created and downloaded

### App Configuration
- [ ] `expo-build-properties` in package.json
- [ ] `useFrameworks: "static"` in app.json
- [ ] Firebase plugins in app.json
- [ ] GoogleService-Info.plist in project root

### Device & Build
- [ ] Using real iOS device (not simulator)
- [ ] Development/production build (not Expo Go)
- [ ] iOS 15.1+ device
- [ ] Internet connection available
