import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User,
  Shield,
  Building,
  MapPin,
  Edit,
  Save,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Settings as SettingsIcon,
  LogOut,
} from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import { settingsService, UserSettings } from '../api/services';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = (size: number) => (SCREEN_WIDTH / 375) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

type TabType = 'profile' | 'security';

// Memoized Input Field Component - defined outside to prevent recreation
interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  secureTextEntry?: boolean;
  rightIcon?: React.ReactNode;
}

const InputField = memo(({
  label,
  value,
  onChangeText,
  placeholder,
  disabled = false,
  keyboardType = 'default',
  secureTextEntry = false,
  rightIcon,
}: InputFieldProps) => (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={styles.inputContainer}>
      <TextInput
        style={[
          styles.input, 
          disabled ? styles.inputDisabled : null, 
          rightIcon ? styles.inputWithIcon : null
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        editable={!disabled}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {rightIcon && <View style={styles.inputRightIcon}>{rightIcon}</View>}
    </View>
  </View>
));

export function SettingsScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const updateUser = useAuthStore((state) => state.updateUser);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  // Profile state
  const [isEditing, setIsEditing] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [profile, setProfile] = useState<UserSettings>({
    name: '',
    email: '',
    phone: '',
    title: '',
    pharmacyName: '',
    npiNumber: '',
    deaNumber: '',
    physicalAddress: {
      street: '',
      city: '',
      state: '',
      zip: '',
    },
  });
  const [originalProfile, setOriginalProfile] = useState<UserSettings>(profile);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoadingSettings(true);
      setError(null);
      const settings = await settingsService.getSettings();
      setProfile(settings);
      setOriginalProfile(settings);
    } catch (err: any) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoadingSettings(false);
    }
  };

  // Profile field update handlers - using useCallback to prevent recreation
  const updateProfileField = useCallback((field: keyof UserSettings, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateAddressField = useCallback((field: string, value: string) => {
    setProfile(prev => ({
      ...prev,
      physicalAddress: { ...prev.physicalAddress, [field]: value },
    }));
  }, []);

  // Get only changed fields
  const getChangedFields = useCallback((): Partial<UserSettings> => {
    const changes: Partial<UserSettings> = {};

    if (profile.name !== originalProfile.name) changes.name = profile.name;
    if (profile.email !== originalProfile.email) changes.email = profile.email;
    if (profile.phone !== originalProfile.phone) changes.phone = profile.phone;
    if (profile.title !== originalProfile.title) changes.title = profile.title;
    if (profile.pharmacyName !== originalProfile.pharmacyName) changes.pharmacyName = profile.pharmacyName;
    if (profile.npiNumber !== originalProfile.npiNumber) changes.npiNumber = profile.npiNumber;
    if (profile.deaNumber !== originalProfile.deaNumber) changes.deaNumber = profile.deaNumber;

    const addressChanged =
      profile.physicalAddress?.street !== originalProfile.physicalAddress?.street ||
      profile.physicalAddress?.city !== originalProfile.physicalAddress?.city ||
      profile.physicalAddress?.state !== originalProfile.physicalAddress?.state ||
      profile.physicalAddress?.zip !== originalProfile.physicalAddress?.zip;

    if (addressChanged) {
      changes.physicalAddress = profile.physicalAddress;
    }

    return changes;
  }, [profile, originalProfile]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const changedFields = getChangedFields();

      if (Object.keys(changedFields).length === 0) {
        setIsEditing(false);
        return;
      }

      const updatedSettings = await settingsService.updateProfile(changedFields);
      setProfile(updatedSettings);
      setOriginalProfile(updatedSettings);
      setIsEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      if (updatedSettings.name || updatedSettings.pharmacyName) {
        updateUser({
          name: updatedSettings.name || user?.name,
          pharmacy_name: updatedSettings.pharmacyName || user?.pharmacy_name,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setProfile(originalProfile);
    setIsEditing(false);
    setError(null);
  };

  // Password validation
  const validatePassword = useCallback((password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  }, []);

  const handleChangePassword = async () => {
    try {
      setError(null);
      setPasswordError(null);

      if (!currentPassword) {
        setError('Please enter your current password');
        return;
      }

      if (!newPassword) {
        setError('Please enter a new password');
        return;
      }

      const validationError = validatePassword(newPassword);
      if (validationError) {
        setPasswordError(validationError);
        setError(validationError);
        return;
      }

      if (newPassword !== confirmPassword) {
        setError('New passwords do not match');
        setPasswordError('New passwords do not match');
        return;
      }

      setChangingPassword(true);

      await settingsService.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      // Reset password form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      Alert.alert('Success', 'Password changed successfully!');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to change password';
      setError(errorMessage);
      setPasswordError(errorMessage);
    } finally {
      setChangingPassword(false);
    }
  };

  // Password input validation on change
  const handleNewPasswordChange = useCallback((text: string) => {
    setNewPassword(text);
    if (text) {
      const validationError = validatePassword(text);
      if (validationError) {
        setPasswordError(validationError);
      } else if (confirmPassword && text !== confirmPassword) {
        setPasswordError('New passwords do not match');
      } else {
        setPasswordError(null);
      }
    } else {
      setPasswordError(null);
    }
  }, [confirmPassword, validatePassword]);

  const handleConfirmPasswordChange = useCallback((text: string) => {
    setConfirmPassword(text);
    if (text && newPassword) {
      if (text !== newPassword) {
        setPasswordError('New passwords do not match');
      } else {
        const validationError = validatePassword(newPassword);
        setPasswordError(validationError);
      }
    }
  }, [newPassword, validatePassword]);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const TabButton = ({ tab, label, icon: Icon }: { tab: TabType; label: string; icon: any }) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
      onPress={() => {
        setActiveTab(tab);
        setError(null);
        setPasswordError(null);
        setSaved(false);
      }}
    >
      <Icon color={activeTab === tab ? '#FFFFFF' : '#6B7280'} size={moderateScale(14)} />
      <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <LinearGradient
          colors={['#F8FAFC', '#F1F5F9', '#F8FAFC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconContainer}>
                <SettingsIcon color="#64748B" size={moderateScale(18)} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Settings</Text>
                <Text style={styles.headerSubtitle}>Manage your account settings</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TabButton tab="profile" label="Profile" icon={User} />
          <TabButton tab="security" label="Security" icon={Shield} />
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Success/Error Messages */}
          {error && (
            <View style={styles.alertError}>
              <AlertCircle color="#DC2626" size={moderateScale(14)} />
              <Text style={styles.alertErrorText}>{error}</Text>
            </View>
          )}

          {saved && (
            <View style={styles.alertSuccess}>
              <CheckCircle color="#22C55E" size={moderateScale(14)} />
              <Text style={styles.alertSuccessText}>Settings saved successfully!</Text>
            </View>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <View style={styles.cardIconContainer}>
                    <User color="#3B82F6" size={moderateScale(14)} />
                  </View>
                  <Text style={styles.cardTitle}>Profile Information</Text>
                </View>
                {!isEditing ? (
                  <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
                    <Edit color="#FFFFFF" size={moderateScale(12)} />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.editActions}>
                    <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} disabled={saving}>
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
                      {saving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Save color="#FFFFFF" size={moderateScale(12)} />
                          <Text style={styles.saveButtonText}>Save</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {loadingSettings ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#14B8A6" />
                  <Text style={styles.loadingText}>Loading settings...</Text>
                </View>
              ) : (
                <>
                  <View style={styles.inputRow}>
                    <View style={styles.inputHalf}>
                      <InputField
                        label="Full Name"
                        value={profile.name || ''}
                        onChangeText={(text) => updateProfileField('name', text)}
                        disabled={!isEditing}
                      />
                    </View>
                    <View style={styles.inputHalf}>
                      <InputField
                        label="Email"
                        value={profile.email || ''}
                        onChangeText={(text) => updateProfileField('email', text)}
                        disabled={!isEditing}
                        keyboardType="email-address"
                      />
                    </View>
                  </View>

                  <View style={styles.inputRow}>
                    <View style={styles.inputHalf}>
                      <InputField
                        label="Phone"
                        value={profile.phone || ''}
                        onChangeText={(text) => updateProfileField('phone', text)}
                        disabled={!isEditing}
                        keyboardType="phone-pad"
                      />
                    </View>
                    <View style={styles.inputHalf}>
                      <InputField
                        label="Title"
                        value={profile.title || ''}
                        onChangeText={(text) => updateProfileField('title', text)}
                        disabled={!isEditing}
                      />
                    </View>
                  </View>

                  {/* Pharmacy Information */}
                  <View style={styles.sectionDivider}>
                    <View style={styles.sectionHeader}>
                      <Building color="#3B82F6" size={moderateScale(14)} />
                      <Text style={styles.sectionTitle}>Pharmacy Information</Text>
                    </View>
                  </View>

                  <View style={styles.inputRow}>
                    <View style={styles.inputHalf}>
                      <InputField
                        label="Pharmacy Name"
                        value={profile.pharmacyName || ''}
                        onChangeText={(text) => updateProfileField('pharmacyName', text)}
                        disabled={!isEditing}
                      />
                    </View>
                    <View style={styles.inputHalf}>
                      <InputField
                        label="NPI Number"
                        value={profile.npiNumber || ''}
                        onChangeText={(text) => updateProfileField('npiNumber', text)}
                        disabled={!isEditing}
                      />
                    </View>
                  </View>

                  <InputField
                    label="DEA Number"
                    value={profile.deaNumber || ''}
                    onChangeText={(text) => updateProfileField('deaNumber', text)}
                    disabled={!isEditing}
                  />

                  {/* Physical Address */}
                  <View style={styles.sectionDivider}>
                    <View style={styles.sectionHeader}>
                      <MapPin color="#3B82F6" size={moderateScale(14)} />
                      <Text style={styles.sectionTitle}>Physical Address</Text>
                    </View>
                  </View>

                  <InputField
                    label="Street Address"
                    value={profile.physicalAddress?.street || ''}
                    onChangeText={(text) => updateAddressField('street', text)}
                    disabled={!isEditing}
                    placeholder="Optional"
                  />

                  <View style={styles.inputRow}>
                    <View style={styles.inputHalf}>
                      <InputField
                        label="City"
                        value={profile.physicalAddress?.city || ''}
                        onChangeText={(text) => updateAddressField('city', text)}
                        disabled={!isEditing}
                        placeholder="Optional"
                      />
                    </View>
                    <View style={styles.inputHalf}>
                      <InputField
                        label="State"
                        value={profile.physicalAddress?.state || ''}
                        onChangeText={(text) => updateAddressField('state', text)}
                        disabled={!isEditing}
                        placeholder="e.g. CA"
                      />
                    </View>
                  </View>

                  <InputField
                    label="ZIP Code"
                    value={profile.physicalAddress?.zip || ''}
                    onChangeText={(text) => updateAddressField('zip', text)}
                    disabled={!isEditing}
                    placeholder="Optional"
                  />
                </>
              )}
            </View>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <View style={[styles.cardIconContainer, { backgroundColor: '#FEE2E2' }]}>
                    <Key color="#EF4444" size={moderateScale(14)} />
                  </View>
                  <Text style={styles.cardTitle}>Change Password</Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Enter current password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showCurrentPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff color="#6B7280" size={moderateScale(16)} />
                    ) : (
                      <Eye color="#6B7280" size={moderateScale(16)} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={[styles.passwordInput, passwordError && newPassword && styles.inputError]}
                    value={newPassword}
                    onChangeText={handleNewPasswordChange}
                    placeholder="Enter new password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff color="#6B7280" size={moderateScale(16)} />
                    ) : (
                      <Eye color="#6B7280" size={moderateScale(16)} />
                    )}
                  </TouchableOpacity>
                </View>
                {passwordError && newPassword ? (
                  <View style={styles.passwordHintError}>
                    <AlertCircle color="#EF4444" size={moderateScale(10)} />
                    <Text style={styles.passwordHintErrorText}>{passwordError}</Text>
                  </View>
                ) : !passwordError && newPassword ? (
                  <View style={styles.passwordHintSuccess}>
                    <CheckCircle color="#22C55E" size={moderateScale(10)} />
                    <Text style={styles.passwordHintSuccessText}>Password meets requirements</Text>
                  </View>
                ) : (
                  <Text style={styles.passwordHint}>
                    Must be at least 8 characters with uppercase, lowercase, and numbers
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={[styles.passwordInput, passwordError && confirmPassword && styles.inputError]}
                    value={confirmPassword}
                    onChangeText={handleConfirmPasswordChange}
                    placeholder="Confirm new password"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff color="#6B7280" size={moderateScale(16)} />
                    ) : (
                      <Eye color="#6B7280" size={moderateScale(16)} />
                    )}
                  </TouchableOpacity>
                </View>
                {confirmPassword && newPassword && confirmPassword === newPassword && !validatePassword(newPassword) && (
                  <View style={styles.passwordHintSuccess}>
                    <CheckCircle color="#22C55E" size={moderateScale(10)} />
                    <Text style={styles.passwordHintSuccessText}>Passwords match</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.changePasswordButton,
                  (changingPassword || !currentPassword || !newPassword || !confirmPassword || !!passwordError) &&
                    styles.changePasswordButtonDisabled,
                ]}
                onPress={handleChangePassword}
                disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword || !!passwordError}
              >
                {changingPassword ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Key color="#FFFFFF" size={moderateScale(14)} />
                    <Text style={styles.changePasswordButtonText}>Update Password</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Logout Button */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut color="#EF4444" size={moderateScale(18)} />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>

          <Text style={styles.version}>Version 1.0.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    paddingVertical: moderateScale(12),
    paddingHorizontal: moderateScale(12),
    borderWidth: 2,
    borderColor: '#E2E8F0',
    marginHorizontal: moderateScale(8),
    marginTop: moderateScale(8),
    borderRadius: moderateScale(10),
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(10),
  },
  headerIconContainer: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(8),
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: moderateScale(16),
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: moderateScale(10),
    color: '#6B7280',
    marginTop: moderateScale(2),
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(8),
    gap: moderateScale(8),
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: moderateScale(14),
    paddingVertical: moderateScale(10),
    borderRadius: moderateScale(8),
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: moderateScale(6),
  },
  tabButtonActive: {
    backgroundColor: '#14B8A6',
    borderColor: '#14B8A6',
  },
  tabButtonText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#6B7280',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: moderateScale(8),
    paddingTop: moderateScale(16),
    paddingBottom: moderateScale(100), // Extra padding for bottom tab bar
  },
  alertError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: moderateScale(8),
    padding: moderateScale(10),
    marginBottom: moderateScale(10),
    gap: moderateScale(8),
  },
  alertErrorText: {
    flex: 1,
    fontSize: moderateScale(11),
    color: '#DC2626',
  },
  alertSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: moderateScale(8),
    padding: moderateScale(10),
    marginBottom: moderateScale(10),
    gap: moderateScale(8),
  },
  alertSuccessText: {
    flex: 1,
    fontSize: moderateScale(11),
    color: '#22C55E',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    padding: moderateScale(14),
    marginBottom: moderateScale(12),
    borderWidth: 2,
    borderColor: '#DBEAFE',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: moderateScale(14),
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
  },
  cardIconContainer: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(6),
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#1F2937',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14B8A6',
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(6),
    gap: moderateScale(4),
  },
  editButtonText: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editActions: {
    flexDirection: 'row',
    gap: moderateScale(8),
  },
  cancelButton: {
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(6),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: moderateScale(11),
    color: '#6B7280',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14B8A6',
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(6),
    gap: moderateScale(4),
  },
  saveButtonText: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: moderateScale(40),
  },
  loadingText: {
    marginTop: moderateScale(10),
    fontSize: moderateScale(12),
    color: '#6B7280',
  },
  inputGroup: {
    marginBottom: moderateScale(12),
  },
  inputLabel: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: '#374151',
    marginBottom: moderateScale(6),
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: moderateScale(6),
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(10),
    fontSize: moderateScale(12),
    color: '#1F2937',
  },
  inputWithIcon: {
    paddingRight: moderateScale(40),
  },
  inputRightIcon: {
    position: 'absolute',
    right: moderateScale(10),
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  inputDisabled: {
    backgroundColor: '#F9FAFB',
    color: '#6B7280',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  inputRow: {
    flexDirection: 'row',
    gap: moderateScale(10),
  },
  inputHalf: {
    flex: 1,
  },
  sectionDivider: {
    borderTopWidth: 2,
    borderTopColor: '#DBEAFE',
    paddingTop: moderateScale(14),
    marginTop: moderateScale(6),
    marginBottom: moderateScale(12),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
    marginBottom: moderateScale(10),
  },
  sectionTitle: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#1F2937',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: moderateScale(6),
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(10),
    fontSize: moderateScale(12),
    color: '#1F2937',
  },
  eyeButton: {
    padding: moderateScale(10),
  },
  passwordHint: {
    fontSize: moderateScale(10),
    color: '#9CA3AF',
    marginTop: moderateScale(4),
  },
  passwordHintError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
    marginTop: moderateScale(4),
  },
  passwordHintErrorText: {
    fontSize: moderateScale(10),
    color: '#EF4444',
  },
  passwordHintSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
    marginTop: moderateScale(4),
  },
  passwordHintSuccessText: {
    fontSize: moderateScale(10),
    color: '#22C55E',
  },
  changePasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14B8A6',
    paddingVertical: moderateScale(12),
    borderRadius: moderateScale(8),
    gap: moderateScale(8),
    marginTop: moderateScale(8),
  },
  changePasswordButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  changePasswordButtonText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: moderateScale(14),
    borderRadius: moderateScale(10),
    gap: moderateScale(8),
    marginTop: moderateScale(8),
  },
  logoutButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#EF4444',
  },
  version: {
    textAlign: 'center',
    fontSize: moderateScale(11),
    color: '#9CA3AF',
    marginTop: moderateScale(16),
    marginBottom: moderateScale(24),
  },
});
