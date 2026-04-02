import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import * as IntentLauncher from 'expo-intent-launcher';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import AppDrawer from '../components/AppDrawer';

const { width, height } = Dimensions.get('window');

// Default system apps to show on home screen
const HOME_APPS = [
  { name: 'Phone', package: 'com.android.dialer', icon: 'call' },
  { name: 'Contacts', package: 'com.android.contacts', icon: 'people' },
  { name: 'Messages', package: 'com.android.mms', icon: 'chatbubbles' },
];

interface Point {
  x: number;
  y: number;
}

export default function Index() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [wallpaperUri, setWallpaperUri] = useState<string | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showWallpaperMenu, setShowWallpaperMenu] = useState(false);
  
  const points = useSharedValue<Point[]>([]);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Load saved wallpaper
  useEffect(() => {
    loadWallpaper();
  }, []);

  const loadWallpaper = async () => {
    try {
      const savedWallpaper = await AsyncStorage.getItem('wallpaper');
      if (savedWallpaper) {
        setWallpaperUri(savedWallpaper);
      }
    } catch (error) {
      console.error('Error loading wallpaper:', error);
    }
  };

  const changeWallpaper = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant photo library access to change wallpaper');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setWallpaperUri(uri);
        await AsyncStorage.setItem('wallpaper', uri);
      }
    } catch (error) {
      console.error('Error changing wallpaper:', error);
      Alert.alert('Error', 'Failed to change wallpaper');
    }
  };

  const launchApp = async (packageName: string, appName: string) => {
    try {
      if (Platform.OS === 'android') {
        await IntentLauncher.startActivityAsync('android.intent.action.MAIN', {
          packageName: packageName,
        });
      } else {
        Alert.alert('Not Available', `${appName} launching is only available on Android`);
      }
    } catch (error) {
      console.error('Error launching app:', error);
      Alert.alert('Error', `Could not launch ${appName}`);
    }
  };

  // Triangle gesture detection
  const isTriangle = (pts: Point[]): boolean => {
    if (pts.length < 20) return false;
    
    // Sample points from the path (start, middle, end)
    const p1 = pts[0];
    const p2 = pts[Math.floor(pts.length / 2)];
    const p3 = pts[pts.length - 1];
    
    // Calculate distances between points
    const dist = (a: Point, b: Point) => 
      Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
    
    const d12 = dist(p1, p2);
    const d23 = dist(p2, p3);
    const d31 = dist(p3, p1);
    
    // Check if it forms a triangle (all sides > minimum length)
    const minSide = 80;
    if (d12 < minSide || d23 < minSide || d31 < minSide) return false;
    
    // Check if the start and end points are close (closed shape)
    const closureThreshold = 60;
    if (d31 > closureThreshold) return false;
    
    // Calculate area using Heron's formula
    const s = (d12 + d23 + d31) / 2;
    const area = Math.sqrt(s * (s - d12) * (s - d23) * (s - d31));
    
    // Minimum area threshold
    return area > 1000;
  };

  const onGestureEnd = () => {
    if (isTriangle(points.value)) {
      setShowDrawer(true);
      points.value = [];
    } else {
      points.value = [];
    }
  };

  const triangleGesture = Gesture.Pan()
    .minDistance(10)
    .onUpdate((event) => {
      points.value = [...points.value, { x: event.x, y: event.y }];
    })
    .onEnd(() => {
      runOnJS(onGestureEnd)();
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(800)
    .onStart(() => {
      runOnJS(setShowWallpaperMenu)(true);
    });

  const composedGesture = Gesture.Race(triangleGesture, longPressGesture);

  const formatTime = (date: Date) => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    return `${hours}:${minutes} ${ampm}`;
  };

  const formatDate = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={[styles.background, !wallpaperUri && styles.defaultBackground]}>
        {wallpaperUri && (
          <ImageBackground
            source={{ uri: wallpaperUri }}
            style={styles.wallpaperImage}
            resizeMode="cover"
          />
        )}
        <GestureDetector gesture={composedGesture}>
          <View style={styles.content}>
            {/* Time and Date Display */}
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
              <Text style={styles.dateText}>{formatDate(currentTime)}</Text>
            </View>

            {/* App Icons - Vertical Right Side */}
            <View style={styles.appsContainer}>
              {HOME_APPS.map((app, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.appButton}
                  onPress={() => launchApp(app.package, app.name)}
                  activeOpacity={0.7}
                >
                  <View style={styles.appIconContainer}>
                    <Ionicons name={app.icon as any} size={32} color="#fff" />
                  </View>
                  <Text style={styles.appName}>{app.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Settings Button */}
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={changeWallpaper}
              activeOpacity={0.7}
            >
              <Ionicons name="image" size={20} color="#fff" />
              <Text style={styles.settingsText}>Wallpaper</Text>
            </TouchableOpacity>
          </View>
        </GestureDetector>

        {/* App Drawer Modal */}
        <AppDrawer
          visible={showDrawer}
          onClose={() => setShowDrawer(false)}
          onLaunchApp={launchApp}
        />

        {/* Wallpaper Menu Modal */}
        {showWallpaperMenu && (
          <View style={styles.menuOverlay}>
            <TouchableOpacity 
              style={styles.menuBackdrop} 
              onPress={() => setShowWallpaperMenu(false)}
              activeOpacity={1}
            />
            <View style={styles.menuContainer}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowWallpaperMenu(false);
                  changeWallpaper();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="image" size={24} color="#fff" />
                <Text style={styles.menuText}>Change Wallpaper</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setShowWallpaperMenu(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#fff" />
                <Text style={styles.menuText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  defaultBackground: {
    backgroundColor: '#1a1a1a',
  },
  wallpaperImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 40,
    paddingLeft: 20,
    paddingRight: 20,
  },
  timeContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  timeText: {
    fontSize: 72,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: 2,
    textShadow: '0px 2px 4px rgba(0, 0, 0, 0.75)',
  },
  dateText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 8,
    textShadow: '0px 1px 3px rgba(0, 0, 0, 0.75)',
  },
  appsContainer: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -150 }],
    gap: 24,
  },
  appButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  appIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  appName: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    textShadow: '0px 1px 3px rgba(0, 0, 0, 0.75)',
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  menuContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 8,
    minWidth: 220,
    borderWidth: 1,
    borderColor: '#333',
    zIndex: 1001,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 16,
    borderRadius: 8,
  },
  menuText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});