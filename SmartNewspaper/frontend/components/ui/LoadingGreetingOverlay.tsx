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
    : 'GAZETE.AI';

  if (!isWeb) {
    return (
      <View style={[styles.container, styles.nativeContainer]}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.subtitle}>{subtitleText}</Text>
      </View>
    );
  }

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = (canvas as any).getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Helper to generate target pixels for a specific word
    const getTargetsForWord = (word: string) => {
      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = canvas.width;
      offscreenCanvas.height = canvas.height;
      const oCtx = offscreenCanvas.getContext('2d')!;

      oCtx.fillStyle = 'white';
      // Dynamically size the text based on word length so it always fits
      const fontSize = Math.min(canvas.width / (word.length * 0.55), 220);
      oCtx.font = `900 ${fontSize}px "Inter", "Segoe UI", Arial, sans-serif`;
      oCtx.textAlign = 'center';
      oCtx.textBaseline = 'middle';
      // Draw slightly above center
      oCtx.fillText(word, canvas.width / 2, canvas.height / 2 - 40);

      const imageData = oCtx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      const targets: { x: number; y: number }[] = [];
      const pixelSteps = 6; 

      for (let y = 0; y < canvas.height; y += pixelSteps) {
        for (let x = 0; x < canvas.width; x += pixelSteps) {
          const index = (y * canvas.width + x) * 4;
          if (pixels[index + 3] > 128) {
            targets.push({ x, y });
          }
        }
      }
      return targets;
    };

    // Words to loop between
    const words = [greetingText, formattedUserName];
    const targetsArrays = words.map(w => getTargetsForWord(w));

    // Determine max particles needed
    const maxParticles = Math.max(...targetsArrays.map(t => t.length));

    // Initialize particles randomly
    const particles = Array.from({ length: maxParticles }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      targetX: canvas.width / 2,
      targetY: canvas.height / 2,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      color: `hsla(${200 + Math.random() * 80}, 100%, 75%, ${0.6 + Math.random() * 0.4})`
    }));

    // Function to assign particles to current word targets
    const assignTargets = (targetArray: {x: number, y: number}[]) => {
      // Shuffle array so particles don't map linearly and cross each other beautifully
      const shuffled = [...targetArray].sort(() => Math.random() - 0.5);
      
      particles.forEach((p, i) => {
        const t = shuffled[i % shuffled.length];
        p.targetX = t.x;
        p.targetY = t.y;
      });
    };

    let currentWordIndex = 0;
    assignTargets(targetsArrays[currentWordIndex]);

    let lastSwitchTime = Date.now();

    const animate = () => {
      const now = Date.now();
      
      // Dynamic interval: 2.3 seconds for the fast-forming greeting, 4.5 seconds for the slow-forming name
      const currentInterval = currentWordIndex === 0 ? 2300 : 4500;

      if (now - lastSwitchTime > currentInterval) {
        currentWordIndex = (currentWordIndex + 1) % words.length;
        assignTargets(targetsArrays[currentWordIndex]);
        lastSwitchTime = now;
      }

      // Make the very first greeting word form much faster so it's readable immediately
      // but keep the morphing to the user name slow and elegant.
      const isGreeting = currentWordIndex === 0;
      const currentMaxSpeed = isGreeting ? 7.0 : 2.4;
      const currentMaxForce = isGreeting ? 0.15 : 0.055;

      ctx.fillStyle = 'rgba(7, 10, 18, 0.15)'; // Trail effect
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        let dx = p.targetX - p.x;
        let dy = p.targetY - p.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
           let speed = currentMaxSpeed;
           if (dist < 150) {
              speed = (dist / 150) * currentMaxSpeed;
           }
           
           let desiredX = (dx / dist) * speed;
           let desiredY = (dy / dist) * speed;
           
           let steerX = desiredX - p.vx;
           let steerY = desiredY - p.vy;
           
           let steerDist = Math.sqrt(steerX * steerX + steerY * steerY);
           if (steerDist > currentMaxForce) {
              steerX = (steerX / steerDist) * currentMaxForce;
              steerY = (steerY / steerDist) * currentMaxForce;
           }
           
           p.vx += steerX;
           p.vy += steerY;
        }
        
        p.x += p.vx;
        p.y += p.vy;

        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 2.5, 2.5);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
       canvas.width = window.innerWidth;
       canvas.height = window.innerHeight;
       // Note: To be perfectly responsive, we'd recalculate targets here,
       // but for a brief loading screen, skipping it is fine to save CPU.
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [greetingText, formattedUserName]);

  return (
    <View style={[styles.container, isWeb ? styles.fixedWeb : styles.absoluteNative]}>
      {isWeb && React.createElement('canvas', {
        ref: canvasRef,
        style: { width: '100%', height: '100%', outline: 'none', position: 'absolute', top: 0, left: 0, zIndex: -1 }
      })}
      <Text style={styles.subtitle}>{subtitleText}</Text>
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
  fixedWeb: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: '100vh',
  },
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
