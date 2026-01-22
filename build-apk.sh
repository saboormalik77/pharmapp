#!/bin/bash

# Build APK Script for Pharma Collect Mobile App
# This script builds the Android APK file

set -e

echo "🚀 Starting APK build process..."

# Set Android SDK location
export ANDROID_HOME=/usr/lib/android-sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools

# Navigate to project root
cd "$(dirname "$0")"

# Check if Android SDK licenses are accepted
if [ ! -d "$ANDROID_HOME/licenses" ] || [ ! -f "$ANDROID_HOME/licenses/android-ndk-license" ]; then
    echo "⚠️  Android SDK licenses need to be accepted."
    echo "Please run the following command with sudo:"
    echo ""
    echo "sudo mkdir -p $ANDROID_HOME/licenses"
    echo "echo -e '8403addf88ab4874007e1c1e80a0025de2550a16' | sudo tee $ANDROID_HOME/licenses/android-ndk-license"
    echo "echo -e '24333f8a63b6825ea9c5514f83c2829b004d1fee' | sudo tee $ANDROID_HOME/licenses/android-sdk-license"
    echo "echo -e '601085b94cd77f0b54ff864069570febe2359dd2' | sudo tee $ANDROID_HOME/licenses/android-sdk-preview-license"
    echo ""
    echo "Or accept all licenses using:"
    echo "yes | sudo $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses"
    echo ""
    exit 1
fi

# Ensure local.properties exists
if [ ! -f "android/local.properties" ]; then
    echo "📝 Creating local.properties..."
    echo "sdk.dir=$ANDROID_HOME" > android/local.properties
fi

# Build the APK
echo "🔨 Building release APK..."
cd android
./gradlew assembleRelease

# Check if APK was created
APK_PATH="app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK_PATH" ]; then
    echo ""
    echo "✅ APK built successfully!"
    echo "📦 APK location: $(pwd)/$APK_PATH"
    echo ""
    # Copy to project root for easy access
    cp "$APK_PATH" "../pharma-collect-mobile-release.apk"
    echo "📋 APK also copied to: $(pwd)/../pharma-collect-mobile-release.apk"
    echo ""
    ls -lh "../pharma-collect-mobile-release.apk"
else
    echo "❌ APK build failed. Check the error messages above."
    exit 1
fi

