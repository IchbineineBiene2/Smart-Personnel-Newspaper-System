import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { PUBLISHER_ARTICLES } from '@/services/publisherData';

type TemplateKind = 'A4' | 'Tabloid' | 'Booklet';
type DpiKind = 72 | 300 | 600;

const TEMPLATES: TemplateKind[] = ['A4', 'Tabloid', 'Booklet'];
const DPIS: DpiKind[] = [72, 300, 600];

const LAYOUTS: Record<TemplateKind, { width: number; height: number; columns: 1 | 2; label: string }> = {
  A4: { width: 312, height: 436, columns: 1, label: 'A4 Standard' },
  Tabloid: { width: 360, height: 392, columns: 2, label: 'Tabloid' },
  Booklet: { width: 286, height: 364, columns: 1, label: 'Booklet' },
};

export default function PdfPreviewPage() {
  const { colors } = useTheme();
  const [template, setTemplate] = useState<TemplateKind>('A4');
  const [dpi, setDpi] = useState<DpiKind>(300);
  const [headlinesOnly, setHeadlinesOnly] = useState(false);

  const paper = LAYOUTS[template];

  const previewArticles = useMemo(() => {
    const top = PUBLISHER_ARTICLES.slice(0, 4);
    return headlinesOnly ? top.map((item) => ({ ...item, summary: '' })) : top;
  }, [headlinesOnly]);

  const handlePrint = () => {
    Alert.alert('Direct Print', `Template: ${paper.label}\nResolution: ${dpi} DPI`);
  };

  const handleDownload = () => {
    Alert.alert('Download PDF', 'Frontend flow is ready. PDF export backend/service will be connected later.');
  };

  return (
    <ScrollView style={styles(colors).container} contentContainerStyle={styles(colors).content}>
      <Text style={styles(colors).title}>Print Studio</Text>
      <Text style={styles(colors).subtitle}>
        Configure your personalized daily edition for physical archive or digital distribution.
      </Text>

      <Text style={styles(colors).label}>Layout Templates</Text>
      <View style={styles(colors).segmentRow}>
        {TEMPLATES.map((item) => {
          const active = item === template;
          return (
            <Pressable
              key={item}
              style={[styles(colors).segmentButton, active ? styles(colors).segmentButtonActive : null]}
              onPress={() => setTemplate(item)}
            >
              <Text style={[styles(colors).segmentText, active ? styles(colors).segmentTextActive : null]}>
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles(colors).label}>Print Resolution</Text>
      <View style={styles(colors).segmentRow}>
        {DPIS.map((item) => {
          const active = item === dpi;
          return (
            <Pressable
              key={item}
              style={[styles(colors).segmentButton, active ? styles(colors).segmentButtonActive : null]}
              onPress={() => setDpi(item)}
            >
              <Text style={[styles(colors).segmentText, active ? styles(colors).segmentTextActive : null]}>
                {item} DPI
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles(colors).toggleCard} onPress={() => setHeadlinesOnly((v) => !v)}>
        <View>
          <Text style={styles(colors).toggleTitle}>Include Headlines Only</Text>
          <Text style={styles(colors).toggleBody}>Optimized for quick scanning</Text>
        </View>
        <View style={[styles(colors).toggleTrack, headlinesOnly ? styles(colors).toggleTrackActive : null]}>
          <View style={[styles(colors).toggleKnob, headlinesOnly ? styles(colors).toggleKnobActive : null]} />
        </View>
      </Pressable>

      <Pressable style={styles(colors).primaryButton} onPress={handlePrint}>
        <Text style={styles(colors).primaryText}>Direct Print</Text>
      </Pressable>
      <Pressable style={styles(colors).secondaryButton} onPress={handleDownload}>
        <Text style={styles(colors).secondaryText}>Download PDF</Text>
      </Pressable>

      <View style={styles(colors).hintCard}>
        <Text style={styles(colors).hintText}>
          Template selection changes preview dimensions and column layout for A4, Tabloid, and Booklet.
        </Text>
      </View>

      <View style={styles(colors).previewWrap}>
        <View style={[styles(colors).paper, { width: paper.width, height: paper.height }]}>
          <Text style={styles(colors).paperTitle}>The Personnel</Text>
          <Text style={styles(colors).paperSub}>Volume IV · {paper.label} · {dpi} DPI</Text>
          <View style={styles(colors).rule} />

          <View style={[styles(colors).articleZone, paper.columns === 2 ? styles(colors).articleZoneTwo : null]}>
            {previewArticles.map((item) => (
              <View key={item.id} style={[styles(colors).paperCard, paper.columns === 2 ? styles(colors).paperCardTwo : null]}>
                <Text style={styles(colors).paperCardTitle}>{item.title}</Text>
                {item.summary ? <Text style={styles(colors).paperCardBody}>{item.summary}</Text> : null}
              </View>
            ))}
          </View>
        </View>
      </View>
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
      gap: Spacing.md,
      paddingBottom: Spacing.xxl,
    },
    title: {
      color: colors.textPrimary,
      fontFamily: 'serif',
      fontSize: 46,
      lineHeight: 50,
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: Typography.fontSize.md,
      lineHeight: 24,
    },
    label: {
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold,
      marginTop: Spacing.sm,
    },
    segmentRow: {
      flexDirection: 'row',
      gap: Spacing.sm,
    },
    segmentButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Radius.md,
      backgroundColor: colors.surface,
      paddingVertical: Spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentButtonActive: {
      borderColor: colors.accent,
      backgroundColor: colors.surfaceHigh,
    },
    segmentText: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.md,
      fontWeight: Typography.fontWeight.bold,
    },
    segmentTextActive: {
      color: colors.accent,
    },
    toggleCard: {
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: Radius.lg,
      backgroundColor: colors.surface,
      padding: Spacing.lg,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    toggleTitle: {
      color: colors.textPrimary,
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.bold,
    },
    toggleBody: {
      color: colors.textMuted,
      fontSize: Typography.fontSize.base,
      marginTop: Spacing.xs,
    },
    toggleTrack: {
      width: 52,
      height: 30,
      borderRadius: Radius.full,
      backgroundColor: colors.border,
      padding: 3,
      justifyContent: 'center',
    },
    toggleTrackActive: {
      backgroundColor: colors.accent,
    },
    toggleKnob: {
      width: 24,
      height: 24,
      borderRadius: Radius.full,
      backgroundColor: colors.white,
      alignSelf: 'flex-start',
    },
    toggleKnobActive: {
      alignSelf: 'flex-end',
    },
    primaryButton: {
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: Radius.md,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.lg,
    },
    primaryText: {
      color: colors.white,
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.bold,
    },
    secondaryButton: {
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: Radius.md,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.lg,
    },
    secondaryText: {
      color: colors.accent,
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.bold,
    },
    hintCard: {
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: Radius.lg,
      backgroundColor: colors.surface,
      padding: Spacing.lg,
    },
    hintText: {
      color: colors.textSecondary,
      fontSize: Typography.fontSize.base,
      lineHeight: 22,
    },
    previewWrap: {
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      borderRadius: Radius.xl,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: Spacing.xl,
    },
    paper: {
      borderWidth: 1,
      borderColor: colors.borderSubtle,
      backgroundColor: colors.white,
      padding: Spacing.lg,
      gap: Spacing.sm,
    },
    paperTitle: {
      color: colors.black,
      textAlign: 'center',
      fontFamily: 'serif',
      fontSize: 44,
      lineHeight: 50,
    },
    paperSub: {
      color: colors.textMuted,
      textAlign: 'center',
      fontSize: Typography.fontSize.xs,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    rule: {
      height: 2,
      backgroundColor: colors.black,
      marginVertical: Spacing.sm,
    },
    articleZone: {
      flex: 1,
      gap: Spacing.sm,
    },
    articleZoneTwo: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    paperCard: {
      borderBottomWidth: 1,
      borderBottomColor: colors.borderSubtle,
      paddingBottom: Spacing.sm,
    },
    paperCardTwo: {
      width: '48%',
    },
    paperCardTitle: {
      color: colors.black,
      fontFamily: 'serif',
      fontSize: Typography.fontSize.md,
      lineHeight: 24,
    },
    paperCardBody: {
      color: colors.textSecondary,
      fontSize: Typography.fontSize.sm,
      marginTop: Spacing.xs,
      lineHeight: 18,
    },
  });
