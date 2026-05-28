import { Link, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '@/components/auth/AuthShell';
import { AuthInput } from '@/components/auth/AuthInput';
import { AuthButton, AuthError } from '@/components/auth/AuthButton';
import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { registerUser } from '@/services/auth';

function strength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!pw) return { score: 0, label: '' };
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s = Math.min(4, s + 1);
  const labels = ['Çok zayıf', 'Zayıf', 'Orta', 'İyi', 'Güçlü'];
  return { score: Math.min(4, s) as 0 | 1 | 2 | 3 | 4, label: labels[Math.min(4, s)] };
}

export default function RegisterScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const usernameValid = username.length === 0 ? null : /^[a-zA-Z0-9_]{3,24}$/.test(username);
  const emailValid = email.length === 0 ? null : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length === 0 ? null : password.length >= 6;
  const confirmValid = confirmPassword.length === 0 ? null : password === confirmPassword;

  const pw = useMemo(() => strength(password), [password]);
  const meterColors = [colors.error, colors.error, colors.warning, colors.info, colors.success];

  const handleRegister = async () => {
    if (!name.trim() || !username.trim() || !email.trim() || !password.trim()) {
      setError('Tüm alanlar zorunludur.');
      return;
    }
    if (!usernameValid) {
      setError('Kullanıcı adı 3-24 karakter olmalı; sadece harf, rakam ve alt çizgi kullanılabilir.');
      return;
    }
    if (!emailValid) {
      setError('Geçerli bir e-posta gir.');
      return;
    }
    if (!passwordValid) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (!confirmValid) {
      setError('Şifreler birbiriyle eşleşmiyor.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await registerUser({ name, username, email, password });
      router.replace('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt oluşturulamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Aramıza katıl"
      subtitle="Birkaç saniyede hesap aç, akış hemen senin için hazırlansın."
    >
      <AuthInput
        label="Ad Soyad"
        icon="person-outline"
        placeholder="Ad ve soyadın"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        textContentType="name"
      />
      <AuthInput
        label="Kullanıcı adı"
        icon="at-outline"
        placeholder="kullaniciadi"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        valid={usernameValid}
        hint={usernameValid === false ? '3-24 karakter; harf, rakam ve _' : undefined}
      />
      <AuthInput
        label="E-posta"
        icon="mail-outline"
        placeholder="ornek@gazete.ai"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        valid={emailValid}
      />
      <AuthInput
        label="Şifre"
        icon="lock-closed-outline"
        placeholder="En az 6 karakter"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        passwordToggle
      />

      {/* Strength meter */}
      {password.length > 0 && (
        <View style={styles.meterWrap}>
          <View style={styles.meterTrack}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.meterSegment,
                  {
                    backgroundColor: pw.score > i ? meterColors[pw.score] : colors.surfaceHigh,
                  },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.meterLabel, { color: meterColors[pw.score] }]}>{pw.label}</Text>
        </View>
      )}

      <AuthInput
        label="Şifre tekrar"
        icon="lock-closed-outline"
        placeholder="Şifreyi tekrar gir"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        passwordToggle
        valid={confirmValid}
        hint={confirmValid === false ? 'Şifreler eşleşmiyor.' : undefined}
        onSubmitEditing={handleRegister}
      />

      <AuthError message={error} />

      <AuthButton
        label="Hesap oluştur"
        loading={loading}
        onPress={handleRegister}
      />

      <View style={styles.footer}>
        <Text style={[styles.muted, { color: colors.textMuted }]}>Zaten hesabın var mı?</Text>
        <Link href="/auth/login" asChild>
          <Pressable hitSlop={6}>
            <Text style={[styles.link, { color: colors.accent }]}>Giriş Yap</Text>
          </Pressable>
        </Link>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  meterWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: -Spacing.xs,
  },
  meterTrack: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  meterSegment: {
    flex: 1,
    height: 6,
    borderRadius: Radius.sm,
  },
  meterLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    minWidth: 60,
  },
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
