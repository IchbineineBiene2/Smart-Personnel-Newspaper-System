import React, { useEffect, useRef } from 'react';
import { Platform, View, ActivityIndicator, Text, StyleSheet } from 'react-native';

const GREETINGS: Record<string, string> = {
  tr: 'MERHABA',
  en: 'HELLO',
  de: 'HALLO',
  fr: 'BONJOUR',
  es: 'HOLA',
  ar: 'مرحبا',
};

const SUBTITLES: Record<string, string> = {
  tr: 'Kişisel haber akışınız hazırlanıyor...',
  en: 'Your personalized news feed is getting ready...',
  de: 'Ihr persönlicher Nachrichten-Feed wird vorbereitet...',
  fr: 'Votre fil d’actualité personnalisé se prépare...',
  es: 'Tu feed de noticias personalizado se está preparando...',
  ar: 'يتم تجهيز موجز الأخبار المخصص لك...',
};

interface LoadingGreetingOverlayProps {
  languageCode: string;
  userName?: string;
}

export function LoadingGreetingOverlay({ languageCode, userName }: LoadingGreetingOverlayProps) {
  const isWeb = Platform.OS === 'web';
  
  // Resolve localized texts
  const safeLang = GREETINGS[languageCode] ? languageCode : 'tr';
  const greetingText = GREETINGS[safeLang];
  const subtitleText = SUBTITLES[safeLang];
  
  const formattedUserName = userName && userName.trim() !== 'Kullanici' && userName.trim().length > 0 
    ? userName.trim().toUpperCase() 
    : 'HABERDAR';

  if (!isWeb) {
    return (
      <View style={[styles.container, styles.nativeContainer]}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.subtitle}>{subtitleText}</Text>
      </View>
    );
  }

  // Web rendering with Hamster Loader
  const { HamsterLoader } = require('./HamsterLoader');

  return (
    <View style={[styles.container, styles.fixedWeb]}>
      <HamsterLoader />
      <Text style={[styles.subtitle, { position: 'relative', marginTop: 20, bottom: 0 }]}>{subtitleText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#070A12',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
  },
  fixedWeb: Platform.OS === 'web' ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  } as any : {},
  absoluteNative: {
    ...StyleSheet.absoluteFillObject,
  },
  nativeContainer: {
    flex: 1,
  },
  subtitle: {
    color: '#9ca3af', // textMuted
    position: 'absolute',
    bottom: '15%',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 20,
  }
});
