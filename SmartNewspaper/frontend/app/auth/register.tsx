import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { registerUser } from '@/services/auth';

export default function RegisterScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Tüm alanlar zorunludur.');
      return;
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Şifreler birbiriyle eşleşmiyor.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await registerUser({ name, email, password });
      router.replace('/(tabs)/profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles(colors).container}>
      <View style={styles(colors).card}>
        <Text style={styles(colors).title}>Kayıt Ol</Text>
        <Text style={styles(colors).subtitle}>Yeni hesap oluştur ve profilini aç.</Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ad Soyad"
          placeholderTextColor={colors.textMuted}
          style={styles(colors).input}
        />

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="E-posta"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles(colors).input}
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Şifre"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          style={styles(colors).input}
        />

        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Şifre Tekrar"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          style={styles(colors).input}
        />

        {error ? <Text style={styles(colors).errorText}>{error}</Text> : null}

        <Pressable style={styles(colors).primaryButton} onPress={handleRegister} disabled={loading}>
          <Text style={styles(colors).primaryButtonText}>{loading ? 'Kayıt oluşturuluyor...' : 'Kayıt Ol'}</Text>
        </Pressable>

        <Link href="/auth/login" asChild>
          <Pressable style={styles(colors).secondaryButton}>
            <Text style={styles(colors).secondaryButtonText}>Zaten hesabın var mı? Giriş Yap</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: Spacing.lg,
      justifyContent: 'center',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    title: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.xl,
      fontWeight: Typography.fontWeight.bold,
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: Typography.fontSize.base,
      lineHeight: 20,
    },
    input: {
      backgroundColor: colors.surfaceHigh,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.md,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
      color: colors.textPrimary,
    },
    errorText: {
      color: colors.error,
      fontSize: Typography.fontSize.sm,
    },
    primaryButton: {
      backgroundColor: colors.accent,
      borderRadius: Radius.md,
      paddingVertical: Spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: {
      color: colors.white,
      fontSize: Typography.fontSize.md,
      fontWeight: Typography.fontWeight.bold,
    },
    secondaryButton: {
      alignItems: 'center',
      paddingVertical: Spacing.sm,
    },
    secondaryButtonText: {
      color: colors.accent,
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.medium,
    },
  });
