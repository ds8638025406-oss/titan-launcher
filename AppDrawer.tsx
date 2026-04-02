import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getInstalledApps } from 'react-native-get-app-list';

interface App {
  appName: string;
  packageName: string;
  versionName?: string;
}

interface AppDrawerProps {
  visible: boolean;
  onClose: () => void;
  onLaunchApp: (packageName: string, appName: string) => void;
}

const AppDrawer: React.FC<AppDrawerProps> = ({ visible, onClose, onLaunchApp }) => {
  const [apps, setApps] = useState<App[]>([]);
  const [filteredApps, setFilteredApps] = useState<App[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadInstalledApps();
    }
  }, [visible]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredApps(apps);
    } else {
      const filtered = apps.filter(app =>
        app.appName.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredApps(filtered);
    }
  }, [searchQuery, apps]);

  const loadInstalledApps = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Not Available', 'App list is only available on Android devices');
      return;
    }

    setLoading(true);
    try {
      const installedApps = await getInstalledApps();
      
      // Sort apps alphabetically
      const sortedApps = installedApps
        .filter((app: App) => app.appName && app.packageName)
        .sort((a: App, b: App) => a.appName.localeCompare(b.appName));
      
      setApps(sortedApps);
      setFilteredApps(sortedApps);
    } catch (error) {
      console.error('Error loading apps:', error);
      Alert.alert('Error', 'Failed to load installed apps. Make sure QUERY_ALL_PACKAGES permission is granted.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppPress = (app: App) => {
    onClose();
    setSearchQuery('');
    onLaunchApp(app.packageName, app.appName);
  };

  const renderAppItem = ({ item }: { item: App }) => (
    <TouchableOpacity
      style={styles.appItem}
      onPress={() => handleAppPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.appIconPlaceholder}>
        <Ionicons name="apps" size={24} color="#666" />
      </View>
      <View style={styles.appInfo}>
        <Text style={styles.appItemName} numberOfLines={1}>
          {item.appName}
        </Text>
        <Text style={styles.packageName} numberOfLines={1}>
          {item.packageName}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>All Apps</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search apps..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* App Count */}
        <View style={styles.countContainer}>
          <Text style={styles.countText}>
            {filteredApps.length} {filteredApps.length === 1 ? 'app' : 'apps'}
          </Text>
        </View>

        {/* Apps List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading apps...</Text>
          </View>
        ) : filteredApps.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="apps-outline" size={64} color="#666" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No apps found' : 'No apps installed'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredApps}
            renderItem={renderAppItem}
            keyExtractor={(item) => item.packageName}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={true}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={10}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
  },
  clearButton: {
    padding: 4,
  },
  countContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  countText: {
    fontSize: 14,
    color: '#999',
  },
  listContent: {
    paddingHorizontal: 8,
    paddingBottom: 20,
  },
  appItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 2,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  appIconPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appInfo: {
    flex: 1,
  },
  appItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  packageName: {
    fontSize: 12,
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
});

export default AppDrawer;