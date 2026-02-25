/**
 * Expo Config Plugin to fix Firebase Push Notifications on iOS
 * This adds the required $RNFirebaseAsStaticFramework configuration to the Podfile
 * 
 * Based on official Firebase React Native documentation:
 * https://rnfirebase.io/
 */

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function withFirebasePushNotifications(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      if (fs.existsSync(podfilePath)) {
        let podfileContent = fs.readFileSync(podfilePath, 'utf8');
        
        // Check if $RNFirebaseAsStaticFramework is already set
        if (!podfileContent.includes('$RNFirebaseAsStaticFramework')) {
          // Add it at the beginning of the file, after the requires
          const insertAfter = "require 'json'";
          const firebaseConfig = `
# Firebase Push Notifications - Static Framework Configuration
# Required for @react-native-firebase to work correctly with push notifications
$RNFirebaseAsStaticFramework = true
`;
          
          if (podfileContent.includes(insertAfter)) {
            podfileContent = podfileContent.replace(
              insertAfter,
              `${insertAfter}\n${firebaseConfig}`
            );
          } else {
            // Fallback: add at the very beginning
            podfileContent = firebaseConfig + podfileContent;
          }
          
          console.log('✅ Added $RNFirebaseAsStaticFramework = true to Podfile');
        }
        
        // Ensure Firebase pods have proper configuration in post_install
        if (!podfileContent.includes("target.name.start_with?('Firebase')")) {
          const postInstallAddition = `
      # Firebase static framework configuration for push notifications
      if target.name.start_with?('Firebase') || target.name.start_with?('GoogleUtilities')
        target.build_configurations.each do |config|
          config.build_settings['BUILD_LIBRARY_FOR_DISTRIBUTION'] = 'YES'
        end
      end
`;
          
          // Find the location to insert (inside the post_install targets.each block)
          const targetsEachPattern = /installer\.pods_project\.targets\.each do \|target\|/;
          if (targetsEachPattern.test(podfileContent)) {
            // Insert after the first build_configurations block
            podfileContent = podfileContent.replace(
              /(installer\.pods_project\.targets\.each do \|target\|[\s\S]*?target\.build_configurations\.each do \|config\|[\s\S]*?end)/,
              `$1\n${postInstallAddition}`
            );
            console.log('✅ Added Firebase post_install configuration');
          }
        }
        
        fs.writeFileSync(podfilePath, podfileContent);
      }
      
      return config;
    },
  ]);
}

module.exports = withFirebasePushNotifications;
