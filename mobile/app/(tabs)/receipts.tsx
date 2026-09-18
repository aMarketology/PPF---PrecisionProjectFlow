import { useEffect, useState } from 'react'
import { Alert, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { Camera, ImagePlus, ReceiptText, Upload, Users } from 'lucide-react-native'
import { colors, radius, shadows, spacing } from '@/lib/theme'
import { supabase } from '@/lib/supabase'

type Receipt = {
  id: string
  merchant_name: string
  receipt_date: string
  total_amount: number | null
  currency: string
  category: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
}

export default function ReceiptsTab() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => { loadReceipts() }, [])

  async function loadReceipts() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()
    const currentCompanyId = profile?.company_id || null
    setCompanyId(currentCompanyId)
    if (!currentCompanyId) { setReceipts([]); setLoading(false); return }

    const { data, error } = await supabase
      .from('company_receipts')
      .select('id, merchant_name, receipt_date, total_amount, currency, category, status, created_at')
      .eq('company_id', currentCompanyId)
      .order('created_at', { ascending: false })

    if (error) console.error('Failed to load receipts:', error.message)
    setReceipts(data || [])
    setLoading(false)
  }

  async function chooseImage(source: 'camera' | 'library') {
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (!permission.granted) {
      Alert.alert('Permission needed', `Allow access to your ${source === 'camera' ? 'camera' : 'photo library'} to capture a receipt.`)
      return
    }

    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 })

    if (!result.canceled && result.assets[0]) await uploadReceipt(result.assets[0].uri)
  }

  function showCaptureOptions() {
    if (!companyId) {
      Alert.alert('Join a company first', 'Receipts are shared with your company back office. Join or create a company to submit one.')
      return
    }
    Alert.alert('Add receipt', 'The receipt will be shared automatically with your company back office.', [
      { text: 'Take photo', onPress: () => chooseImage('camera') },
      { text: 'Choose photo', onPress: () => chooseImage('library') },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  async function uploadReceipt(uri: string) {
    if (!companyId) return
    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Please sign in again.')

      const imageResponse = await fetch(uri)
      const imageBlob = await imageResponse.blob()
      const path = `${companyId}/${user.id}/${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage.from('company-receipts').upload(path, imageBlob, { contentType: 'image/jpeg', upsert: false })
      if (uploadError) throw uploadError

      const { error: receiptError } = await supabase.from('company_receipts').insert({
        company_id: companyId,
        submitted_by: user.id,
        image_path: path,
        merchant_name: 'Receipt scan',
        receipt_date: new Date().toISOString().slice(0, 10),
        status: 'pending',
        extracted_data: {},
      })
      if (receiptError) throw receiptError

      await loadReceipts()
      Alert.alert('Receipt shared', 'Your receipt is now available to the company back office.')
    } catch (error: any) {
      console.error('Receipt upload failed:', error)
      Alert.alert('Could not share receipt', error.message || 'Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const total = receipts.reduce((sum, receipt) => sum + Number(receipt.total_amount || 0), 0)

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View><Text style={styles.eyebrow}>TEAM FINANCE</Text><Text style={styles.title}>Receipts</Text></View>
        <TouchableOpacity accessibilityLabel="Add receipt" style={[styles.captureButton, uploading && styles.disabled]} onPress={showCaptureOptions} disabled={uploading}>
          {uploading ? <Upload size={20} color="#fff" /> : <Camera size={20} color="#fff" />}
        </TouchableOpacity>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryIcon}><ReceiptText size={22} color={colors.primary} /></View>
        <View style={styles.summaryContent}><Text style={styles.summaryLabel}>Shared receipts</Text><Text style={styles.summaryValue}>{receipts.length} records · ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text></View>
      </View>

      <View style={styles.notice}><Users size={16} color={colors.primaryDark} /><Text style={styles.noticeText}>Every submission is shared automatically with company owners and admins.</Text></View>

      <FlatList
        data={receipts}
        keyExtractor={(receipt) => receipt.id}
        contentContainerStyle={receipts.length ? styles.list : styles.emptyList}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadReceipts} tintColor={colors.primary} />}
        renderItem={({ item }) => <ReceiptRow receipt={item} />}
        ListEmptyComponent={!loading ? <View style={styles.empty}><View style={styles.emptyIcon}><ImagePlus size={30} color={colors.primary} /></View><Text style={styles.emptyTitle}>{companyId ? 'No receipts yet' : 'No company connected'}</Text><Text style={styles.emptyText}>{companyId ? 'Capture a receipt to share it with the back office.' : 'Receipts need an active company membership.'}</Text>{companyId && <TouchableOpacity style={styles.addTextButton} onPress={showCaptureOptions}><Camera size={16} color="#fff" /><Text style={styles.addText}>Capture receipt</Text></TouchableOpacity>}</View> : null}
      />
    </SafeAreaView>
  )
}

function ReceiptRow({ receipt }: { receipt: Receipt }) {
  const statusLabel = receipt.status === 'completed' ? 'Complete' : receipt.status === 'failed' ? 'Failed' : receipt.status === 'processing' ? 'Processing' : 'Pending'
  return <View style={styles.row}><View style={styles.rowIcon}><ReceiptText size={19} color={colors.primary} /></View><View style={styles.rowContent}><Text style={styles.merchant}>{receipt.merchant_name}</Text><Text style={styles.meta}>{new Date(`${receipt.receipt_date}T12:00:00`).toLocaleDateString()} · {receipt.category || 'Uncategorized'} · {statusLabel}</Text></View><Text style={styles.amount}>{receipt.total_amount === null ? 'Processing' : `${receipt.currency} ${Number(receipt.total_amount).toFixed(2)}`}</Text></View>
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1 }, title: { color: colors.text, fontSize: 30, fontWeight: '800', marginTop: 2 }, captureButton: { width: 48, height: 48, backgroundColor: colors.primary, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', ...shadows.md }, disabled: { opacity: 0.6 }, summary: { marginHorizontal: spacing.lg, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', ...shadows.sm }, summaryIcon: { width: 42, height: 42, borderRadius: radius.sm, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' }, summaryContent: { marginLeft: spacing.md }, summaryLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' }, summaryValue: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: 2 }, notice: { marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.sm, backgroundColor: colors.primaryPale, flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }, noticeText: { color: colors.primaryDark, fontSize: 12, fontWeight: '600', flex: 1, lineHeight: 17 }, list: { padding: spacing.lg, gap: spacing.sm }, row: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', ...shadows.sm }, rowIcon: { width: 38, height: 38, borderRadius: radius.sm, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center' }, rowContent: { flex: 1, marginLeft: spacing.md }, merchant: { color: colors.text, fontSize: 14, fontWeight: '800' }, meta: { color: colors.textMuted, fontSize: 12, marginTop: 3 }, amount: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', textAlign: 'right' }, emptyList: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl }, empty: { alignItems: 'center' }, emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }, emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '800' }, emptyText: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: spacing.sm, lineHeight: 19 }, addTextButton: { marginTop: spacing.lg, backgroundColor: colors.primary, flexDirection: 'row', gap: spacing.sm, alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 12, borderRadius: radius.sm }, addText: { color: '#fff', fontSize: 13, fontWeight: '800' },
})
