import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase } from '../../services/supabase'
import { useAuthStore } from '../../store/useAuthStore'
import { colors, radius, spacing, typography } from '../../constants/theme'

interface SessionRecord {
  id: string
  session_code: string
  category_id: string
  status: string
  total_items: number
  counted_items: number
  start_time: string
  notes?: string | null
  categories?: { name: string } | null
  users?: { full_name: string; username: string } | null
}

interface ItemRecord {
  id: string
  session_id: string
  product_id: string
  system_stock: number
  physical_stock: number | null
  variance: number | null
  is_counted: boolean
  counted_at: string | null
  products: {
    id?: string
    barcode: string
    name: string
    shelf_location?: string | null
    system_stock?: number
  } | null
}

export default function ReviewScreen({ route, navigation }: any) {
  const { sessionId } = route.params || {}
  const { user } = useAuthStore()

  const [session, setSession] = useState<SessionRecord | null>(null)
  const [items, setItems] = useState<ItemRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [filterTab, setFilterTab] = useState<'all' | 'variance' | 'match' | 'uncounted'>('all')

  // Edit item count modal state
  const [selectedItemToEdit, setSelectedItemToEdit] = useState<ItemRecord | null>(null)
  const [editPhysicalValue, setEditPhysicalValue] = useState('0')
  const [submittingEdit, setSubmittingEdit] = useState(false)

  // 1. Fetch Session and Items
  const fetchData = useCallback(async () => {
    if (!sessionId) return
    try {
      setLoading(true)

      const { data: sessData, error: sessErr } = await supabase
        .from('so_sessions')
        .select('*, users(full_name, username), categories(name)')
        .eq('id', sessionId)
        .single()

      if (sessErr) throw sessErr
      setSession(sessData)

      const { data: itemsData, error: itemsErr } = await supabase
        .from('so_items')
        .select(`
          id,
          session_id,
          product_id,
          system_stock,
          physical_stock,
          variance,
          is_counted,
          counted_at,
          products:product_id (id, barcode, name, shelf_location, system_stock)
        `)
        .eq('session_id', sessionId)
        .order('is_counted', { ascending: false })

      if (itemsErr) throw itemsErr
      setItems((itemsData || []) as unknown as ItemRecord[])
    } catch (err: any) {
      console.error('Error fetching review data:', err)
      Alert.alert('Gagal Memuat Data', err.message || 'Tidak dapat memuat ringkasan sesi.')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 2. Open edit count modal
  const openEditModal = (item: ItemRecord) => {
    setSelectedItemToEdit(item)
    setEditPhysicalValue(String(item.physical_stock ?? item.system_stock ?? 0))
  }

  // 3. Save edited count
  const handleSaveEdit = async () => {
    if (!selectedItemToEdit || !sessionId) return
    const countNum = parseInt(editPhysicalValue, 10)
    if (isNaN(countNum) || countNum < 0) {
      Alert.alert('Input Tidak Valid', 'Masukkan angka stok fisik yang valid.')
      return
    }

    try {
      setSubmittingEdit(true)
      const systemStock = selectedItemToEdit.system_stock || 0
      const variance = countNum - systemStock
      const countedAt = new Date().toISOString()

      const { error } = await supabase
        .from('so_items')
        .update({
          physical_stock: countNum,
          variance,
          is_counted: true,
          counted_at: countedAt,
          counted_by: user?.id || null,
        })
        .eq('id', selectedItemToEdit.id)

      if (error) throw error

      const updatedItems = items.map((i) =>
        i.id === selectedItemToEdit.id
          ? {
              ...i,
              physical_stock: countNum,
              variance,
              is_counted: true,
              counted_at: countedAt,
            }
          : i
      )
      setItems(updatedItems)

      const newCounted = updatedItems.filter((i) => i.is_counted).length
      await supabase
        .from('so_sessions')
        .update({
          counted_items: newCounted,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)

      if (session) {
        setSession({ ...session, counted_items: newCounted })
      }

      setSelectedItemToEdit(null)
    } catch (err: any) {
      Alert.alert('Gagal Menyimpan', err.message || 'Terjadi kesalahan sistem.')
    } finally {
      setSubmittingEdit(false)
    }
  }

  // 4. Complete Session Action
  const handleCompleteSession = () => {
    const uncountedCount = items.filter((i) => !i.is_counted).length

    if (uncountedCount > 0) {
      Alert.alert(
        'Konfirmasi Penyelesaian',
        `Masih terdapat ${uncountedCount} item SKU yang belum dihitung fisik. Apakah Anda yakin ingin menyelesaikan sesi ini sekarang? Item yang belum dihitung akan ditandai belum selesai.`,
        [
          { text: 'Lanjut Hitung', style: 'cancel' },
          {
            text: 'Tetap Selesaikan',
            style: 'destructive',
            onPress: executeCompleteSession,
          },
        ]
      )
    } else {
      Alert.alert(
        'Konfirmasi Selesai',
        'Seluruh item telah dihitung. Apakah Anda ingin menyelesaikan dan menyinkronkan sesi ini ke Web Admin?',
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Ya, Selesaikan', onPress: executeCompleteSession },
        ]
      )
    }
  }

  const executeCompleteSession = async () => {
    if (!sessionId) return
    try {
      setCompleting(true)
      const endTime = new Date().toISOString()

      // Update session status in Supabase
      const { error: sessErr } = await supabase
        .from('so_sessions')
        .update({
          status: 'completed',
          end_time: endTime,
          updated_at: endTime,
        })
        .eq('id', sessionId)

      if (sessErr) throw sessErr

      // Log to audit_logs
      try {
        await supabase.from('audit_logs').insert({
          action: 'SESSION_COMPLETED',
          entity_type: 'SO_SESSION',
          entity_id: session?.session_code || sessionId,
          user_id: user?.id || null,
          after_value: {
            session_code: session?.session_code,
            category: session?.categories?.name,
            total_items: items.length,
            counted_items: items.filter((i) => i.is_counted).length,
            completed_by: user?.full_name,
            end_time: endTime,
          },
        })
      } catch {
        // Ignore audit log error
      }

      Alert.alert(
        'Sesi Selesai!',
        `Sesi Stock Opname ${session?.session_code || ''} berhasil diselesaikan. Laporan telah disinkronkan ke Web Admin.`,
        [
          {
            text: 'Kembali ke Beranda',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              })
            },
          },
        ]
      )
    } catch (err: any) {
      console.error('Error completing session:', err)
      Alert.alert('Gagal Menyelesaikan Sesi', err.message || 'Terjadi kesalahan sistem.')
    } finally {
      setCompleting(false)
    }
  }

  // Summary statistics
  const totalItems = items.length
  const countedItems = items.filter((i) => i.is_counted)
  const countedCount = countedItems.length
  const uncountedCount = totalItems - countedCount
  const matchedCount = countedItems.filter((i) => i.variance === 0).length
  const surplusCount = countedItems.filter((i) => (i.variance ?? 0) > 0).length
  const deficitCount = countedItems.filter((i) => (i.variance ?? 0) < 0).length
  const varianceCount = surplusCount + deficitCount
  const accuracyRate = countedCount > 0 ? Math.round((matchedCount / countedCount) * 100) : 100

  // Filtered items list
  const filteredItems = items.filter((item) => {
    if (filterTab === 'variance') return item.is_counted && (item.variance ?? 0) !== 0
    if (filterTab === 'match') return item.is_counted && item.variance === 0
    if (filterTab === 'uncounted') return !item.is_counted
    return true
  })

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Tinjau Hasil Stock Opname</Text>
          <Text style={styles.headerSubtitle}>
            {session?.session_code || 'Sesi SO'} • {session?.categories?.name || 'Kategori'}
          </Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Memuat ringkasan audit fisik...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.scrollContent}
          ListHeaderComponent={
            <View style={styles.summaryWrap}>
              {/* Main Summary Metric Card */}
              <View style={styles.mainStatsCard}>
                <View style={styles.mainStatsTop}>
                  <View>
                    <Text style={styles.mainStatsLabel}>TINGKAT AKURASI FISIK</Text>
                    <Text style={styles.mainStatsVal}>{accuracyRate}%</Text>
                  </View>
                  <View
                    style={[
                      styles.accuracyIconCircle,
                      accuracyRate === 100 ? styles.accPerfect : styles.accWarning,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={accuracyRate === 100 ? 'shield-check' : 'alert-circle'}
                      size={28}
                      color={accuracyRate === 100 ? colors.success : colors.warning}
                    />
                  </View>
                </View>

                {/* Micro Metric Grid */}
                <View style={styles.microStatsGrid}>
                  <View style={styles.microStatCol}>
                    <Text style={styles.microVal}>{totalItems}</Text>
                    <Text style={styles.microLabel}>Total SKU</Text>
                  </View>
                  <View style={styles.microStatCol}>
                    <Text style={[styles.microVal, { color: colors.primary }]}>{countedCount}</Text>
                    <Text style={styles.microLabel}>Dihitung</Text>
                  </View>
                  <View style={styles.microStatCol}>
                    <Text style={[styles.microVal, { color: colors.success }]}>{matchedCount}</Text>
                    <Text style={styles.microLabel}>Cocok</Text>
                  </View>
                  <View style={styles.microStatCol}>
                    <Text
                      style={[
                        styles.microVal,
                        { color: varianceCount > 0 ? colors.danger : colors.textMuted },
                      ]}
                    >
                      {varianceCount}
                    </Text>
                    <Text style={styles.microLabel}>Selisih</Text>
                  </View>
                </View>
              </View>

              {/* Breakdown Surplus / Defisit Row */}
              <View style={styles.breakdownRow}>
                <View style={[styles.breakdownBox, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                  <Text style={[styles.breakdownLabel, { color: '#1E40AF' }]}>Surplus (+)</Text>
                  <Text style={[styles.breakdownVal, { color: '#1D4ED8' }]}>{surplusCount} SKU</Text>
                </View>

                <View style={[styles.breakdownBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                  <Text style={[styles.breakdownLabel, { color: '#991B1B' }]}>Defisit (-)</Text>
                  <Text style={[styles.breakdownVal, { color: '#B91C1C' }]}>{deficitCount} SKU</Text>
                </View>

                <View style={[styles.breakdownBox, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
                  <Text style={styles.breakdownLabel}>Belum Scan</Text>
                  <Text style={[styles.breakdownVal, { color: colors.textSecondary }]}>
                    {uncountedCount} SKU
                  </Text>
                </View>
              </View>

              {/* Filter Tabs */}
              <View style={styles.filterTabsRow}>
                <TouchableOpacity
                  style={[styles.filterTab, filterTab === 'all' && styles.filterTabActive]}
                  onPress={() => setFilterTab('all')}
                >
                  <Text style={[styles.filterTabText, filterTab === 'all' && styles.filterTabTextActive]}>
                    Semua ({totalItems})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterTab, filterTab === 'variance' && styles.filterTabActive]}
                  onPress={() => setFilterTab('variance')}
                >
                  <Text
                    style={[
                      styles.filterTabText,
                      filterTab === 'variance' && styles.filterTabTextActive,
                    ]}
                  >
                    Selisih ({varianceCount})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterTab, filterTab === 'match' && styles.filterTabActive]}
                  onPress={() => setFilterTab('match')}
                >
                  <Text style={[styles.filterTabText, filterTab === 'match' && styles.filterTabTextActive]}>
                    Cocok ({matchedCount})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterTab, filterTab === 'uncounted' && styles.filterTabActive]}
                  onPress={() => setFilterTab('uncounted')}
                >
                  <Text
                    style={[
                      styles.filterTabText,
                      filterTab === 'uncounted' && styles.filterTabTextActive,
                    ]}
                  >
                    Belum ({uncountedCount})
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.listSectionTitle}>
                RINCIAN ITEM ({filteredItems.length}) • KETUK UNTUK KOREKSI
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isCounted = item.is_counted
            const variance = item.variance ?? 0
            return (
              <TouchableOpacity
                style={styles.reviewItemCard}
                onPress={() => openEditModal(item)}
                activeOpacity={0.7}
              >
                <View style={styles.reviewItemTop}>
                  <View style={styles.barcodePill}>
                    <Text style={styles.barcodePillText}>{item.products?.barcode || '-'}</Text>
                  </View>

                  {isCounted ? (
                    <View
                      style={[
                        styles.reviewBadge,
                        variance === 0
                          ? styles.badgeMatch
                          : variance > 0
                          ? styles.badgeSurplus
                          : styles.badgeDeficit,
                      ]}
                    >
                      <Text
                        style={[
                          styles.reviewBadgeText,
                          variance === 0
                            ? styles.textMatch
                            : variance > 0
                            ? styles.textSurplus
                            : styles.textDeficit,
                        ]}
                      >
                        {variance === 0
                          ? 'Cocok (0 pcs)'
                          : variance > 0
                          ? `+${variance} pcs (Surplus)`
                          : `${variance} pcs (Defisit)`}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.badgePending}>
                      <Text style={styles.badgePendingText}>Belum Dihitung</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.reviewItemName}>{item.products?.name || 'Produk'}</Text>
                <Text style={styles.reviewItemShelf}>
                  Lokasi: Rak {item.products?.shelf_location || '-'}
                </Text>

                <View style={styles.reviewStockRow}>
                  <View style={styles.stockPair}>
                    <Text style={styles.stockPairLabel}>Stok Sistem:</Text>
                    <Text style={styles.stockPairSysVal}>{item.system_stock} pcs</Text>
                  </View>

                  <Feather name="arrow-right" size={14} color={colors.textLight} />

                  <View style={styles.stockPair}>
                    <Text style={styles.stockPairLabel}>Stok Fisik:</Text>
                    <Text
                      style={[
                        styles.stockPairPhysVal,
                        isCounted ? { color: colors.primary } : { color: colors.textLight },
                      ]}
                    >
                      {isCounted ? `${item.physical_stock} pcs` : 'Belum dihitung'}
                    </Text>
                  </View>

                  <Feather name="edit-2" size={14} color={colors.primary} style={{ marginLeft: 'auto' }} />
                </View>
              </TouchableOpacity>
            )
          }}
          ListEmptyComponent={
            <View style={styles.emptyList}>
              <Feather name="check-circle" size={36} color={colors.success} />
              <Text style={styles.emptyListTitle}>Tidak Ada Item Dalam Filter Ini</Text>
            </View>
          }
        />
      )}

      {/* Bottom Action Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backToScanBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="camera" size={16} color={colors.textPrimary} />
          <Text style={styles.backToScanText}>Lanjut Scan</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.completeBtn, completing && styles.btnDisabled]}
          onPress={handleCompleteSession}
          disabled={completing}
          activeOpacity={0.85}
        >
          {completing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Feather name="check" size={18} color="#FFFFFF" />
              <Text style={styles.completeBtnText}>Selesaikan Sesi</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Edit Item Modal */}
      {selectedItemToEdit && (
        <Modal
          visible={!!selectedItemToEdit}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedItemToEdit(null)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>Koreksi Stok Fisik</Text>
                  <Text style={styles.modalSub}>{selectedItemToEdit.products?.name}</Text>
                  <Text style={styles.modalBarcode}>
                    Barcode: {selectedItemToEdit.products?.barcode}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedItemToEdit(null)}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.editStockBox}>
                <Text style={styles.editStockLabel}>STOK SISTEM: {selectedItemToEdit.system_stock} PCS</Text>
                <TextInput
                  style={styles.editStockInput}
                  value={editPhysicalValue}
                  onChangeText={setEditPhysicalValue}
                  keyboardType="numeric"
                  autoFocus
                  selectTextOnFocus
                />
              </View>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setSelectedItemToEdit(null)}
                >
                  <Text style={styles.modalCancelText}>Batal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSaveBtn, submittingEdit && styles.btnDisabled]}
                  onPress={handleSaveEdit}
                  disabled={submittingEdit}
                >
                  {submittingEdit ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.modalSaveText}>Perbarui Hitungan</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.heavy,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  summaryWrap: {
    marginBottom: spacing.md,
  },
  mainStatsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  mainStatsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
  },
  mainStatsLabel: {
    fontSize: 10,
    fontWeight: typography.weights.heavy,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  mainStatsVal: {
    fontSize: 34,
    fontWeight: typography.weights.black,
    color: colors.textPrimary,
    letterSpacing: -1,
  },
  accuracyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accPerfect: {
    backgroundColor: '#ECFDF5',
  },
  accWarning: {
    backgroundColor: '#FFFBEB',
  },
  microStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  microStatCol: {
    alignItems: 'center',
  },
  microVal: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.black,
    color: colors.textPrimary,
  },
  microLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  breakdownBox: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 10,
    fontWeight: typography.weights.semibold,
    color: colors.textMuted,
  },
  breakdownVal: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.heavy,
    marginTop: 2,
  },
  filterTabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: spacing.md,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.xs + 2,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
  },
  listSectionTitle: {
    fontSize: 10,
    fontWeight: typography.weights.heavy,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  reviewItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  reviewItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  barcodePill: {
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  barcodePillText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: colors.textMuted,
  },
  reviewBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
    borderWidth: 1,
  },
  reviewBadgeText: {
    fontSize: 10,
    fontWeight: typography.weights.heavy,
  },
  badgeMatch: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  badgeSurplus: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  badgeDeficit: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  badgePending: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
  },
  badgePendingText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: typography.weights.bold,
  },
  textMatch: {
    color: '#059669',
  },
  textSurplus: {
    color: '#2563EB',
  },
  textDeficit: {
    color: '#DC2626',
  },
  reviewItemName: {
    fontSize: typography.sizes.sm + 1,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  reviewItemShelf: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  reviewStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F8FAFC',
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
  },
  stockPair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stockPairLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  stockPairSysVal: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  stockPairPhysVal: {
    fontSize: 11,
    fontWeight: typography.weights.heavy,
  },
  emptyList: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyListTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  backToScanBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  backToScanText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  completeBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  completeBtnText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.heavy,
    color: colors.textPrimary,
  },
  modalSub: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalBarcode: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 1,
  },
  editStockBox: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  editStockLabel: {
    fontSize: 10,
    fontWeight: typography.weights.heavy,
    color: colors.textMuted,
    marginBottom: 6,
  },
  editStockInput: {
    width: 140,
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: typography.weights.black,
    color: colors.textPrimary,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  modalSaveBtn: {
    flex: 2,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
})

