import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';
import { getToken } from '@/services/auth';

type FriendStatus = 'none' | 'friends' | 'pending' | 'sent';

interface PublicUser {
  id: number;
  username: string;
  full_name?: string;
  email: string;
  created_at?: string;
  role?: string;
}

interface ProfileResponse {
  user: PublicUser;
  friend_count: number;
  friend_status: FriendStatus;
  friend_request_id?: number | null;
}

export default function PublicProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { userId, username } = useLocalSearchParams<{ userId: string; username?: string }>();

  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const loadProfile = async (authToken?: string | null) => {
    const activeToken = authToken ?? token;
    if (!userId || !activeToken) return;

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3000/api/contacts/profile/${userId}`, {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Profil yuklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getToken().then((storedToken) => {
      setToken(storedToken);
      loadProfile(storedToken);
    });
  }, [userId]);

  const sendFriendRequest = async () => {
    if (!token || !userId) return;

    try {
      setActionLoading(true);
      const response = await fetch(`http://localhost:3000/api/friends/request/${userId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await loadProfile();
      } else {
        const data = await response.json();
        Alert.alert('Hata', data.error || 'Arkadaslik istegi gonderilemedi.');
      }
    } catch (error) {
      console.error('Arkadaslik istegi gonderilemedi:', error);
      Alert.alert('Hata', 'Arkadaslik istegi gonderilemedi.');
    } finally {
      setActionLoading(false);
    }
  };

  const acceptFriendRequest = async () => {
    if (!token || !profile?.friend_request_id) return;

    try {
      setActionLoading(true);
      const response = await fetch(`http://localhost:3000/api/friends/accept/${profile.friend_request_id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await loadProfile();
      } else {
        const data = await response.json();
        Alert.alert('Hata', data.error || 'Arkadaslik istegi kabul edilemedi.');
      }
    } catch (error) {
      console.error('Arkadaslik istegi kabul edilemedi:', error);
      Alert.alert('Hata', 'Arkadaslik istegi kabul edilemedi.');
    } finally {
      setActionLoading(false);
    }
  };

  const removeFriend = async () => {
    if (!token || !userId) return;

    try {
      setActionLoading(true);
      const response = await fetch(`http://localhost:3000/api/friends/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await loadProfile();
      } else {
        const data = await response.json();
        Alert.alert('Hata', data.error || 'Arkadaslik kaldirilamadi.');
      }
    } catch (error) {
      console.error('Arkadaslik kaldirilamadi:', error);
      Alert.alert('Hata', 'Arkadaslik kaldirilamadi.');
    } finally {
      setActionLoading(false);
    }
  };

  const openMessage = () => {
    if (!userId) return;

    router.push({
      pathname: '/messages/[userId]',
      params: { userId, username: profile?.user.username || username || '' },
    });
  };

  const renderFriendAction = () => {
    const status = profile?.friend_status ?? 'none';

    if (actionLoading) {
      return (
        <View style={[styles.actionButton, { backgroundColor: colors.accent }]}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      );
    }

    if (status === 'friends') {
      return (
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.accent }]} onPress={openMessage}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color="#fff" />
            <Text style={styles.actionText}>Mesaj</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.dangerButton]} onPress={removeFriend}>
            <Ionicons name="person-remove-outline" size={16} color="#fff" />
            <Text style={styles.actionText}>Arkadasliktan Cikar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (status === 'pending') {
      return (
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.accent }]} onPress={acceptFriendRequest}>
          <Ionicons name="checkmark" size={16} color="#fff" />
          <Text style={styles.actionText}>Istegi Kabul Et</Text>
        </TouchableOpacity>
      );
    }

    if (status === 'sent') {
      return (
        <View style={[styles.passiveButton, { borderColor: colors.borderSubtle, backgroundColor: colors.surfaceHigh }]}>
          <Ionicons name="time-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.passiveText, { color: colors.textMuted }]}>Istek Gonderildi</Text>
        </View>
      );
    }

    return (
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.accent }]} onPress={sendFriendRequest}>
          <Ionicons name="person-add-outline" size={16} color="#fff" />
          <Text style={styles.actionText}>Arkadas Ekle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: colors.surfaceHigh, borderColor: colors.borderSubtle, borderWidth: 1 }]} onPress={openMessage}>
          <Ionicons name="chatbubble-outline" size={16} color={colors.accent} />
          <Text style={[styles.secondaryActionText, { color: colors.accent }]}>Mesaj Istegi</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading && !profile) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textMuted }}>Profil bulunamadi.</Text>
      </View>
    );
  }

  const displayName = profile.user.full_name || profile.user.username;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.accent} />
        </TouchableOpacity>

        <View style={[styles.avatar, { backgroundColor: colors.accent + '20' }]}>
          <Text style={[styles.avatarText, { color: colors.accent }]}>
            {displayName[0]?.toUpperCase() || '?'}
          </Text>
        </View>

        <Text style={[styles.name, { color: colors.textPrimary }]}>{displayName}</Text>
        <Text style={[styles.handle, { color: colors.textMuted }]}>@{profile.user.username}</Text>
        <Text style={[styles.email, { color: colors.textMuted }]}>{profile.user.email}</Text>

        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: colors.surfaceHigh, borderColor: colors.borderSubtle }]}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{profile.friend_count}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Arkadas</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surfaceHigh, borderColor: colors.borderSubtle }]}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {profile.friend_status === 'friends' ? 'Arkadas' : profile.friend_status === 'sent' ? 'Bekliyor' : profile.friend_status === 'pending' ? 'Istek' : 'Yok'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Durum</Text>
          </View>
        </View>

        {renderFriendAction()}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    padding: 24,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 6,
    marginBottom: 4,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 34,
    fontWeight: '900',
  },
  name: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  handle: {
    fontSize: 14,
    fontWeight: '700',
  },
  email: {
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 8,
  },
  statBox: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
    textTransform: 'uppercase',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    flexWrap: 'wrap',
  },
  actionButton: {
    flex: 1,
    minHeight: 44,
    minWidth: 160,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
  },
  dangerButton: {
    backgroundColor: '#ef4444',
  },
  actionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '900',
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '900',
  },
  passiveButton: {
    minHeight: 44,
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  passiveText: {
    fontSize: 13,
    fontWeight: '900',
  },
});
