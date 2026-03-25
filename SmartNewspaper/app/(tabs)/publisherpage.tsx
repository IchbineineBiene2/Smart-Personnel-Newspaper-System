import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useHiddenPublisherState } from '@/hooks/useHiddenPublisherState';
import { useTheme } from '@/hooks/useTheme';
import { PUBLISHERS, PUBLISHER_FILTERS } from '@/services/publisherData';

export default function PublisherPage() {
  const router = useRouter();
  const { colors } = useTheme();
  const { followedIds, toggleFollow } = useHiddenPublisherState();

  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All Sources');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return PUBLISHERS.filter((item) => {
      const passFilter = activeFilter === 'All Sources' || item.category === activeFilter;
      const passSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);

      return passFilter && passSearch;
    });
  }, [activeFilter, query]);

  return (
    <ScrollView style={styles(colors).container} contentContainerStyle={styles(colors).content}>
      <Text style={styles(colors).title}>Explore Publishers</Text>
      <Text style={styles(colors).subtitle}>
        Discover curated editorial voices and explore source-based news streams.
      </Text>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name, category, or keyword"
        placeholderTextColor={colors.textMuted}
        style={styles(colors).searchInput}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles(colors).filterRow}>
        {PUBLISHER_FILTERS.map((filter) => {
          const active = activeFilter === filter;
          return (
            <Pressable
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[styles(colors).chip, active ? styles(colors).chipActive : null]}
            >
              <Text style={[styles(colors).chipText, active ? styles(colors).chipTextActive : null]}>{filter}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {filtered.map((publisher) => {
        const followed = followedIds.includes(publisher.id);

        return (
          <Pressable
            key={publisher.id}
            style={styles(colors).card}
            onPress={() => router.push(`/publisherprofile?id=${publisher.id}` as any)}
          >
            <View style={styles(colors).cardTop}>
              <View style={styles(colors).logoBox}>
                <Text style={styles(colors).logoText}>{publisher.logoText}</Text>
              </View>

              <Pressable
                style={[styles(colors).followButton, followed ? styles(colors).followButtonActive : null]}
                onPress={() => toggleFollow(publisher.id)}
              >
                <Text style={[styles(colors).followText, followed ? styles(colors).followTextActive : null]}>
                  {followed ? 'Following' : '+ Follow'}
                </Text>
              </Pressable>
            </View>

            <Text style={styles(colors).categoryTag}>{publisher.category.toUpperCase()}</Text>
            <Text style={styles(colors).cardTitle}>{publisher.name}</Text>
            <Text style={styles(colors).cardBody}>{publisher.description}</Text>

            <View style={styles(colors).metaRow}>
              <Text style={styles(colors).metaText}>{publisher.readers} Readers</Text>
              <Text style={styles(colors).metaText}>{publisher.cadence}</Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: Spacing.lg,
      paddingBottom: Spacing.xxl,
      gap: Spacing.md,
    },
    title: {
      color: colors.textPrimary,
      fontSize: 42,
      lineHeight: 46,
      fontFamily: 'serif',
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: Typography.fontSize.md,
      lineHeight: 24,
    },
    searchInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.md,
      backgroundColor: colors.surface,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.md,
      color: colors.textPrimary,
      fontSize: Typography.fontSize.base,
    },
    filterRow: {
      gap: Spacing.sm,
      paddingRight: Spacing.lg,
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: Radius.md,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      minHeight: 42,
      justifyContent: 'center',
    },
    chipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accent,
    },
    chipText: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
    },
    chipTextActive: {
      color: colors.white,
    },
    card: {
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    cardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    logoBox: {
      width: 48,
      height: 48,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceHigh,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoText: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold,
    },
    followButton: {
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: Radius.full,
      paddingVertical: Spacing.sm,
      paddingHorizontal: Spacing.md,
      backgroundColor: colors.surface,
    },
    followButtonActive: {
      backgroundColor: colors.accent,
    },
    followText: {
      color: colors.accent,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold,
    },
    followTextActive: {
      color: colors.white,
    },
    categoryTag: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.xs,
      letterSpacing: 1,
      fontWeight: Typography.fontWeight.medium,
    },
    cardTitle: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.xl,
      fontFamily: 'serif',
    },
    cardBody: {
      color: colors.textSecondary,
      fontSize: Typography.fontSize.base,
      lineHeight: 22,
    },
    metaRow: {
      borderTopWidth: 1,
      borderTopColor: colors.borderSubtle,
      marginTop: Spacing.sm,
      paddingTop: Spacing.sm,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    metaText: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.sm,
    },
  });
