import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { loginUser } from '@/services/auth';

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('E-posta ve şifre alanları zorunludur.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const profile = await loginUser({ email, password });
      if (!profile) {
        setError('Giriş bilgileri hatalı veya hesap bulunamadı.');
        return;
      }

      router.replace('/(tabs)/profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles(colors).container}>
      <View style={styles(colors).card}>
        <Text style={styles(colors).title}>Giriş Yap</Text>
        <Text style={styles(colors).subtitle}>Profil sayfasına erişmek için hesabınla giriş yap.</Text>

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

        {error ? <Text style={styles(colors).errorText}>{error}</Text> : null}

        <Pressable style={styles(colors).primaryButton} onPress={handleLogin} disabled={loading}>
          <Text style={styles(colors).primaryButtonText}>{loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}</Text>
        </Pressable>

        <Link href="/auth/register" asChild>
          <Pressable style={styles(colors).secondaryButton}>
            <Text style={styles(colors).secondaryButtonText}>Hesabın yok mu? Kayıt Ol</Text>
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
