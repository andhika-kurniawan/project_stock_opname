import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { useAuthStore } from '../../store/useAuthStore'
import { authService } from '../../services/auth'
import { colors, radius, spacing, typography } from '../../constants/theme'
import type { User } from '../../types'

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [staffList, setStaffList] = useState<User[]>([])
  const [loadingStaff, setLoadingStaff] = useState(false)
  const passwordInputRef = useRef<any>(null)

  const { login, isLoading, error, clearError } = useAuthStore()

  useEffect(() => {
    async function loadStaff() {
      try {
        setLoadingStaff(true)
        const staff = await authService.getStaffList()
        setStaffList(staff)
      } catch {
        // Non-blocking
      } finally {
        setLoadingStaff(false)
      }
    }
    loadStaff()
  }, [])

  const handleLogin = async () => {
    if (!identifier.trim()) return
    if (!password.trim()) {
      useAuthStore.setState({ error: 'Silakan masukkan kata sandi Anda.' })
      passwordInputRef.current?.focus()
      return
    }
    try {
      await login({ identifier: identifier.trim(), password })
    } catch {
      // Handled in store
    }
  }

  const handleSelectQuickStaff = (staff: User) => {
    setIdentifier(staff.username || staff.email)
    clearError()
    setTimeout(() => {
      passwordInputRef.current?.focus()
    }, 150)
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Brand Banner */}
          <View style={styles.heroContainer}>
            <View style={styles.badgeRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.badgeText}>Stockify Retail Hub • Mode Mobile</Text>
            </View>

            <View style={styles.logoRow}>
              <View style={styles.logoBox}>
                <MaterialCommunityIcons name="barcode-scan" size={28} color="#FFFFFF" />
              </View>
              <View>
                <View style={styles.titleWrap}>
                  <Text style={styles.appName}>Stockify</Text>
                  <Text style={styles.appDot}>.</Text>
                </View>
                <Text style={styles.appSubtitle}>FIELD STOCK OPNAME</Text>
              </View>
            </View>

            <Text style={styles.heroDescription}>
              Aplikasi pemindaian barcode & pencatatan fisik inventaris ritel real-time.
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Masuk Petugas Lapangan</Text>
            <Text style={styles.cardSubtitle}>
              Gunakan akun petugas SO atau pilih akun cepat di bawah
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Field: Username / Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username atau Email Petugas</Text>
              <View style={styles.inputWrap}>
                <Feather name="user" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: rizky.so atau nama@stockify.ops"
                  placeholderTextColor={colors.textLight}
                  value={identifier}
                  onChangeText={(text) => {
                    setIdentifier(text)
                    if (error) clearError()
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {identifier ? (
                  <TouchableOpacity onPress={() => setIdentifier('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={18} color={colors.textLight} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Field: Password */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Kata Sandi</Text>
                <Text style={styles.subtext}>Wajib diisi</Text>
              </View>
              <View style={styles.inputWrap}>
                <Feather name="lock" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  ref={passwordInputRef}
                  style={styles.input}
                  placeholder="Masukkan kata sandi akun"
                  placeholderTextColor={colors.textLight}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text)
                    if (error) clearError()
                  }}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, (!identifier.trim() || !password.trim() || isLoading) && styles.submitButtonDisabled]}
              onPress={handleLogin}
              disabled={!identifier.trim() || !password.trim() || isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Mulai Bertugas</Text>
                  <Feather name="arrow-right" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            {/* Quick Staff Selector */}
            <View style={styles.quickStaffSection}>
              <Text style={styles.quickStaffTitle}>PILIH AKUN PETUGAS TERDAFTAR</Text>
              
              {loadingStaff ? (
                <View style={styles.staffLoading}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.staffLoadingText}>Memuat daftar petugas...</Text>
                </View>
              ) : (
                <View style={styles.staffChipsContainer}>
                  {staffList.map((staff) => {
                    const isSelected = identifier.toLowerCase() === (staff.username || '').toLowerCase()
                    return (
                      <TouchableOpacity
                        key={staff.id}
                        style={[styles.staffChip, isSelected && styles.staffChipActive]}
                        onPress={() => handleSelectQuickStaff(staff)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.staffAvatar, isSelected && styles.staffAvatarActive]}>
                          <Text style={[styles.staffAvatarText, isSelected && styles.staffAvatarTextActive]}>
                            {staff.full_name?.charAt(0) || 'P'}
                          </Text>
                        </View>
                        <View style={styles.staffInfo}>
                          <Text style={[styles.staffName, isSelected && styles.staffNameActive]}>
                            {staff.full_name}
                          </Text>
                          <Text style={styles.staffRole}>
                            {staff.role === 'admin' ? 'Admin' : 'Petugas SO'} • @{staff.username}
                          </Text>
                        </View>
                        {isSelected ? (
                          <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                        ) : null}
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )}
            </View>
          </View>

          {/* Footer Security Note */}
          <View style={styles.footerNote}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.textLight} />
            <Text style={styles.footerNoteText}>
              Terhubung dengan Supabase PostgreSQL & Sinkronisasi Offline
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#D93B09',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  heroContainer: {
    backgroundColor: '#FF4D15',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginBottom: spacing.md,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
    marginRight: spacing.xs,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  appName: {
    fontSize: 26,
    fontWeight: typography.weights.black,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  appDot: {
    fontSize: 26,
    fontWeight: typography.weights.black,
    color: '#FEF08A',
  },
  appSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    fontWeight: typography.weights.heavy,
    letterSpacing: 1.5,
  },
  heroDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: typography.sizes.sm,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  card: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.lg,
    marginTop: -spacing.xl,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.lg,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  errorText: {
    color: colors.danger,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    flex: 1,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtext: {
    fontSize: 10,
    color: colors.textLight,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
  },
  submitButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
  },
  quickStaffSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  quickStaffTitle: {
    fontSize: 10,
    fontWeight: typography.weights.heavy,
    color: colors.textLight,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  staffLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  staffLoadingText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  staffChipsContainer: {
    gap: spacing.sm,
  },
  staffChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  staffChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryBorder,
  },
  staffAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffAvatarActive: {
    backgroundColor: colors.primary,
  },
  staffAvatarText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  staffAvatarTextActive: {
    color: '#FFFFFF',
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: typography.sizes.xs + 1,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  staffNameActive: {
    color: colors.primaryDark,
  },
  staffRole: {
    fontSize: 11,
    color: colors.textMuted,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  footerNoteText: {
    fontSize: 11,
    color: colors.textLight,
    textAlign: 'center',
  },
})
