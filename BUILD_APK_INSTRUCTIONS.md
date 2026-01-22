# Building APK for Pharma Collect Mobile App

## Prerequisites

1. Android SDK installed (found at `/usr/lib/android-sdk`)
2. Java Development Kit (JDK) installed
3. Node.js and npm installed

## Step 1: Accept Android SDK Licenses

Before building, you need to accept the Android SDK licenses. Run the following commands:

```bash
sudo mkdir -p /usr/lib/android-sdk/licenses

# Accept NDK license
echo -e "8403addf88ab4874007e1c1e80a0025de2550a16" | sudo tee /usr/lib/android-sdk/licenses/android-ndk-license

# Accept SDK license
echo -e "24333f8a63b6825ea9c5514f83c2829b004d1fee" | sudo tee /usr/lib/android-sdk/licenses/android-sdk-license

# Accept SDK preview license
echo -e "601085b94cd77f0b54ff864069570febe2359dd2" | sudo tee /usr/lib/android-sdk/licenses/android-sdk-preview-license

# Accept Google TV license
echo -e "24333f8a63b6825ea9c5514f83c2829b004d1fee\n601085b94cd77f0b54ff864069570febe2359dd2" | sudo tee /usr/lib/android-sdk/licenses/android-googletv-license

# Accept ARM license
echo -e "d56f5187479451eabf01fb78af6dfcb131a6481e" | sudo tee /usr/lib/android-sdk/licenses/android-sdk-arm-dbt-license
```

**OR** if you have `sdkmanager` available:

```bash
yes | sudo /usr/lib/android-sdk/cmdline-tools/latest/bin/sdkmanager --licenses
```

## Step 2: Build the APK

### Option A: Using the Build Script (Recommended)

```bash
cd /home/saboor.malik@2bvision.com/2bvt/pharma-collect-mobile
./build-apk.sh
```

### Option B: Manual Build

```bash
cd /home/saboor.malik@2bvision.com/2bvt/pharma-collect-mobile

# Set Android SDK location
export ANDROID_HOME=/usr/lib/android-sdk

# Ensure local.properties exists
echo "sdk.dir=$ANDROID_HOME" > android/local.properties

# Build release APK
cd android
./gradlew assembleRelease
```

## Step 3: Find Your APK

After successful build, the APK will be located at:

```
android/app/build/outputs/apk/release/app-release.apk
```

The build script also copies it to the project root as:
```
pharma-collect-mobile-release.apk
```

## Alternative: Using EAS Build (Cloud-based, No Local Setup Required)

If you prefer not to set up the Android SDK locally, you can use Expo's cloud build service:

1. Install EAS CLI:
```bash
npm install -g eas-cli
```

2. Login to Expo:
```bash
eas login
```

3. Configure EAS:
```bash
eas build:configure
```

4. Build APK:
```bash
eas build --platform android --profile preview
```

This will build the APK in the cloud and provide a download link.

## Troubleshooting

### Error: "SDK location not found"
- Ensure `ANDROID_HOME` is set: `export ANDROID_HOME=/usr/lib/android-sdk`
- Check that `android/local.properties` contains: `sdk.dir=/usr/lib/android-sdk`

### Error: "Licenses not accepted"
- Run the license acceptance commands in Step 1

### Error: "NDK not found"
- The build requires NDK. Ensure it's installed via Android Studio SDK Manager or accept licenses as shown above.

## APK Signing (For Production)

For production releases, you'll need to sign the APK. Create a keystore and configure signing in `android/app/build.gradle`.

