import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Platform, SafeAreaView, Alert, TextInput,
  KeyboardAvoidingView, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, SHADOWS, FONTS } from '../../src/theme';
import TarotCardArt from '../../src/components/TarotCardArt';
import { setCachedImage, clearCachedImage } from '../../src/imageCache';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

type CardType = {
  id: string; number: number; name_de: string; type: string;
  suit: string | null; suit_de: string | null;
  meaning_upright: string; meaning_reversed: string;
  description: string; image_short: string; icon: string;
  has_custom_image?: boolean;
};

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [card, setCard] = useState<CardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit fields
  const [editName, setEditName] = useState('');
  const [editUpright, setEditUpright] = useState('');
  const [editReversed, setEditReversed] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => { loadCard(); }, [id]);

  const loadCard = async () => {
    try {
      const res = await fetch(`${API_URL}/api/cards/${id}`);
      const data = await res.json();
      setCard(data);
      setEditName(data.name_de);
      setEditUpright(data.meaning_upright);
      setEditReversed(data.meaning_reversed);
      setEditDescription(data.description || '');
      if (data.has_custom_image) loadCustomImage(data.id);
    } catch {} finally { setLoading(false); }
  };

  const loadCustomImage = async (cardId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/cards/${cardId}/image`);
      if (res.ok) {
        const data = await res.json();
        setCustomImage(data.image_base64);
      }
    } catch {}
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Berechtigung benötigt', 'Bitte erlaube den Zugriff auf deine Fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      uploadImage(result.assets[0].base64, result.assets[0].mimeType || 'image/png');
    }
  };

  const uploadImage = async (base64: string, mimeType: string) => {
    if (!card) return;
    setUploading(true);
    try {
      const imageData = `data:${mimeType};base64,${base64}`;
      const res = await fetch(`${API_URL}/api/cards/${card.id}/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: imageData }),
      });
      if (res.ok) {
        setCustomImage(imageData);
        setCachedImage(card.id, imageData);
        setCard(prev => prev ? { ...prev, has_custom_image: true } : prev);
        Alert.alert('Erfolg', 'Bild erfolgreich hochgeladen!');
      }
    } catch {
      Alert.alert('Fehler', 'Bild konnte nicht hochgeladen werden.');
    } finally { setUploading(false); }
  };

  const deleteImage = () => {
    if (!card) return;
    Alert.alert('Bild löschen', 'Möchtest du das Bild wirklich löschen?', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen', style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_URL}/api/cards/${card.id}/image`, { method: 'DELETE' });
            setCustomImage(null);
            clearCachedImage(card.id);
            setCard(prev => prev ? { ...prev, has_custom_image: false } : prev);
          } catch {}
        }
      },
    ]);
  };

  const startEditing = () => {
    if (!card) return;
    setEditName(card.name_de);
    setEditUpright(card.meaning_upright);
    setEditReversed(card.meaning_reversed);
    setEditDescription(card.description || '');
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    Keyboard.dismiss();
  };

  const saveChanges = async () => {
    if (!card) return;
    setSaving(true);
    Keyboard.dismiss();
    try {
      const res = await fetch(`${API_URL}/api/cards/${card.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name_de: editName,
          meaning_upright: editUpright,
          meaning_reversed: editReversed,
          description: editDescription,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCard(updated);
        setEditing(false);
        Alert.alert('Gespeichert', 'Änderungen wurden erfolgreich gespeichert!');
      }
    } catch {
      Alert.alert('Fehler', 'Änderungen konnten nicht gespeichert werden.');
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={COLORS.accent} size="large" style={{ marginTop: 100 }} />
      </SafeAreaView>
    );
  }

  if (!card) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Karte nicht gefunden</Text>
          <TouchableOpacity testID="back-btn" onPress={() => router.back()}>
            <Text style={styles.backLink}>Zurück</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const typeLabel = card.type === 'major' ? 'Große Arkana' : `Kleine Arkana – ${card.suit_de}`;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity testID="card-detail-back-btn" onPress={() => { if (editing) cancelEditing(); else router.back(); }} style={styles.backButton}>
          <Ionicons name={editing ? 'close' : 'arrow-back'} size={24} color={COLORS.accent} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {editing ? 'Bearbeiten' : card.name_de}
        </Text>
        {!editing ? (
          <TouchableOpacity testID="edit-card-btn" onPress={startEditing} style={styles.backButton}>
            <Ionicons name="create-outline" size={22} color={COLORS.accent} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity testID="save-card-btn" onPress={saveChanges} style={styles.backButton} disabled={saving}>
            {saving ? (
              <ActivityIndicator color={COLORS.accent} size="small" />
            ) : (
              <Ionicons name="checkmark" size={24} color={COLORS.success} />
            )}
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {!editing && (
            <>
              <View style={styles.cardCenter}>
                <TarotCardArt card={card} size="large" customImageBase64={customImage} />
              </View>
              <View style={styles.imageActions}>
                <TouchableOpacity testID="upload-image-btn" style={styles.uploadButton} onPress={pickImage} disabled={uploading}>
                  {uploading ? <ActivityIndicator color={COLORS.accent} size="small" /> : (
                    <>
                      <Ionicons name="image-outline" size={18} color={COLORS.accent} />
                      <Text style={styles.uploadButtonText}>{customImage ? 'Bild ändern' : 'Bild hochladen'}</Text>
                    </>
                  )}
                </TouchableOpacity>
                {customImage && (
                  <TouchableOpacity testID="delete-image-btn" style={styles.deleteButton} onPress={deleteImage}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {editing ? (
            <>
              <View style={styles.editSection}>
                <Text style={styles.editLabel}>Kartenname</Text>
                <TextInput
                  testID="edit-name-input"
                  style={styles.editInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholderTextColor={COLORS.textMuted}
                  placeholder="Kartenname"
                />
              </View>

              <View style={styles.editSection}>
                <View style={styles.editLabelRow}>
                  <Ionicons name="arrow-up-circle" size={20} color={COLORS.accent} />
                  <Text style={styles.editLabel}>Aufrechte Bedeutung</Text>
                </View>
                <TextInput
                  testID="edit-upright-input"
                  style={[styles.editInput, styles.editMultiline]}
                  value={editUpright}
                  onChangeText={setEditUpright}
                  multiline
                  placeholderTextColor={COLORS.textMuted}
                  placeholder="Aufrechte Bedeutung"
                />
              </View>

              <View style={styles.editSection}>
                <View style={styles.editLabelRow}>
                  <Ionicons name="arrow-down-circle" size={20} color={COLORS.cups} />
                  <Text style={[styles.editLabel, { color: COLORS.cups }]}>Umgekehrte Bedeutung</Text>
                </View>
                <TextInput
                  testID="edit-reversed-input"
                  style={[styles.editInput, styles.editMultiline]}
                  value={editReversed}
                  onChangeText={setEditReversed}
                  multiline
                  placeholderTextColor={COLORS.textMuted}
                  placeholder="Umgekehrte Bedeutung"
                />
              </View>

              <View style={styles.editSection}>
                <Text style={styles.editLabel}>Beschreibung</Text>
                <TextInput
                  testID="edit-description-input"
                  style={[styles.editInput, styles.editMultiline]}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  multiline
                  placeholderTextColor={COLORS.textMuted}
                  placeholder="Beschreibung der Karte"
                />
              </View>

              <TouchableOpacity testID="save-changes-btn" style={styles.saveButton} onPress={saveChanges} disabled={saving}>
                {saving ? <ActivityIndicator color={COLORS.background} /> : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.background} />
                    <Text style={styles.saveButtonText}>Änderungen speichern</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity testID="cancel-edit-btn" style={styles.cancelButton} onPress={cancelEditing}>
                <Text style={styles.cancelButtonText}>Abbrechen</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.cardName}>{card.name_de}</Text>
              <View style={styles.typeBadge}>
                <Ionicons name={card.type === 'major' ? 'star' : (card.icon as any)} size={14} color={COLORS.accent} />
                <Text style={styles.typeText}>{typeLabel}</Text>
              </View>
              {card.description ? <Text style={styles.description}>{card.description}</Text> : null}
              <View style={styles.goldDivider} />
              <View style={styles.meaningSection}>
                <View style={styles.meaningHeader}>
                  <Ionicons name="arrow-up-circle" size={24} color={COLORS.accent} />
                  <Text style={styles.meaningTitle}>Aufrechte Bedeutung</Text>
                </View>
                <Text style={styles.meaningText}>{card.meaning_upright}</Text>
              </View>
              <View style={styles.meaningSection}>
                <View style={styles.meaningHeader}>
                  <Ionicons name="arrow-down-circle" size={24} color={COLORS.cups} />
                  <Text style={[styles.meaningTitle, { color: COLORS.cups }]}>Umgekehrte Bedeutung</Text>
                </View>
                <Text style={styles.meaningText}>{card.meaning_reversed}</Text>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backButton: { padding: SPACING.sm, width: 40, alignItems: 'center' },
  topBarTitle: {
    color: COLORS.text, fontSize: 16, fontWeight: '600',
    fontFamily: FONTS.cinzelBold,
    flex: 1, textAlign: 'center',
  },
  content: { paddingHorizontal: SPACING.lg, paddingBottom: 80, paddingTop: SPACING.lg },
  cardCenter: { alignItems: 'center', marginBottom: SPACING.md },
  imageActions: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: SPACING.sm, marginBottom: SPACING.lg,
  },
  uploadButton: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    paddingVertical: 10, paddingHorizontal: SPACING.md,
    borderWidth: 1, borderColor: COLORS.accent, borderRadius: 20,
    backgroundColor: COLORS.surface,
  },
  uploadButtonText: {
    color: COLORS.accent, fontSize: 13, fontWeight: '600',
    fontFamily: FONTS.cinzelBold,
  },
  deleteButton: {
    padding: 10, borderWidth: 1, borderColor: COLORS.error,
    borderRadius: 20, backgroundColor: COLORS.surface,
  },
  cardName: {
    fontSize: 28, color: COLORS.accent, fontWeight: '700', textAlign: 'center',
    fontFamily: FONTS.cinzelBold,
  },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.xs, marginTop: SPACING.sm,
  },
  typeText: {
    color: COLORS.textSecondary, fontSize: 13,
    fontFamily: FONTS.cinzelBold,
  },
  description: {
    color: COLORS.textSecondary, fontSize: 14, textAlign: 'center',
    marginTop: SPACING.md, lineHeight: 22, fontStyle: 'italic',
  },
  goldDivider: {
    height: 1, backgroundColor: COLORS.borderGold, marginVertical: SPACING.xl, opacity: 0.4,
  },
  meaningSection: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: SPACING.lg,
    marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  meaningHeader: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm,
  },
  meaningTitle: {
    fontSize: 16, color: COLORS.accent, fontWeight: '700',
    fontFamily: FONTS.cinzelBold,
  },
  meaningText: {
    color: COLORS.text, fontSize: 15, lineHeight: 24,
    fontFamily: FONTS.cinzelBold,
  },
  // Edit styles
  editSection: { marginBottom: SPACING.lg },
  editLabelRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.sm },
  editLabel: {
    color: COLORS.accent, fontSize: 14, fontWeight: '700', marginBottom: SPACING.xs,
    fontFamily: FONTS.cinzelBold,
  },
  editInput: {
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1,
    borderColor: COLORS.border, padding: SPACING.md,
    color: COLORS.text, fontSize: 15, lineHeight: 22,
    fontFamily: FONTS.cinzelBold,
  },
  editMultiline: { minHeight: 80, textAlignVertical: 'top' },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.accent, paddingVertical: 14, borderRadius: 28,
    marginTop: SPACING.md,
  },
  saveButtonText: {
    color: COLORS.background, fontSize: 16, fontWeight: '700',
    fontFamily: FONTS.cinzelBold,
  },
  cancelButton: {
    alignItems: 'center', paddingVertical: 12, marginTop: SPACING.sm,
  },
  cancelButtonText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: '600' },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  errorText: { color: COLORS.error, fontSize: 16 },
  backLink: { color: COLORS.accent, fontSize: 14 },
});
