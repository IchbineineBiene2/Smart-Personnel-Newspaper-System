import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLocalSearchParams } from 'expo-router';

interface UserProfile {
  id: number;
  username: string;
  full_name?: string;
  email: string;
  friend_count?: number;
  friend_status?: 'none' | 'friends' | 'pending' | 'sent';
  friend_request_id?: number;
}

const ProfileSearchScreen = () => {
  const router = useRouter();
  const { query } = useLocalSearchParams<{ query?: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string>('');
  const [loadingActions, setLoadingActions] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const loadToken = async () => {
      try {
        const authModule = require('@/services/auth');
        const storedToken = await authModule.getToken?.();
        if (storedToken) {
          setToken(storedToken);
        }
      } catch (error) {
        console.error('Error loading token:', error);
      }
    };

    loadToken();
  }, []);

  useEffect(() => {
    if (token && query) {
      const initialQuery = Array.isArray(query) ? query[0] : query;
      setSearchQuery(initialQuery);
      searchUsers(initialQuery);
    }
  }, [token, query]);

  const searchUsers = async (query: string) => {
    if (!token || query.length < 2) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:3000/api/contacts/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Fetch profile info for each user to get friend status
        const usersWithProfiles = await Promise.all(
          data.users.map(async (user: UserProfile) => {
            try {
              const profileRes = await fetch(
                `http://localhost:3000/api/contacts/profile/${user.id}`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );
              if (profileRes.ok) {
                const profileData = await profileRes.json();
                return {
                  ...user,
                  friend_count: profileData.friend_count,
                  friend_status: profileData.friend_status,
                  friend_request_id: profileData.friend_request_id,
                };
              }
            } catch (err) {
              console.error('Error fetching profile:', err);
            }
            return user;
          })
        );
        setResults(usersWithProfiles);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    searchUsers(text);
  };

  const handleSendFriendRequest = async (userId: number, index: number) => {
    try {
      setLoadingActions({ ...loadingActions, [userId]: true });
      const response = await fetch(
        `http://localhost:3000/api/friends/request/${userId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        // Update result
        const updatedResults = [...results];
        updatedResults[index].friend_status = 'sent';
        setResults(updatedResults);
        Alert.alert('Başarılı', 'Arkadaşlık isteği gönderildi');
      } else {
        const data = await response.json();
        Alert.alert('Hata', data.error || 'Arkadaşlık isteği gönderilemedi');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Hata', 'Arkadaşlık isteği gönderilemedi');
    } finally {
      setLoadingActions({ ...loadingActions, [userId]: false });
    }
  };

  const openMessage = (userId: number, username: string) => {
    router.push({
      pathname: '/messages/[userId]',
      params: { userId: userId.toString(), username },
    });
  };

  const openProfile = (userId: number, username: string) => {
    router.push({
      pathname: '/profile/[userId]',
      params: { userId: userId.toString(), username },
    });
  };

  const renderUserItem = ({ item, index }: { item: UserProfile; index: number }) => {
    const isFriends = item.friend_status === 'friends';
    const isPending = item.friend_status === 'pending';
    const isSent = item.friend_status === 'sent';
    const isLoading = loadingActions[item.id];

    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => openProfile(item.id, item.username)}
      >
        <View style={styles.userInfo}>
          <Text style={styles.username}>{item.full_name || item.username}</Text>
          <Text style={styles.email}>@{item.username} · {item.email}</Text>
          {item.friend_count !== undefined && (
            <Text style={styles.friendCount}>
              {item.friend_count} arkadaş
            </Text>
          )}
        </View>
        <View style={styles.actionButtons}>
          {isFriends ? (
            <>
              <TouchableOpacity
                style={[styles.button, styles.friendsButton]}
                onPress={() => openMessage(item.id, item.username)}
              >
                <Text style={styles.buttonText}>Mesaj</Text>
              </TouchableOpacity>
            </>
          ) : isPending ? (
            <View style={[styles.button, styles.pendingButton]}>
              <Text style={styles.buttonText}>İstek Bekleniyor</Text>
            </View>
          ) : isSent ? (
            <View style={[styles.button, styles.sentButton]}>
              <Text style={styles.buttonText}>İstek Gönderildi</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.addButton]}
              onPress={() => handleSendFriendRequest(item.id, index)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Arkadaş Ekle</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Kullanıcı ara..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      {loading && <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />}

      {results.length === 0 && searchQuery && !loading && (
        <Text style={styles.noResults}>Kullanıcı bulunamadı</Text>
      )}

      <FlatList
        data={results}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.resultsList}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  resultsList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  email: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  friendCount: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  addButton: {
    backgroundColor: '#007AFF',
  },
  friendsButton: {
    backgroundColor: '#34C759',
  },
  pendingButton: {
    backgroundColor: '#FF9500',
  },
  sentButton: {
    backgroundColor: '#8E8E93',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 11,
    textAlign: 'center',
  },
  noResults: {
    textAlign: 'center',
    color: '#999',
    marginTop: 32,
    fontSize: 14,
  },
});

export default ProfileSearchScreen;
