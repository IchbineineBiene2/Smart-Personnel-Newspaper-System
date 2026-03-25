import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';

interface AppHeaderProps {
  title: string;
}

export default function AppHeader({ title }: AppHeaderProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const isWeb = Platform.OS === 'web';
  const [search, setSearch] = useState('');

  return (
    <View
      style={[
        styles.container,
        isWeb ? styles.webContainer : styles.mobileContainer,
        {
          borderColor: colors.borderSubtle,
          backgroundColor: colors.surface,
        },
      ]}
    >
      <View style={styles.leftBlock}>
        <View style={[styles.badge, { backgroundColor: colors.accent }]}>
          <Text style={[styles.logoText, { color: colors.white }]}>SN</Text>
        </View>

        {isWeb ? (
          <View style={styles.brandBlock}>
            <Text numberOfLines={1} style={[styles.brand, { color: colors.textPrimary }]}>Smart Newspaper</Text>
            <Text numberOfLines={1} style={[styles.brandSub, { color: colors.textMuted }]}>
              Personnel Media Hub
            </Text>
          </View>
        ) : (
          <Text numberOfLines={1} style={[styles.title, styles.mobileTitle, { color: colors.textPrimary }]}>
            {title}
          </Text>
        )}
      </View>

      {isWeb ? (
        <View style={styles.webRightRow}>
          <View
            style={[
              styles.searchWrap,
              {
                borderColor: colors.borderSubtle,
                backgroundColor: colors.surfaceHigh,
              },
            ]}
          >
            <Ionicons name="search-outline" size={16} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Gazete, etkinlik veya yazar ara..."
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.textPrimary }]}
              returnKeyType="search"
            />
          </View>

          <View style={styles.sectionPill}>
            <Text style={[styles.sectionPillText, { color: colors.textSecondary }]} numberOfLines={1}>
              {title}
            </Text>
          </View>

          <Pressable
            onPress={() => router.push('/profile')}
            style={({ pressed }) => [
              styles.profileButton,
              {
                borderColor: colors.borderSubtle,
                backgroundColor: pressed ? colors.accentLight : colors.surface,
              },
            ]}
          >
            <Ionicons name="person-circle-outline" size={20} color={colors.textPrimary} />
            <Text style={[styles.profileButtonText, { color: colors.textPrimary }]}>Profil</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.dot, { backgroundColor: colors.accent }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mobileContainer: {
    height: 58,
    paddingHorizontal: 16,
  },
  webContainer: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  leftBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
    flex: 1,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  brandBlock: {
    minWidth: 0,
  },
  brand: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  brandSub: {
    marginTop: 1,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  title: {
    fontWeight: '700',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  mobileTitle: {
    fontSize: 18,
  },
  webRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 16,
  },
  searchWrap: {
    minWidth: 170,
    maxWidth: 420,
    width: '100%',
    height: 40,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  sectionPill: {
    flexShrink: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    height: 32,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    maxWidth: 190,
  },
  sectionPillText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  profileButton: {
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  profileButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
});
