import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { FileText, ChevronDown, DollarSign, Clock, MapPin, ArrowRight } from 'lucide-react-native';
import { colors, spacing, radius } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import Button from '@/components/Button';

const categories = [
  'Structural Engineering', 'Mechanical Engineering', 'Electrical Engineering',
  'Civil Engineering', 'Software Engineering', 'Consulting Services',
  'Design Services', 'Analysis & Testing', 'Project Management', 'Other',
];

const timelines = ['< 1 week', '1–2 weeks', '1 month', '2–3 months', '3–6 months', 'Flexible'];

export default function RFQTab() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [budget, setBudget] = useState('');
  const [timeline, setTimeline] = useState('');
  const [location, setLocation] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [showTimelines, setShowTimelines] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!title || !description || !category) {
      Alert.alert('Missing fields', 'Please fill in title, description, and category.');
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Not logged in', 'Please sign in to post an RFQ.');
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('rfqs').insert({
      client_id: user.id,
      title: title.trim(),
      description: description.trim(),
      category,
      budget: budget ? Number(budget) : null,
      timeline: timeline || null,
      location: location.trim() || null,
      status: 'open',
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert(
        'RFQ Posted! 🎉',
        'Your request has been posted. Engineers matching your category will be notified.',
        [{ text: 'Great!', onPress: () => { setTitle(''); setDescription(''); setCategory(''); setBudget(''); setTimeline(''); setLocation(''); } }]
      );
    }
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[colors.gradientStart, colors.gradientMid]} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <FileText size={24} color={colors.primaryLight} />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.title}>Post an RFQ</Text>
              <Text style={styles.subtitle}>Request for Quote — engineers will respond</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">

          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.label}>Project Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Structural analysis for 3-story building"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Project Description *</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Describe your project in detail — scope, requirements, deliverables..."
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          {/* Category */}
          <View style={styles.field}>
            <Text style={styles.label}>Category *</Text>
            <TouchableOpacity
              style={styles.selectBtn}
              onPress={() => setShowCategories(!showCategories)}
            >
              <Text style={[styles.selectText, !category && styles.placeholder]}>
                {category || 'Select a category'}
              </Text>
              <ChevronDown size={16} color={colors.textMuted} />
            </TouchableOpacity>
            {showCategories && (
              <View style={styles.dropdown}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.dropItem, category === cat && styles.dropItemActive]}
                    onPress={() => { setCategory(cat); setShowCategories(false); }}
                  >
                    <Text style={[styles.dropText, category === cat && styles.dropTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Budget + Timeline in 2 cols */}
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Budget (USD)</Text>
              <View style={styles.inputWithIcon}>
                <DollarSign size={14} color={colors.textMuted} />
                <TextInput
                  style={[styles.input, { flex: 1, borderWidth: 0, paddingLeft: 6 }]}
                  placeholder="10,000"
                  placeholderTextColor={colors.textMuted}
                  value={budget}
                  onChangeText={setBudget}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Timeline</Text>
              <TouchableOpacity
                style={[styles.selectBtn, { height: 50 }]}
                onPress={() => setShowTimelines(!showTimelines)}
              >
                <Text style={[styles.selectText, !timeline && styles.placeholder]} numberOfLines={1}>
                  {timeline || 'Select'}
                </Text>
                <Clock size={14} color={colors.textMuted} />
              </TouchableOpacity>
              {showTimelines && (
                <View style={styles.dropdown}>
                  {timelines.map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.dropItem, timeline === t && styles.dropItemActive]}
                      onPress={() => { setTimeline(t); setShowTimelines(false); }}
                    >
                      <Text style={[styles.dropText, timeline === t && styles.dropTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Location */}
          <View style={styles.field}>
            <Text style={styles.label}>Location / Service Area</Text>
            <View style={styles.inputWithIcon}>
              <MapPin size={14} color={colors.textMuted} />
              <TextInput
                style={[styles.input, { flex: 1, borderWidth: 0, paddingLeft: 6 }]}
                placeholder="City, State or Remote"
                placeholderTextColor={colors.textMuted}
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </View>

          {/* Info box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>📢 How it works</Text>
            <Text style={styles.infoText}>
              Your RFQ will be visible to all active engineers in this category. Matching engineers will be notified by email. Expect proposals within 24–48 hours.
            </Text>
          </View>

          <Button
            title="Post RFQ"
            onPress={submit}
            loading={loading}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  form: { padding: spacing.lg, gap: spacing.md, paddingBottom: 100 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  input: {
    backgroundColor: '#fff', borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    fontSize: 15, color: colors.text,
  },
  textarea: { height: 120, paddingTop: 12 },
  selectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: spacing.md, height: 50,
  },
  selectText: { fontSize: 15, color: colors.text, flex: 1 },
  placeholder: { color: colors.textMuted },
  dropdown: {
    backgroundColor: '#fff', borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border,
    overflow: 'hidden', marginTop: 4,
  },
  dropItem: { paddingVertical: 12, paddingHorizontal: spacing.md },
  dropItemActive: { backgroundColor: colors.background },
  dropText: { fontSize: 14, color: colors.text },
  dropTextActive: { color: colors.primary, fontWeight: '700' },
  row: { flexDirection: 'row', gap: spacing.sm },
  inputWithIcon: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: spacing.md, height: 50,
  },
  infoBox: {
    backgroundColor: '#ECFDF5', borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.primaryPale,
    gap: 6,
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  infoText: { fontSize: 13, color: colors.primaryMid, lineHeight: 18 },
  submitBtn: { marginTop: spacing.sm },
});
