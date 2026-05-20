import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useTheme } from '@/hooks/useTheme';
import { getToken, isAdmin, logoutUser } from '@/services/auth';

// ── Types ──────────────────────────────────────────────────────────────────────

type Section = 'dashboard' | 'users' | 'sources' | 'logs';

interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'editor' | 'user';
  status: 'active' | 'suspended' | 'deleted';
  created_at: string;
}

interface AdminSource {
  id: string;
  name: string;
  url: string;
  category: string;
  isActive: boolean;
}

interface AdminLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  module: string;
  message: string;
}

interface AdminStats {
  user_count: number;
  article_count: number;
  top_articles: { title: string; source_name: string }[];
}

const API = 'http://localhost:3000/api';

async function adminFetch(path: string, options?: RequestInit) {
  const token = await getToken();
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
}

// ── Nav config ─────────────────────────────────────────────────────────────────

const NAV: { key: Section; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard',   icon: 'grid-outline' },
  { key: 'users',     label: 'Kullanıcılar', icon: 'people-outline' },
  { key: 'sources',   label: 'Kaynaklar',    icon: 'newspaper-outline' },
  { key: 'logs',      label: 'Loglar',        icon: 'terminal-outline' },
];

// ── Root ───────────────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const { colors } = useTheme();
  const router = useRouter();
  const [section, setSection] = useState<Section>('dashboard');
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    isAdmin().then((ok) => {
      if (!ok) router.replace('/(tabs)/profile' as any);
      else setAuthChecked(true);
    });
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    router.replace('/auth/login');
  };

  if (!authChecked) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Sidebar */}
      <View style={[styles.sidebar, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
        {/* Brand */}
        <View style={styles.brand}>
          <View style={[styles.brandIcon, { backgroundColor: colors.accent }]}>
            <Ionicons name="shield-checkmark" size={18} color="#fff" />
          </View>
          <View>
            <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>Admin</Text>
            <Text style={[styles.brandSub, { color: colors.textMuted }]}>Kontrol Paneli</Text>
          </View>
        </View>

        <View style={[styles.sidebarDivider, { backgroundColor: colors.borderSubtle }]} />

        {/* Nav */}
        <View style={styles.nav}>
          {NAV.map((item) => {
            const active = section === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setSection(item.key)}
                style={[
                  styles.navItem,
                  active && { backgroundColor: colors.accent + '18', borderColor: colors.accent + '40' },
                  !active && { borderColor: 'transparent' },
                ]}
              >
                <Ionicons
                  name={item.icon as any}
                  size={17}
                  color={active ? colors.accent : colors.textMuted}
                />
                <Text style={[styles.navLabel, { color: active ? colors.accent : colors.textSecondary }]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flex: 1 }} />

        <View style={[styles.sidebarDivider, { backgroundColor: colors.borderSubtle }]} />

        {/* Back to app + logout */}
        <Pressable onPress={() => router.replace('/(tabs)/profile' as any)} style={styles.navItem}>
          <Ionicons name="arrow-back-outline" size={17} color={colors.textMuted} />
          <Text style={[styles.navLabel, { color: colors.textMuted }]}>Uygulamaya Dön</Text>
        </Pressable>
        <Pressable onPress={handleLogout} style={styles.navItem}>
          <Ionicons name="log-out-outline" size={17} color="#ef4444" />
          <Text style={[styles.navLabel, { color: '#ef4444' }]}>Çıkış Yap</Text>
        </Pressable>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {section === 'dashboard' && <DashboardSection colors={colors} />}
        {section === 'users'     && <UsersSection     colors={colors} />}
        {section === 'sources'   && <SourcesSection   colors={colors} />}
        {section === 'logs'      && <LogsSection      colors={colors} />}
      </View>
    </View>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

function DashboardSection({ colors }: { colors: any }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch('/admin/stats')
      .then((r) => r.json())
      .then((d) => setStats(d.stats))
      .catch(() => setStats({ user_count: 0, article_count: 0, top_articles: [] }))
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: 'Toplam Kullanıcı', value: stats?.user_count ?? '—', icon: 'people', color: '#6254FF' },
    { label: 'Toplam Makale',    value: stats?.article_count ?? '—', icon: 'newspaper', color: '#10b981' },
    { label: 'Kaynaklar',       value: '6', icon: 'globe', color: '#f59e0b' },
    { label: 'Aktif Loglar',    value: '5', icon: 'pulse', color: '#ef4444' },
  ];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.section}>
      <SectionHeader colors={colors} title="Dashboard" subtitle="Sisteme genel bakış" icon="grid" />

      {loading ? (
        <View style={styles.loadingBox}><ActivityIndicator color={colors.accent} /></View>
      ) : (
        <>
          {/* Stat cards */}
          <View style={styles.statGrid}>
            {statCards.map((s) => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
                <View style={[styles.statIcon, { backgroundColor: s.color + '20' }]}>
                  <Ionicons name={s.icon as any} size={22} color={s.color} />
                </View>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{String(s.value)}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Recent articles */}
          {(stats?.top_articles?.length ?? 0) > 0 && (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Son Makaleler</Text>
              {stats!.top_articles.map((a, i) => (
                <View key={i} style={[styles.listRow, { borderColor: colors.borderSubtle }]}>
                  <View style={[styles.rowDot, { backgroundColor: colors.accent }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>{a.title}</Text>
                    <Text style={[styles.rowSub, { color: colors.textMuted }]}>{a.source_name}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

// ── Users ──────────────────────────────────────────────────────────────────────

function UsersSection({ colors }: { colors: any }) {
  const [users, setUsers]   = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busy, setBusy]     = useState<Record<number, boolean>>({});

  const load = useCallback(() => {
    setLoading(true);
    adminFetch('/admin/users?limit=100')
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateRole = async (userId: number, role: string) => {
    setBusy((b) => ({ ...b, [userId]: true }));
    await adminFetch(`/admin/users/${userId}/role`, {
      method: 'PUT', body: JSON.stringify({ role }),
    }).catch(() => null);
    await load();
    setBusy((b) => ({ ...b, [userId]: false }));
  };

  const updateStatus = async (userId: number, status: string) => {
    setBusy((b) => ({ ...b, [userId]: true }));
    await adminFetch(`/admin/users/${userId}/status`, {
      method: 'PUT', body: JSON.stringify({ status }),
    }).catch(() => null);
    await load();
    setBusy((b) => ({ ...b, [userId]: false }));
  };

  const deleteUser = async (userId: number) => {
    setBusy((b) => ({ ...b, [userId]: true }));
    await adminFetch(`/admin/users/${userId}`, { method: 'DELETE' }).catch(() => null);
    await load();
    setBusy((b) => ({ ...b, [userId]: false }));
  };

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()),
  );

  const roleColor: Record<string, string> = {
    admin: '#6254FF', editor: '#f59e0b', user: '#10b981',
  };
  const statusColor: Record<string, string> = {
    active: '#10b981', suspended: '#f59e0b', deleted: '#ef4444',
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.section}>
      <SectionHeader colors={colors} title="Kullanıcılar" subtitle={`${users.length} kayıt`} icon="people" />

      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
        <Ionicons name="search-outline" size={16} color={colors.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="E-posta veya kullanıcı adı ara..."
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.textPrimary }]}
        />
      </View>

      {loading ? (
        <View style={styles.loadingBox}><ActivityIndicator color={colors.accent} /></View>
      ) : (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          {/* Table header */}
          <View style={[styles.tableHeader, { borderColor: colors.borderSubtle }]}>
            {['Kullanıcı', 'Rol', 'Durum', 'Kayıt', 'İşlem'].map((h) => (
              <Text key={h} style={[styles.tableHeadCell, { color: colors.textMuted }]}>{h}</Text>
            ))}
          </View>

          {filtered.map((u) => (
            <View key={u.id} style={[styles.tableRow, { borderColor: colors.borderSubtle }]}>
              {/* User */}
              <View style={styles.tableCell}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{u.username}</Text>
                <Text style={[styles.rowSub, { color: colors.textMuted }]}>{u.email}</Text>
              </View>

              {/* Role */}
              <View style={styles.tableCell}>
                <View style={styles.roleRow}>
                  {['admin', 'editor', 'user'].map((r) => (
                    <Pressable
                      key={r}
                      onPress={() => updateRole(u.id, r)}
                      disabled={busy[u.id] || u.role === r}
                      style={[
                        styles.rolePill,
                        {
                          backgroundColor: u.role === r ? (roleColor[r] + '30') : colors.surfaceHigh,
                          borderColor: u.role === r ? roleColor[r] : colors.borderSubtle,
                        },
                      ]}
                    >
                      <Text style={[styles.rolePillText, { color: u.role === r ? roleColor[r] : colors.textMuted }]}>
                        {r}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Status */}
              <View style={styles.tableCell}>
                <Pressable
                  onPress={() => updateStatus(u.id, u.status === 'active' ? 'suspended' : 'active')}
                  disabled={busy[u.id] || u.status === 'deleted'}
                  style={[
                    styles.statusBadge,
                    { backgroundColor: (statusColor[u.status] ?? '#888') + '20', borderColor: (statusColor[u.status] ?? '#888') + '50' },
                  ]}
                >
                  <Text style={[styles.statusText, { color: statusColor[u.status] ?? '#888' }]}>
                    {u.status === 'active' ? 'Aktif' : u.status === 'suspended' ? 'Askıya Alındı' : 'Silindi'}
                  </Text>
                </Pressable>
              </View>

              {/* Date */}
              <View style={styles.tableCell}>
                <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                  {new Date(u.created_at).toLocaleDateString('tr-TR')}
                </Text>
              </View>

              {/* Actions */}
              <View style={[styles.tableCell, styles.actionsCell]}>
                {busy[u.id] ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Pressable
                    onPress={() => deleteUser(u.id)}
                    disabled={u.role === 'admin'}
                    style={[styles.deleteBtn, { opacity: u.role === 'admin' ? 0.3 : 1 }]}
                  >
                    <Ionicons name="trash-outline" size={15} color="#ef4444" />
                  </Pressable>
                )}
              </View>
            </View>
          ))}

          {filtered.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Kullanıcı bulunamadı.</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

// ── Sources ────────────────────────────────────────────────────────────────────

function SourcesSection({ colors }: { colors: any }) {
  const [sources, setSources] = useState<AdminSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    adminFetch('/admin/sources')
      .then((r) => r.json())
      .then((d) => setSources(d.sources ?? []))
      .catch(() => setSources([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = sources.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.url.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase()),
  );

  const active   = sources.filter((s) => s.isActive).length;
  const inactive = sources.length - active;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.section}>
      <SectionHeader colors={colors} title="Haber Kaynakları" subtitle={`${sources.length} kaynak`} icon="newspaper" />

      {/* Summary chips */}
      <View style={styles.chipRow}>
        {[
          { label: `${active} Aktif`,   color: '#10b981' },
          { label: `${inactive} Pasif`, color: '#f59e0b' },
        ].map((c) => (
          <View key={c.label} style={[styles.summaryChip, { backgroundColor: c.color + '20', borderColor: c.color + '40' }]}>
            <Text style={[styles.summaryChipText, { color: c.color }]}>{c.label}</Text>
          </View>
        ))}
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
        <Ionicons name="search-outline" size={16} color={colors.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Kaynak ara..."
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.textPrimary }]}
        />
      </View>

      {loading ? (
        <View style={styles.loadingBox}><ActivityIndicator color={colors.accent} /></View>
      ) : (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          {filtered.map((src) => (
            <View key={src.id} style={[styles.sourceRow, { borderColor: colors.borderSubtle }]}>
              <View style={[
                styles.sourceStatus,
                { backgroundColor: src.isActive ? '#10b981' : '#f59e0b' },
              ]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{src.name}</Text>
                <Text style={[styles.rowSub, { color: colors.textMuted }]} numberOfLines={1}>{src.url}</Text>
              </View>
              <View style={[styles.categoryTag, { backgroundColor: colors.accent + '18', borderColor: colors.accent + '30' }]}>
                <Text style={[styles.categoryTagText, { color: colors.accent }]}>{src.category}</Text>
              </View>
              <View style={[
                styles.statusBadge,
                { backgroundColor: (src.isActive ? '#10b981' : '#f59e0b') + '20',
                  borderColor: (src.isActive ? '#10b981' : '#f59e0b') + '40' },
              ]}>
                <Text style={[styles.statusText, { color: src.isActive ? '#10b981' : '#f59e0b' }]}>
                  {src.isActive ? 'Aktif' : 'Pasif'}
                </Text>
              </View>
            </View>
          ))}
          {filtered.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Kaynak bulunamadı.</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

// ── Logs ───────────────────────────────────────────────────────────────────────

function LogsSection({ colors }: { colors: any }) {
  const [logs, setLogs]       = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState<'all' | 'info' | 'warning' | 'error'>('all');
  const [search, setSearch]   = useState('');

  useEffect(() => {
    adminFetch('/admin/logs')
      .then((r) => r.json())
      .then((d) => setLogs(d.logs ?? []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  const levelColor: Record<string, string> = {
    info: '#10b981', warning: '#f59e0b', error: '#ef4444',
  };
  const levelIcon: Record<string, string> = {
    info: 'information-circle', warning: 'warning', error: 'alert-circle',
  };

  const filtered = logs.filter((l) => {
    const matchLevel  = filter === 'all' || l.level === filter;
    const matchSearch = !search || l.message.toLowerCase().includes(search.toLowerCase()) || l.module.toLowerCase().includes(search.toLowerCase());
    return matchLevel && matchSearch;
  });

  const counts = { info: 0, warning: 0, error: 0 };
  logs.forEach((l) => { counts[l.level] = (counts[l.level] ?? 0) + 1; });

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.section}>
      <SectionHeader colors={colors} title="Sistem Logları" subtitle={`${logs.length} kayıt`} icon="terminal" />

      {/* Filter pills */}
      <View style={styles.filterPills}>
        {(['all', 'info', 'warning', 'error'] as const).map((lvl) => {
          const active = filter === lvl;
          const color  = lvl === 'all' ? colors.accent : levelColor[lvl];
          const count  = lvl === 'all' ? logs.length : counts[lvl];
          return (
            <Pressable
              key={lvl}
              onPress={() => setFilter(lvl)}
              style={[
                styles.filterPill,
                { backgroundColor: active ? color + '25' : colors.surface, borderColor: active ? color : colors.borderSubtle },
              ]}
            >
              <Text style={[styles.filterPillText, { color: active ? color : colors.textMuted }]}>
                {lvl === 'all' ? 'Tümü' : lvl.charAt(0).toUpperCase() + lvl.slice(1)} ({count})
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
        <Ionicons name="search-outline" size={16} color={colors.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Log ara..."
          placeholderTextColor={colors.textMuted}
          style={[styles.searchInput, { color: colors.textPrimary }]}
        />
      </View>

      {loading ? (
        <View style={styles.loadingBox}><ActivityIndicator color={colors.accent} /></View>
      ) : (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          {filtered.map((log) => (
            <View key={log.id} style={[styles.logRow, { borderColor: colors.borderSubtle, borderLeftColor: levelColor[log.level] }]}>
              <View style={styles.logHeader}>
                <Ionicons name={levelIcon[log.level] as any} size={15} color={levelColor[log.level]} />
                <Text style={[styles.logModule, { color: levelColor[log.level] }]}>{log.module}</Text>
                <Text style={[styles.logTimestamp, { color: colors.textMuted }]}>{log.timestamp}</Text>
              </View>
              <Text style={[styles.logMessage, { color: colors.textSecondary }]}>{log.message}</Text>
            </View>
          ))}
          {filtered.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Log bulunamadı.</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

// ── Shared ─────────────────────────────────────────────────────────────────────

function SectionHeader({ colors, title, subtitle, icon }: { colors: any; title: string; subtitle: string; icon: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconWrap, { backgroundColor: colors.accent + '18' }]}>
        <Ionicons name={icon as any} size={20} color={colors.accent} />
      </View>
      <View>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Sidebar
  sidebar: {
    width: 220,
    borderRightWidth: 1,
    paddingVertical: 20,
    paddingHorizontal: 12,
    gap: 4,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingBottom: 4 },
  brandIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  brandTitle: { fontSize: 15, fontWeight: '900' },
  brandSub: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  sidebarDivider: { height: 1, marginVertical: 10 },
  nav: { gap: 2 },
  navItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 10, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1,
  },
  navLabel: { fontSize: 13, fontWeight: '700' },

  // Content
  content: { flex: 1 },
  section: { padding: 28, gap: 16 },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  sectionIconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  sectionSubtitle: { fontSize: 12, fontWeight: '600', marginTop: 1 },

  // Stats grid
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    flex: 1, minWidth: 140, borderWidth: 1, borderRadius: 16,
    padding: 18, alignItems: 'flex-start', gap: 10,
  },
  statIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  statLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },

  loadingBox: { paddingVertical: 48, alignItems: 'center' },

  // Card
  card: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  cardTitle: { fontSize: 14, fontWeight: '800', padding: 16, paddingBottom: 8 },

  // List rows
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1,
  },
  rowDot: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  rowTitle: { fontSize: 13, fontWeight: '700' },
  rowSub: { fontSize: 11, fontWeight: '500', marginTop: 1 },

  // Table
  tableHeader: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tableHeadCell: { flex: 1, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  tableCell: { flex: 1 },
  actionsCell: { alignItems: 'center' },

  // Role pills
  roleRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  rolePill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  rolePillText: { fontSize: 10, fontWeight: '800' },

  // Status badge
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '800' },

  // Delete btn
  deleteBtn: { padding: 6, borderRadius: 8 },

  // Search
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '500', outlineWidth: 0 } as any,

  // Sources
  sourceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1,
  },
  sourceStatus: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  categoryTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  categoryTagText: { fontSize: 10, fontWeight: '800' },

  // Chip row
  chipRow: { flexDirection: 'row', gap: 8 },
  summaryChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  summaryChipText: { fontSize: 12, fontWeight: '800' },

  // Logs
  filterPills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filterPill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  filterPillText: { fontSize: 12, fontWeight: '800' },
  logRow: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderLeftWidth: 3, gap: 5,
  },
  logHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  logModule: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  logTimestamp: { fontSize: 10, fontWeight: '600', marginLeft: 'auto' },
  logMessage: { fontSize: 12, lineHeight: 18, fontWeight: '500' },

  emptyText: { padding: 24, textAlign: 'center', fontSize: 13, fontWeight: '600' },
});
