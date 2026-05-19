import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '@/components/auth/AuthShell';
import { AuthInput } from '@/components/auth/AuthInput';
import { AuthButton, AuthError } from '@/components/auth/AuthButton';
import { Spacing, Typography } from '@/constants/theme';
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
    <AuthShell
      title="Tekrar hoş geldin"
      subtitle="Akışını kaldığın yerden sürdürmek için giriş yap."
    >
      <AuthInput
        label="E-posta"
        icon="mail-outline"
        placeholder="ornek@gazete.ai"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <AuthInput
        label="Şifre"
        icon="lock-closed-outline"
        placeholder="Şifreni gir"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        passwordToggle
        autoComplete="password"
        textContentType="password"
        onSubmitEditing={handleLogin}
      />

      <AuthError message={error} />

      <AuthButton
        label="Giriş Yap"
        loading={loading}
        onPress={handleLogin}
      />

      <View style={styles.footer}>
        <Text style={[styles.muted, { color: colors.textMuted }]}>Hesabın yok mu?</Text>
        <Link href="/auth/register" asChild>
          <Pressable hitSlop={6}>
            <Text style={[styles.link, { color: colors.accent }]}>Kayıt Ol</Text>
          </Pressable>
        </Link>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
  },
  muted: {
    fontSize: Typography.fontSize.base,
  },
  link: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
});
