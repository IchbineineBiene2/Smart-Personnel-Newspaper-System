import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { WidgetConfig } from './WidgetCard';

const AVAILABLE: { type: WidgetConfig['type']; title: string; icon: string; desc: string }[] = [
  { type: 'news',     title: 'Son Dakika',       icon: 'newspaper-outline',    desc: 'En güncel haberleri takip edin' },
  { type: 'currency', title: 'Piyasalar',         icon: 'cash-outline',         desc: 'Canlı altın & döviz değerleri' },
  { type: 'weather',  title: 'Hava Durumu',       icon: 'partly-sunny-outline', desc: 'Yerel hava tahmini' },
  { type: 'sports',   title: 'Spor Dünyası',      icon: 'trophy-outline',       desc: 'Maç sonuçları ve spor haberleri' },
  { type: 'calendar', title: 'Takvim & Etkinlik', icon: 'calendar-outline',     desc: 'Günlük program ve hatırlatıcılar' },
  { type: 'stock',    title: 'Borsa',             icon: 'trending-up-outline',  desc: 'Hisse senedi takibi' },
];

interface WidgetPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (type: WidgetConfig['type'], title: string) => void;
}

export function WidgetPicker({ isOpen, onClose, onAdd }: WidgetPickerProps) {
  const { colors } = useTheme();
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim   = useRef(new Animated.Value(0.88)).current;
  const opacAnim    = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: false }),
        Animated.spring(scaleAnim,   { toValue: 1, tension: 70, friction: 12, useNativeDriver: true }),
        Animated.timing(opacAnim,    { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(slideAnim,   { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
        Animated.timing(scaleAnim,   { toValue: 0.88, duration: 180, useNativeDriver: true }),
        Animated.timing(opacAnim,    { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim,   { toValue: 24, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [isOpen]);

  const overlayColor = overlayAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.72)'],
  });

  if (!isOpen) return null;

  return (
    <Modal transparent animationType="none" visible={isOpen} onRequestClose={onClose}>
      {/* Backdrop */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.backdrop, { backgroundColor: overlayColor }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Center Modal */}
      <View style={styles.centeredView} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.modal,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
              opacity: opacAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim },
              ],
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.borderSubtle }]}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Widget Ekle</Text>
              <Text style={[styles.modalSub, { color: colors.textMuted }]}>
                Giriş sayfanızı kişiselleştirmek için bir modül seçin.
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeBtn,
                {
                  backgroundColor: pressed ? colors.surfaceHigh : colors.surfaceHigh,
                  borderColor: colors.borderSubtle,
                },
              ]}
            >
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Grid */}
          <ScrollView
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
          >
            {AVAILABLE.map((item, idx) => (
              <PickerItem
                key={item.type}
                item={item}
                colors={colors}
                delay={idx * 40}
                onPress={() => { onAdd(item.type, item.title); onClose(); }}
              />
            ))}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function PickerItem({
  item,
  colors,
  delay,
  onPress,
}: {
  item: (typeof AVAILABLE)[0];
  colors: any;
  delay: number;
  onPress: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 260,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.pickerItemWrap,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Pressable
        style={({ pressed }) => [
          styles.pickerItem,
          {
            backgroundColor: pressed ? colors.accent + '12' : colors.surfaceHigh,
            borderColor: pressed ? colors.accent + '50' : colors.borderSubtle,
          },
        ]}
        onPress={onPress}
      >
        <View style={[styles.pickerIconWrap, { backgroundColor: colors.accent + '18' }]}>
          <Ionicons name={item.icon as any} size={22} color={colors.accent} />
        </View>
        <View style={styles.pickerText}>
          <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>{item.title}</Text>
          <Text style={[styles.pickerDesc, { color: colors.textMuted }]}>{item.desc}</Text>
        </View>
        <Ionicons name="add-circle-outline" size={20} color={colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    zIndex: 1,
  },
  centeredView: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 2,
  },
  modal: {
    width: '100%',
    maxWidth: 600,
    borderRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: '85%' as any,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 28,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalSub: {
    fontSize: 13,
    marginTop: 3,
    fontWeight: '500',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  grid: {
    padding: 24,
    gap: 10,
  },
  pickerItemWrap: {
    width: '100%',
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  pickerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pickerText: {
    flex: 1,
    gap: 3,
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  pickerDesc: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
});
