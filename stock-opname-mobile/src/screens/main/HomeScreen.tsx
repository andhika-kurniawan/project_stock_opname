import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { useAuthStore } from '../../store/useAuthStore'
import { supabase } from '../../services/supabase'
import { colors, radius, spacing, typography } from '../../constants/theme'
import type { Category, SessionWithRelations } from '../../types'

export default function HomeScreen({ navigation }: any) {
  const { user, logout } = useAuthStore()
  const [activeSessions, setActiveSessions] = useState<SessionWithRelations[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [startingSession, setStartingSession] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      // 1. Fetch categories
      const { data: cats } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true })

      if (cats && cats.length > 0) {
        setCategories(cats)
        if (!selectedCategoryId) {
          setSelectedCategoryId(cats[0].id)
        }
      }

      // 2. Fetch active sessions
      const { data: sessions } = await supabase
        .from('so_sessions')
        .select('*, users(full_name, username), categories(name)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      setActiveSessions((sessions || []) as SessionWithRelations[])
    } catch (err) {
      console.error('Error fetching home data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedCategoryId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const onRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  const handleStartNewSession = async () => {
    if (!selectedCategoryId || !user) return

    try {
      setStartingSession(true)

      // Generate session code
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const randPart = Math.floor(1000 + Math.random() * 9000)
      const sessionCode = `SO-${datePart}-${randPart}`

      // Count products in this category
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', selectedCategoryId)

      // Create session
      const { data: newSession, error: createError } = await supabase
        .from('so_sessions')
        .insert({
          session_code: sessionCode,
          category_id: selectedCategoryId,
          user_id: user.id,
          status: 'active',
          start_time: new Date().toISOString(),
          total_items: count || 0,
          counted_items: 0,
          notes: `Sesi dibuat via Mobile App oleh ${user.full_name}`
        })
        .select('*, users(full_name, username), categories(name)')
        .single()

      if (createError) throw createError

      // Fetch products to populate so_items
      const { data: products } = await supabase
        .from('products')
        .select('id, system_stock')
        .eq('category_id', selectedCategoryId)

      if (products && products.length > 0) {
        const soItemsToInsert = products.map(p => ({
          session_id: newSession.id,
          product_id: p.id,
          system_stock: p.system_stock,
          physical_stock: null,
          variance: null,
          is_counted: false
        }))

        await supabase.from('so_items').insert(soItemsToInsert)
      }

      await fetchData()

      // Navigate to scanner (for next phase)
      if (navigation?.navigate) {
        navigation.navigate('Scanner', { 
          sessionId: newSession.id,
          categoryName: newSession.categories?.name
        })
      }
    } catch (err: any) {
      alert(`Gagal membuat sesi baru: ${err.message}`)
    } finally {
      setStartingSession(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* App Header */}
      <View style={styles.header}>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.full_name?.charAt(0) || 'P'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <View style={styles.roleTag}>
              <View style={styles.onlineBadge} />
              <Text style={styles.roleText}>{user?.role === 'admin' ? 'Manager Ops' : 'Petugas SO'}</Text>
            </View>
            <Text style={styles.userName} numberOfLines={1}>{user?.full_name}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.logoutBtn} 
          onPress={logout}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="log-out" size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Shift Summary Card */}
        <View style={styles.shiftCard}>
          <View style={styles.shiftCardHeader}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={20} color={colors.primary} />
            <Text style={styles.shiftCardTitle}>RINGKASAN TUGAS HARI INI</Text>
          </View>
          <View style={styles.shiftStatsRow}>
            <View style={styles.shiftStatItem}>
              <Text style={styles.shiftStatValue}>{activeSessions.length}</Text>
              <Text style={styles.shiftStatLabel}>Sesi Berjalan</Text>
            </View>
            <View style={styles.shiftStatDivider} />
            <View style={styles.shiftStatItem}>
              <Text style={styles.shiftStatValue}>{categories.length}</Text>
              <Text style={styles.shiftStatLabel}>Kategori Master</Text>
            </View>
            <View style={styles.shiftStatDivider} />
            <View style={styles.shiftStatItem}>
              <Text style={[styles.shiftStatValue, { color: colors.success }]}>Online</Text>
              <Text style={styles.shiftStatLabel}>Status Sync</Text>
            </View>
          </View>
        </View>

        {/* Section: Sesi Berjalan */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Sesi Stock Opname Aktif</Text>
          <Text style={styles.sectionBadge}>{activeSessions.length} Berjalan</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Memeriksa sesi aktif...</Text>
          </View>
        ) : activeSessions.length === 0 ? (
          <View style={styles.emptySessionCard}>
            <Feather name="inbox" size={32} color={colors.textLight} />
            <Text style={styles.emptyTitle}>Belum Ada Sesi Aktif</Text>
            <Text style={styles.emptySubtitle}>
              Pilih kategori di bawah dan mulai sesi stock opname baru untuk shift Anda.
            </Text>
          </View>
        ) : (
          activeSessions.map((session) => {
            const pct = session.total_items > 0
              ? Math.round((session.counted_items / session.total_items) * 100)
              : 0
            const isUnassigned = !session.user_id || !session.users?.full_name || session.notes?.includes('[Petugas: Terbuka/Belum Ditugaskan]')
            const officerDisplay = isUnassigned ? 'Terbuka (Semua Petugas)' : session.users?.full_name
            return (
              <View key={session.id} style={styles.sessionCard}>
                <View style={styles.sessionCardTop}>
                  <View style={styles.sessionCodePill}>
                    <Text style={styles.sessionCodeText}>{session.session_code}</Text>
                  </View>
                  <View style={styles.liveBadge}>
                    <View style={styles.pulseDot} />
                    <Text style={styles.liveText}>BERJALAN</Text>
                  </View>
                </View>

                <Text style={styles.sessionCategory}>{session.categories?.name || 'Semua Kategori'}</Text>
                
                {/* Petugas Info Row */}
                <View style={styles.officerMetaRow}>
                  <Feather 
                    name={isUnassigned ? "users" : "user"} 
                    size={13} 
                    color={isUnassigned ? "#D97706" : colors.textMuted} 
                  />
                  <Text style={[styles.officerMetaText, isUnassigned && styles.officerMetaTextUnassigned]}>
                    {officerDisplay}
                  </Text>
                  {isUnassigned && (
                    <View style={styles.openBadge}>
                      <Text style={styles.openBadgeText}>SIAP DIHITUNG</Text>
                    </View>
                  )}
                </View>

                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>Kemajuan Penghitungan</Text>
                  <Text style={styles.progressValue}>{session.counted_items} / {session.total_items} SKU ({pct}%)</Text>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
                </View>

                {/* Action Button */}
                <TouchableOpacity
                  style={styles.continueScanButton}
                  onPress={() => {
                    if (navigation?.navigate) {
                      navigation.navigate('Scanner', { 
                        sessionId: session.id,
                        categoryName: session.categories?.name
                      })
                    }
                  }}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons name="barcode-scan" size={18} color="#FFFFFF" />
                  <Text style={styles.continueScanText}>
                    {isUnassigned ? 'Mulai Kerjakan Pemindaian' : 'Lanjutkan Pemindaian Barcode'}
                  </Text>
                  <Feather name="arrow-right" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )
          })
        )}

        {/* Section: Buat Sesi Baru */}
        <View style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
          <Text style={styles.sectionTitle}>Mulai Sesi Kategori Baru</Text>
        </View>

        <View style={styles.createCard}>
          <Text style={styles.selectLabel}>PILIH KATEGORI PRODUK UNTUK DIHITUNG</Text>
          
          <View style={styles.categoryPillsWrap}>
            {categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                  onPress={() => setSelectedCategoryId(cat.id)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons 
                    name={isSelected ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} 
                    size={16} 
                    color={isSelected ? colors.primary : colors.textLight} 
                  />
                  <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <TouchableOpacity
            style={[styles.startSessionButton, startingSession && styles.buttonDisabled]}
            onPress={handleStartNewSession}
            disabled={startingSession || !selectedCategoryId}
            activeOpacity={0.85}
          >
            {startingSession ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Feather name="plus-circle" size={18} color="#FFFFFF" />
                <Text style={styles.startSessionText}>Buka Sesi SO Kategori Ini</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.card,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineBadge: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  roleText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  userName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  shiftCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  shiftCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  shiftCardTitle: {
    fontSize: 10,
    fontWeight: typography.weights.heavy,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  shiftStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shiftStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  shiftStatValue: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.black,
    color: colors.textPrimary,
  },
  shiftStatLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  shiftStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.divider,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  sectionBadge: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  emptySessionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  sessionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sessionCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sessionCodePill: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  sessionCodeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: colors.textSecondary,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  liveText: {
    fontSize: 10,
    fontWeight: typography.weights.heavy,
    color: colors.success,
  },
  sessionCategory: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.black,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  officerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
  },
  officerMetaText: {
    fontSize: 12,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  officerMetaTextUnassigned: {
    color: '#D97706',
    fontWeight: typography.weights.bold,
  },
  openBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  openBadgeText: {
    fontSize: 9,
    fontWeight: typography.weights.heavy,
    color: '#92400E',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  progressValue: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  continueScanButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  continueScanText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs + 1,
    fontWeight: typography.weights.bold,
  },
  createCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectLabel: {
    fontSize: 10,
    fontWeight: typography.weights.heavy,
    color: colors.textLight,
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  categoryPillsWrap: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryBorder,
  },
  categoryPillText: {
    fontSize: typography.sizes.xs + 1,
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  categoryPillTextActive: {
    color: colors.primaryDark,
    fontWeight: typography.weights.bold,
  },
  startSessionButton: {
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  startSessionText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs + 1,
    fontWeight: typography.weights.bold,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
})
