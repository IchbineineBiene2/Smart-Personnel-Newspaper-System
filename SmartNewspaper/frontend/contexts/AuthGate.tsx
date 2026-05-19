/**
 * AuthGate — guest kullanıcıyı koruyan modal + helper.
 *
 * İki kullanım yolu:
 *
 *   1) Component içinden hook (önerilen):
 *        const { requireAuth } = useAuthGate();
 *        const onLike = async () => {
 *          if (!(await requireAuth('beğeni'))) return;
 *          // ... protected action
 *        };
 *
 *   2) Hook çağıramayan yerlerden (örn. mevcut Rules-of-Hooks sıralaması bozuk
 *      ekranlar): doğrudan `requireAuth(feature)` module-level fonksiyonunu çağır.
 *      AuthGateProvider mount olduğunda kendini global'e bağlar.
 *
 * Token YOKsa modal açılır ("Bu özellik için giriş yap"); kullanıcı CTA'ya
 * tıklarsa /auth/login'e gider.
 */
import { useRouter } from 'expo-router';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { getToken } from '@/services/auth';

interface AuthGateAPI {
  requireAuth: (feature?: string) => Promise<boolean>;
}

const AuthGateContext = createContext<AuthGateAPI | null>(null);

// Module-level registry — Provider mount olunca dolar.
// Hook'sız kullanım için (`requireAuth(...)` doğrudan import edilir).
let globalShowGate: ((feature?: string) => void) | null = null;

/**
 * Hook'sız çağrılabilir requireAuth. Provider mount olmadıysa true döner
 * (uygulama hata vermez), modal açılmaz.
 */
export async function requireAuth(feature?: string): Promise<boolean> {
  const token = await getToken();
  if (token) return true;
  if (globalShowGate) globalShowGate(feature);
  return false;
}

interface ModalState {
  visible: boolean;
  feature?: string;
}

export function AuthGateProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { colors } = useTheme();
  const [modal, setModal] = useState<ModalState>({ visible: false });

  // module-level kanca: hook'suz `requireAuth()` çağrıları buradan modalı tetikler
  useEffect(() => {
    globalShowGate = (feature) => setModal({ visible: true, feature });
    return () => {
      if (globalShowGate) globalShowGate = null;
    };
  }, []);

  const hookApi: AuthGateAPI = {
    requireAuth: async (feature?: string) => {
      const token = await getToken();
      if (token) return true;
      setModal({ visible: true, feature });
      return false;
    },
  };

  const close = () => setModal({ visible: false });
  const goLogin = () => {
    close();
    router.push('/auth/login');
  };
  const goRegister = () => {
    close();
    router.push('/auth/register');
  };

  return (
    <AuthGateContext.Provider value={hookApi}>
      {children}
      <Modal
        visible={modal.visible}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable
            onPress={(e) => (e as any).stopPropagation?.()}
            style={[
              styles.card,
              {
                backgroundColor: colors.surfaceHigh,
                borderColor: colors.borderSubtle,
                shadowColor: colors.black,
              },
            ]}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.accent }]}>
              <Ionicons name="lock-closed" size={26} color={colors.white} />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Giriş gerekli</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              {modal.feature
                ? `${modal.feature.charAt(0).toUpperCase() + modal.feature.slice(1)} için bir hesabın olması gerekiyor.`
                : 'Bu özellik için bir hesabın olması gerekiyor.'}
              {'\n'}Hızlıca giriş yap veya yeni bir hesap aç.
            </Text>

            <View style={styles.actions}>
              <Pressable
                onPress={goRegister}
                style={[styles.secondaryBtn, { borderColor: colors.border }]}
              >
                <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>Kayıt Ol</Text>
              </Pressable>
              <Pressable
                onPress={goLogin}
                style={[styles.primaryBtn, { backgroundColor: colors.accent }]}
              >
                <Text style={[styles.primaryText, { color: colors.white }]}>Giriş Yap</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.white} />
              </Pressable>
            </View>

            <Pressable onPress={close} hitSlop={6} style={styles.closeRow}>
              <Text style={[styles.closeText, { color: colors.textMuted }]}>Şimdi değil</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </AuthGateContext.Provider>
  );
}

export function useAuthGate(): AuthGateAPI {
  const ctx = useContext(AuthGateContext);
  if (!ctx) {
    return { requireAuth: async (f) => requireAuth(f) };
  }
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    gap: Spacing.md,
    alignItems: 'center',
    ...Platform.select({
      web: { boxShadow: '0 24px 64px rgba(0,0,0,0.25)' } as any,
      default: { shadowOpacity: 0.22, shadowRadius: 32, shadowOffset: { width: 0, height: 16 }, elevation: 12 },
    }),
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: Typography.fontSize.base,
    lineHeight: 20,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    width: '100%',
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.medium,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
  },
  closeRow: {
    paddingVertical: 4,
  },
  closeText: {
    fontSize: Typography.fontSize.sm,
  },
});
