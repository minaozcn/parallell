import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { Stack, router } from "expo-router";
import { useColors } from "@/hooks/use-colors";
import { Button } from "@/components/button";
import { Muted } from "@/components/screen";
import { fetchMe, updateBio, updateDisplayName } from "@/api/account";

// Ad ve "hakkında" yazısı tek ekranda, tek "Kaydet" ile düzenlenir.
export default function ProfileEdit() {
  const colors = useColors();
  const [initial, setInitial] = useState<{ name: string; bio: string } | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMe()
      .then((m) => {
        setInitial({ name: m.displayName, bio: m.bio ?? "" });
        setName(m.displayName);
        setBio(m.bio ?? "");
      })
      .catch((e) => Alert.alert("Yüklenemedi", e.message));
  }, []);

  const changed = initial !== null && (name.trim() !== initial.name || bio.trim() !== initial.bio);

  async function save() {
    if (!initial) return;
    setSaving(true);
    try {
      if (name.trim() !== initial.name) await updateDisplayName(name);
      if (bio.trim() !== initial.bio) await updateBio(bio);
      router.back();
    } catch (e) {
      Alert.alert("Kaydedilemedi", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const input = [styles.input, { color: colors.text, backgroundColor: colors.card }];

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Stack.Screen options={{ title: "Profili düzenle" }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: colors.text }]}>Görünen ad</Text>
        <TextInput value={name} onChangeText={setName} maxLength={24} autoCorrect={false} style={input} />
        <Muted>2-24 karakter: harf, rakam, boşluk ve . _ -</Muted>

        <Text style={[styles.label, { color: colors.text }]}>Hakkında</Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          maxLength={160}
          multiline
          placeholder="Kısa bir cümle: nereden, neye bakmayı seversin?"
          placeholderTextColor={colors.muted}
          style={[input, styles.bio]}
        />
        <Text style={[styles.counter, { color: colors.muted }]}>{bio.length}/160</Text>

        <Button label={saving ? "Kaydediliyor..." : "Kaydet"} onPress={save} disabled={!changed || saving} style={styles.save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 8 },
  label: { fontSize: 15, fontWeight: "600", marginTop: 12 },
  input: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, fontSize: 16 },
  bio: { minHeight: 96, textAlignVertical: "top" },
  counter: { fontSize: 12, alignSelf: "flex-end" },
  save: { marginTop: 20 },
});
