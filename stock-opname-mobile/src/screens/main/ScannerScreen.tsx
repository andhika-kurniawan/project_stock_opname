import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
  Vibration,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera'
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase } from '../../services/supabase'
import { useAuthStore } from '../../store/useAuthStore'
import { colors, radius, spacing, typography } from '../../constants/theme'
import type { SOItemWithRelations } from '../../types'

interface SessionInfo {
  id: string
  session_code: string
  category_id: string
  user_id: string | null
  status: string
  total_items: number
  counted_items: number
  notes: string | null
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
  shelf_location?: string | null
  products: {
    id?: string
    barcode: string
    name: string
    shelf_location?: string | null
    system_stock?: number
  } | null
}

export default function ScannerScreen({ route, navigation }: any) {
  const { sessionId, categoryName } = route.params || {}
  const { user } = useAuthStore()

  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions()
  const [torchEnabled, setTorchEnabled] = useState(false)
  const [facing, setFacing] = useState<'back' | 'front'>('back')
  const [isScanningPaused, setIsScanningPaused] = useState(false)

  // Session & Items Data
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [items, setItems] = useState<ItemRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'camera' | 'list'>('camera')
  const [filterTab, setFilterTab] = useState<'all' | 'uncounted' | 'counted'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal Input Stok Fisik State
  const [selectedItem, setSelectedItem] = useState<ItemRecord | null>(null)
  const [physicalInput, setPhysicalInput] = useState<string>('0')
  const [submittingCount, setSubmittingCount] = useState(false)

  // Modal Manual Barcode Input State
  const [manualBarcodeModal, setManualBarcodeModal] = useState(false)
  const [manualBarcodeInput, setManualBarcodeInput] = useState('')

  // Cooldown ref to prevent duplicate triggers from continuous barcode detection
  const scanCooldownRef = useRef(false)

  // 1. Fetch Session & Items from Supabase
  const loadSessionData = useCallback(async () => {
    if (!sessionId) return
    try {
      setLoading(true)

      // Fetch session info
      const { data: sessData, error: sessError } = await supabase
        .from('so_sessions')
        .select('*, users(full_name, username), categories(name)')
        .eq('id', sessionId)
        .single()

      if (sessError) throw sessError
      setSession(sessData)

      // If session is open/unassigned, assign it to the current officer
      if (user?.id && (!sessData.user_id || sessData.notes?.includes('[Petugas: Terbuka/Belum Ditugaskan]'))) {
        const cleanedNotes = sessData.notes
          ? sessData.notes.replace('[Petugas: Terbuka/Belum Ditugaskan]', '').trim()
          : `Sesi dikerjakan oleh ${user.full_name}`

        await supabase
          .from('so_sessions')
          .update({
            user_id: user.id,
            notes: cleanedNotes || `Dikerjakan oleh ${user.full_name}`
          })
          .eq('id', sessionId)
      }

      // Fetch so_items for this session
      const { data: itemsData, error: itemsError } = await supabase
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
        .order('is_counted', { ascending: true })

      if (itemsError) throw itemsError

      let finalItemsData = itemsData || []

      // Self-healing: if session has 0 so_items in Supabase, auto-populate from category products
      if (finalItemsData.length === 0 && sessData.category_id) {
        const { data: catProds } = await supabase
          .from('products')
          .select('id, system_stock')
          .eq('category_id', sessData.category_id)

        if (catProds && catProds.length > 0) {
          const soItemsToInsert = catProds.map((p) => ({
            session_id: sessionId,
            product_id: p.id,
            system_stock: p.system_stock,
            physical_stock: null,
            is_counted: false,
          }))

          await supabase.from('so_items').insert(soItemsToInsert)
          await supabase.from('so_sessions').update({ total_items: catProds.length }).eq('id', sessionId)

          const { data: refetched } = await supabase
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
            .order('is_counted', { ascending: true })

          if (refetched && refetched.length > 0) {
            finalItemsData = refetched
          }
        }
      }

      setItems((finalItemsData || []) as unknown as ItemRecord[])
    } catch (err: any) {
      console.error('Error loading session:', err)
      Alert.alert('Gagal Memuat Data', err.message || 'Tidak dapat memuat detail sesi.')
    } finally {
      setLoading(false)
    }
  }, [sessionId, user])

  useEffect(() => {
    loadSessionData()
  }, [loadSessionData])

  // 2. Open Physical Count Modal for an Item
  const openCountModalForItem = useCallback((item: ItemRecord) => {
    setIsScanningPaused(true)
    setSelectedItem(item)
    // If already counted, prefill with previous count; otherwise prefill with empty or 0
    if (item.is_counted && item.physical_stock !== null) {
      setPhysicalInput(String(item.physical_stock))
    } else {
      setPhysicalInput(String(item.system_stock || 0))
    }
  }, [])

  // 3. Handle Barcode Scanned Event from CameraView
  const handleBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (isScanningPaused || scanCooldownRef.current || !result.data) {
        return
      }

      const scannedCode = result.data.trim()
      scanCooldownRef.current = true

      // Haptic/vibration feedback
      try {
        Vibration.vibrate(80)
      } catch {
        // Ignore vibration error on some devices
      }

      // Find item in session's product list
      const matched = items.find(
        (i) =>
          i.products?.barcode?.toLowerCase() === scannedCode.toLowerCase() ||
          i.product_id === scannedCode
      )

      if (matched) {
        openCountModalForItem(matched)
      } else {
        setIsScanningPaused(true)
        Alert.alert(
          'Barcode Tidak Dikenal',
          `Barcode "${scannedCode}" tidak terdaftar dalam kategori sesi ini. Pastikan produk sesuai dengan kategori "${categoryName || session?.categories?.name || 'sesi'}".`,
          [
            {
              text: 'Scan Ulang',
              onPress: () => {
                setIsScanningPaused(false)
                scanCooldownRef.current = false
              },
            },
            {
              text: 'Input Manual',
              onPress: () => {
                setIsScanningPaused(false)
                scanCooldownRef.current = false
                setActiveTab('list')
              },
            },
          ]
        )
      }

      // Release cooldown after 1.5 seconds if modal wasn't opened
      setTimeout(() => {
        scanCooldownRef.current = false
      }, 1500)
    },
    [isScanningPaused, items, categoryName, session, openCountModalForItem]
  )

  // 4. Save Physical Stock Count to Supabase
  const handleSavePhysicalCount = async () => {
    if (!selectedItem || !sessionId) return

    const countNum = parseInt(physicalInput, 10)
    if (isNaN(countNum) || countNum < 0) {
      Alert.alert('Input Tidak Valid', 'Masukkan jumlah stok fisik yang valid (angka minimal 0).')
      return
    }

    try {
      setSubmittingCount(true)
      const systemStock = selectedItem.system_stock || 0
      const variance = countNum - systemStock
      const countedAt = new Date().toISOString()

      // Update so_items in Supabase (variance is a generated column calculated automatically by Postgres)
      const { error: itemUpdateErr } = await supabase
        .from('so_items')
        .update({
          physical_stock: countNum,
          is_counted: true,
          counted_at: countedAt,
          counted_by: user?.id || null,
        })
        .eq('id', selectedItem.id)

      if (itemUpdateErr) throw itemUpdateErr

      // Update local items state
      const updatedItems = items.map((i) =>
        i.id === selectedItem.id
          ? {
              ...i,
              physical_stock: countNum,
              variance: variance,
              is_counted: true,
              counted_at: countedAt,
            }
          : i
      )
      setItems(updatedItems)

      // Calculate new counted count and update session in Supabase
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

      // Close modal & resume scanner
      setSelectedItem(null)
      setIsScanningPaused(false)
      scanCooldownRef.current = false
    } catch (err: any) {
      console.error('Error saving item count:', err)
      Alert.alert('Gagal Menyimpan', err.message || 'Terjadi kesalahan saat menyimpan stok fisik.')
    } finally {
      setSubmittingCount(false)
    }
  }

  // 5. Handle Manual Search from Barcode Input Dialog
  const handleSearchManualBarcode = () => {
    const query = manualBarcodeInput.trim().toLowerCase()
    if (!query) return

    const matched = items.find(
      (i) =>
        i.products?.barcode?.toLowerCase() === query ||
        i.products?.name?.toLowerCase().includes(query)
    )

    setManualBarcodeModal(false)
    setManualBarcodeInput('')

    if (matched) {
      openCountModalForItem(matched)
    } else {
      Alert.alert(
        'Produk Tidak Ditemukan',
        `Tidak ada produk dengan barcode atau nama "${query}" di sesi kategori ini.`
      )
    }
  }

  // Quick adjust helper for physical stock input
  const adjustInput = (delta: number) => {
    const cur = parseInt(physicalInput || '0', 10)
    const next = Math.max(0, (isNaN(cur) ? 0 : cur) + delta)
    setPhysicalInput(String(next))
  }

  // Filtered items for list view
  const filteredItems = items.filter((item) => {
    const nameMatch =
      item.products?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.products?.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.products?.shelf_location?.toLowerCase().includes(searchQuery.toLowerCase())

    if (!nameMatch) return false

    if (filterTab === 'counted') return item.is_counted
    if (filterTab === 'uncounted') return !item.is_counted
    return true
  })

  // Progress stats
  const totalCount = items.length
  const countedCount = items.filter((i) => i.is_counted).length
  const progressPct = totalCount > 0 ? Math.round((countedCount / totalCount) * 100) : 0

  // Calculate live variance for modal
  const modalSystemStock = selectedItem?.system_stock || 0
  const modalCurrentPhysical = parseInt(physicalInput || '0', 10)
  const modalVariance = isNaN(modalCurrentPhysical) ? 0 : modalCurrentPhysical - modalSystemStock

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {session?.session_code || 'Pemindaian SO'}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {categoryName || session?.categories?.name || 'Semua Kategori'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.reviewNavButton}
          onPress={() => navigation.navigate('Review', { sessionId })}
          activeOpacity={0.8}
        >
          <Feather name="check-square" size={16} color="#FFFFFF" />
          <Text style={styles.reviewNavText}>Tinjau</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Bar Header Strip */}
      <View style={styles.progressStrip}>
        <View style={styles.progressInfoRow}>
          <Text style={styles.progressStripLabel}>Progress Hitung Fisik</Text>
          <Text style={styles.progressStripValue}>
            {countedCount} / {totalCount} SKU ({progressPct}%)
          </Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
        </View>
      </View>

      {/* Tab Switcher: Kamera vs Daftar SKU */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'camera' && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab('camera')
            setIsScanningPaused(false)
          }}
          activeOpacity={0.8}
        >
          <Ionicons
            name="barcode-outline"
            size={18}
            color={activeTab === 'camera' ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.tabText, activeTab === 'camera' && styles.tabTextActive]}>
            Kamera Barcode
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'list' && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab('list')
            setIsScanningPaused(true)
          }}
          activeOpacity={0.8}
        >
          <Feather
            name="list"
            size={18}
            color={activeTab === 'list' ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.tabText, activeTab === 'list' && styles.tabTextActive]}>
            Daftar SKU ({totalCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ================= TAB 1: CAMERA VIEW ================= */}
      {activeTab === 'camera' && (
        <View style={styles.cameraWrapper}>
          {!permission ? (
            <View style={styles.permissionBox}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={styles.permissionText}>Memeriksa izin kamera...</Text>
            </View>
          ) : !permission.granted ? (
            <View style={styles.permissionBox}>
              <View style={styles.permissionIconCircle}>
                <Ionicons name="camera-outline" size={40} color={colors.primary} />
              </View>
              <Text style={styles.permissionTitle}>Akses Kamera Diperlukan</Text>
              <Text style={styles.permissionDesc}>
                Stockify memerlukan izin kamera untuk memindai barcode produk pada rak toko/gudang.
              </Text>
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={requestPermission}
                activeOpacity={0.85}
              >
                <Text style={styles.permissionButtonText}>Izinkan Akses Kamera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.permissionManualBtn}
                onPress={() => setActiveTab('list')}
                activeOpacity={0.7}
              >
                <Text style={styles.permissionManualText}>Gunakan Mode Daftar SKU Manual</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cameraContainer}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing={facing}
                enableTorch={torchEnabled}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'],
                }}
                onBarcodeScanned={isScanningPaused ? undefined : handleBarcodeScanned}
              />

              {/* Viewfinder Reticle Overlay */}
              <View style={styles.overlayContainer} pointerEvents="box-none">
                <View style={styles.scannerTargetBox}>
                  {/* Corner Markers */}
                  <View style={[styles.cornerMarker, styles.cornerTL]} />
                  <View style={[styles.cornerMarker, styles.cornerTR]} />
                  <View style={[styles.cornerMarker, styles.cornerBL]} />
                  <View style={[styles.cornerMarker, styles.cornerBR]} />
                  {/* Animated laser line simulation */}
                  <View style={styles.laserLine} />
                </View>

                <View style={styles.guideBadge}>
                  <Text style={styles.guideText}>
                    {isScanningPaused
                      ? 'Pemindaian Ditunda Sementara'
                      : 'Arahkan kotak tepat ke barcode produk'}
                  </Text>
                </View>
              </View>

              {/* Camera Action Overlay Controls */}
              <View style={styles.cameraControlsBar}>
                {/* Torch Toggle */}
                <TouchableOpacity
                  style={[styles.cameraActionBtn, torchEnabled && styles.cameraActionBtnActive]}
                  onPress={() => setTorchEnabled((prev) => !prev)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={torchEnabled ? 'flash' : 'flash-off-outline'}
                    size={22}
                    color={torchEnabled ? '#F59E0B' : '#FFFFFF'}
                  />
                  <Text style={styles.cameraActionLabel}>
                    {torchEnabled ? 'Senter Aktif' : 'Senter'}
                  </Text>
                </TouchableOpacity>

                {/* Manual Barcode Input Dialog Trigger */}
                <TouchableOpacity
                  style={styles.cameraActionBtn}
                  onPress={() => {
                    setIsScanningPaused(true)
                    setManualBarcodeModal(true)
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="keypad-outline" size={22} color="#FFFFFF" />
                  <Text style={styles.cameraActionLabel}>Ketik Barcode</Text>
                </TouchableOpacity>

                {/* Switch Camera Facing */}
                <TouchableOpacity
                  style={styles.cameraActionBtn}
                  onPress={() => setFacing((prev) => (prev === 'back' ? 'front' : 'back'))}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera-reverse-outline" size={22} color="#FFFFFF" />
                  <Text style={styles.cameraActionLabel}>Balik Kamera</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {/* ================= TAB 2: SKU LIST VIEW ================= */}
      {activeTab === 'list' && (
        <View style={styles.listWrapper}>
          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari nama produk, barcode, atau rak..."
              placeholderTextColor={colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Sub Filter Chips */}
          <View style={styles.filterChipsRow}>
            <TouchableOpacity
              style={[styles.filterChip, filterTab === 'all' && styles.filterChipActive]}
              onPress={() => setFilterTab('all')}
            >
              <Text style={[styles.filterChipText, filterTab === 'all' && styles.filterChipTextActive]}>
                Semua ({totalCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filterTab === 'uncounted' && styles.filterChipActive]}
              onPress={() => setFilterTab('uncounted')}
            >
              <Text
                style={[styles.filterChipText, filterTab === 'uncounted' && styles.filterChipTextActive]}
              >
                Belum Scan ({totalCount - countedCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filterTab === 'counted' && styles.filterChipActive]}
              onPress={() => setFilterTab('counted')}
            >
              <Text
                style={[styles.filterChipText, filterTab === 'counted' && styles.filterChipTextActive]}
              >
                Sudah ({countedCount})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Items List */}
          {loading ? (
            <View style={styles.listLoadingBox}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={styles.listLoadingText}>Memuat daftar item...</Text>
            </View>
          ) : filteredItems.length === 0 ? (
            <View style={styles.emptyListBox}>
              <Feather name="inbox" size={36} color={colors.textLight} />
              <Text style={styles.emptyListTitle}>Tidak Ada Produk Ditemukan</Text>
              <Text style={styles.emptyListSub}>
                Coba sesuaikan kata kunci pencarian atau tab filter di atas.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredItems}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const isCounted = item.is_counted
                const variance = item.variance ?? 0
                return (
                  <TouchableOpacity
                    style={[styles.itemCard, isCounted && styles.itemCardCounted]}
                    onPress={() => openCountModalForItem(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemCardTop}>
                      <View style={styles.itemBarcodeTag}>
                        <Text style={styles.itemBarcodeText}>{item.products?.barcode || '-'}</Text>
                      </View>

                      {isCounted ? (
                        <View
                          style={[
                            styles.varianceBadge,
                            variance === 0
                              ? styles.badgeMatch
                              : variance > 0
                              ? styles.badgeSurplus
                              : styles.badgeDeficit,
                          ]}
                        >
                          <Text
                            style={[
                              styles.varianceBadgeText,
                              variance === 0
                                ? styles.textMatch
                                : variance > 0
                                ? styles.textSurplus
                                : styles.textDeficit,
                            ]}
                          >
                            {variance === 0 ? 'COCOK' : variance > 0 ? `+${variance} SURPLUS` : `${variance} DEFISIT`}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.badgePending}>
                          <Text style={styles.badgePendingText}>BELUM SCAN</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.itemProductName}>{item.products?.name || 'Produk SKU'}</Text>

                    <View style={styles.itemMetaRow}>
                      <View style={styles.shelfMeta}>
                        <Feather name="map-pin" size={12} color={colors.textMuted} />
                        <Text style={styles.shelfMetaText}>
                          Rak: {item.products?.shelf_location || '-'}
                        </Text>
                      </View>

                      <View style={styles.stockComparison}>
                        <Text style={styles.stockLabel}>Sistem: </Text>
                        <Text style={styles.stockSysValue}>{item.system_stock} pcs</Text>
                        <Text style={styles.stockSeparator}>•</Text>
                        <Text style={styles.stockLabel}>Fisik: </Text>
                        <Text
                          style={[
                            styles.stockPhysValue,
                            isCounted ? styles.stockPhysDone : styles.stockPhysPending,
                          ]}
                        >
                          {isCounted ? `${item.physical_stock} pcs` : '-'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )
              }}
            />
          )}
        </View>
      )}

      {/* Sticky Bottom Bar to Review */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.reviewFullBtn}
          onPress={() => navigation.navigate('Review', { sessionId })}
          activeOpacity={0.85}
        >
          <View style={styles.reviewFullIconWrap}>
            <Feather name="check-circle" size={18} color="#FFFFFF" />
          </View>
          <View style={styles.reviewFullTextWrap}>
            <Text style={styles.reviewFullTitle}>Selesaikan & Tinjau Hasil</Text>
            <Text style={styles.reviewFullSubtitle}>
              {countedCount} dari {totalCount} SKU telah dihitung ({progressPct}%)
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* ================= MODAL: INPUT STOK FISIK ================= */}
      {selectedItem && (
        <Modal
          visible={!!selectedItem}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setSelectedItem(null)
            setIsScanningPaused(false)
            scanCooldownRef.current = false
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}
          >
            <View style={styles.modalCard}>
              {/* Header Modal */}
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.modalBarcodeTag}>
                    <Text style={styles.modalBarcodeText}>
                      {selectedItem.products?.barcode || '-'}
                    </Text>
                  </View>
                  <Text style={styles.modalProductTitle} numberOfLines={2}>
                    {selectedItem.products?.name}
                  </Text>
                  <View style={styles.modalShelfRow}>
                    <Feather name="map-pin" size={12} color={colors.textMuted} />
                    <Text style={styles.modalShelfText}>
                      Lokasi Rak: {selectedItem.products?.shelf_location || '-'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => {
                    setSelectedItem(null)
                    setIsScanningPaused(false)
                    scanCooldownRef.current = false
                  }}
                >
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Stock Comparison Grid */}
              <View style={styles.comparisonGrid}>
                <View style={styles.compBox}>
                  <Text style={styles.compBoxLabel}>Stok di Sistem</Text>
                  <Text style={styles.compBoxSysVal}>{modalSystemStock} Pcs</Text>
                </View>

                <View
                  style={[
                    styles.compBox,
                    modalVariance === 0
                      ? styles.compBoxMatch
                      : modalVariance > 0
                      ? styles.compBoxSurplus
                      : styles.compBoxDeficit,
                  ]}
                >
                  <Text style={styles.compBoxLabel}>Selisih Terhitung</Text>
                  <Text
                    style={[
                      styles.compBoxVarianceVal,
                      modalVariance === 0
                        ? styles.textMatch
                        : modalVariance > 0
                        ? styles.textSurplus
                        : styles.textDeficit,
                    ]}
                  >
                    {modalVariance === 0
                      ? 'Cocok (0)'
                      : modalVariance > 0
                      ? `+${modalVariance} (Surplus)`
                      : `${modalVariance} (Defisit)`}
                  </Text>
                </View>
              </View>

              {/* Physical Input Section */}
              <View style={styles.inputSection}>
                <Text style={styles.inputSectionLabel}>JUMLAH STOK FISIK DI RAK</Text>

                <View style={styles.numberInputRow}>
                  <TouchableOpacity
                    style={styles.counterBtn}
                    onPress={() => adjustInput(-1)}
                    activeOpacity={0.7}
                  >
                    <Feather name="minus" size={24} color={colors.textPrimary} />
                  </TouchableOpacity>

                  <TextInput
                    style={styles.bigNumericInput}
                    value={physicalInput}
                    onChangeText={setPhysicalInput}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    maxLength={6}
                  />

                  <TouchableOpacity
                    style={styles.counterBtn}
                    onPress={() => adjustInput(1)}
                    activeOpacity={0.7}
                  >
                    <Feather name="plus" size={24} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                {/* Quick Add Chips */}
                <View style={styles.quickChipsRow}>
                  <TouchableOpacity
                    style={styles.quickChip}
                    onPress={() => adjustInput(-10)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickChipText}>-10</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickChip}
                    onPress={() => adjustInput(-5)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickChipText}>-5</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickChip}
                    onPress={() => setPhysicalInput(String(modalSystemStock))}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.quickChipText, { color: colors.primary, fontWeight: '700' }]}>
                      = Sistem
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickChip}
                    onPress={() => adjustInput(5)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickChipText}>+5</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickChip}
                    onPress={() => adjustInput(10)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.quickChipText}>+10</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Modal Buttons */}
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => {
                    setSelectedItem(null)
                    setIsScanningPaused(false)
                    scanCooldownRef.current = false
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelText}>Batal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSaveBtn, submittingCount && styles.btnDisabled]}
                  onPress={handleSavePhysicalCount}
                  disabled={submittingCount}
                  activeOpacity={0.85}
                >
                  {submittingCount ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Feather name="check" size={18} color="#FFFFFF" />
                      <Text style={styles.modalSaveText}>Simpan Hitungan</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* ================= MODAL: MANUAL BARCODE INPUT ================= */}
      <Modal
        visible={manualBarcodeModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setManualBarcodeModal(false)
          setIsScanningPaused(false)
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalProductTitle}>Input Barcode Manual</Text>
                <Text style={styles.modalShelfText}>
                  Masukkan nomor barcode atau nama produk secara manual
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => {
                  setManualBarcodeModal(false)
                  setIsScanningPaused(false)
                }}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ marginVertical: spacing.lg }}>
              <TextInput
                style={styles.manualTextInput}
                placeholder="Misal: 8992761234801..."
                placeholderTextColor={colors.textLight}
                value={manualBarcodeInput}
                onChangeText={setManualBarcodeInput}
                autoFocus
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setManualBarcodeModal(false)
                  setIsScanningPaused(false)
                }}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSearchManualBarcode}
                disabled={!manualBarcodeInput.trim()}
              >
                <Feather name="search" size={18} color="#FFFFFF" />
                <Text style={styles.modalSaveText}>Cari & Hitung</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#0F172A',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: spacing.md,
  },
  headerTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 1,
  },
  reviewNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
  },
  reviewNavText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.xs + 1,
    fontWeight: typography.weights.bold,
  },
  progressStrip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  progressInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressStripLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: typography.weights.medium,
  },
  progressStripValue: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    padding: 4,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.xs + 3,
    borderRadius: radius.sm,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: typography.sizes.xs + 1,
    fontWeight: typography.weights.semibold,
    color: '#94A3B8',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  cameraWrapper: {
    flex: 1,
    backgroundColor: '#000000',
    marginTop: spacing.sm,
  },
  permissionBox: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  permissionText: {
    marginTop: spacing.md,
    fontSize: typography.sizes.sm,
    color: '#94A3B8',
  },
  permissionIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 77, 21, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  permissionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
    marginBottom: spacing.sm,
  },
  permissionDesc: {
    fontSize: typography.sizes.sm,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    width: '100%',
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.base,
  },
  permissionManualBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  permissionManualText: {
    color: '#94A3B8',
    fontSize: typography.sizes.sm,
    textDecorationLine: 'underline',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerTargetBox: {
    width: 250,
    height: 250,
    position: 'relative',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cornerMarker: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: colors.primary,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },
  laserLine: {
    width: '90%',
    height: 2,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  guideBadge: {
    marginTop: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  guideText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: typography.weights.medium,
  },
  cameraControlsBar: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cameraActionBtn: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
  },
  cameraActionBtnActive: {
    opacity: 1,
  },
  cameraActionLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: typography.weights.semibold,
  },
  listWrapper: {
    flex: 1,
    backgroundColor: colors.background,
    marginTop: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FFFFFF',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
    padding: 0,
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: typography.weights.semibold,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: typography.weights.bold,
  },
  listLoadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listLoadingText: {
    marginTop: spacing.sm,
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
  },
  emptyListBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyListTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptyListSub: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 90,
    gap: spacing.sm,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  itemCardCounted: {
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  itemCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemBarcodeTag: {
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  itemBarcodeText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: colors.textMuted,
  },
  varianceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    borderWidth: 1,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  badgePendingText: {
    fontSize: 9,
    fontWeight: typography.weights.heavy,
    color: '#64748B',
  },
  varianceBadgeText: {
    fontSize: 9,
    fontWeight: typography.weights.heavy,
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
  itemProductName: {
    fontSize: typography.sizes.sm + 1,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  itemMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 6,
    marginTop: 2,
  },
  shelfMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shelfMetaText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  stockComparison: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  stockSysValue: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
  },
  stockSeparator: {
    marginHorizontal: 4,
    color: colors.textLight,
  },
  stockPhysValue: {
    fontSize: 11,
    fontWeight: typography.weights.heavy,
  },
  stockPhysDone: {
    color: colors.primary,
  },
  stockPhysPending: {
    color: colors.textLight,
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reviewFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  reviewFullIconWrap: {
    marginRight: spacing.sm,
  },
  reviewFullTextWrap: {
    flex: 1,
  },
  reviewFullTitle: {
    color: '#FFFFFF',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.heavy,
  },
  reviewFullSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 36 : spacing.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.md,
  },
  modalBarcodeTag: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.xs,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  modalBarcodeText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  modalProductTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.heavy,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  modalShelfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  modalShelfText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  comparisonGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  compBox: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compBoxLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: typography.weights.bold,
    textTransform: 'uppercase',
  },
  compBoxSysVal: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.black,
    color: colors.textPrimary,
    marginTop: 2,
  },
  compBoxMatch: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  compBoxSurplus: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  compBoxDeficit: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  compBoxVarianceVal: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.black,
    marginTop: 2,
  },
  inputSection: {
    backgroundColor: '#F8FAFC',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  inputSectionLabel: {
    fontSize: 10,
    fontWeight: typography.weights.heavy,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  numberInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  counterBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  bigNumericInput: {
    width: 120,
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: typography.weights.black,
    color: colors.textPrimary,
  },
  quickChipsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  quickChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  modalSaveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  modalSaveText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  manualTextInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.textPrimary,
  },
})
