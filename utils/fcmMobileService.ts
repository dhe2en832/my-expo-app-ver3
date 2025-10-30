// utils/fcmMobileService.ts
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import apiClient from '@/api/axiosConfig';

// Konfigurasi Notifikasi untuk Expo
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Konfigurasi channel untuk Android
if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
  });
}

class FCMMobileService {
  private token: string | null = null;
  private notificationListeners: (() => void)[] = [];
  private isInitialized: boolean = false;

  /**
   * Get Expo Project ID dari config
   */
  private getExpoProjectId(): string {
    try {
      // ✅ PROJECT ID ANDA: 5d2044e0-3004-4f1e-afc9-07ac9aa8c6f5
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ||
        Constants.manifest?.extra?.expoClient?.extra?.eas?.projectId;

      if (projectId) {
        console.log('✅ Found Expo Project ID:', projectId);
        return projectId;
      }

      throw new Error('Expo Project ID not found in app config');
    } catch (error) {
      console.error('❌ Error getting Expo Project ID:', error);
      // Fallback ke project ID hardcoded
      return "5d2044e0-3004-4f1e-afc9-07ac9aa8c6f5";
    }
  }

  /**
   * Initialize FCM service
   */
  async initialize(): Promise<string | null> {
    try {
      if (this.isInitialized && this.token) {
        console.log('ℹ️ FCM already initialized');
        return this.token;
      }

      console.log('🚀 Initializing FCM service...');

      // Cek apakah device support push notifications
      if (!Device.isDevice) {
        console.warn('⚠️ Push notifications not supported on emulators');
        return null;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        console.log('📝 Requesting notification permissions...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('❌ Notification permissions not granted');
        return null;
      }

      // Get Expo Project ID
      const projectId = this.getExpoProjectId();

      // Get Expo push token
      console.log('🔑 Getting Expo push token...');
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId
      });

      this.token = tokenData.data;
      this.isInitialized = true;

      console.log('✅ FCM Token received:', this.token.substring(0, 20) + '...');

      return this.token;

    } catch (error) {
      console.error('❌ FCM initialization error:', error);
      return null;
    }
  }

  /**
   * Register token ke backend server dengan retry logic
   */
  async registerTokenWithServer(deviceName?: string, maxRetries: number = 3): Promise<any> {
    if (!this.token) {
      throw new Error('No FCM token available');
    }

    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📡 Registering token with server (attempt ${attempt}/${maxRetries})...`);

        const response = await apiClient.post('/device/register', {
          fcm_token: this.token,
          device_name: deviceName || Device.deviceName || 'Unknown Device',
          device_platform: Platform.OS,
          device_version: Platform.Version.toString(),
          device_model: Device.modelName || 'Unknown Model',
          device_brand: Device.brand || 'Unknown Brand'
        });

        console.log('✅ Token registered with server:', response.data);
        return response.data;

      } catch (error: any) {
        lastError = error;
        console.warn(`⚠️ Registration attempt ${attempt} failed:`, error.message);

        if (attempt < maxRetries) {
          // Tunggu sebelum retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    console.error('❌ All registration attempts failed');
    throw lastError;
  }

  /**
   * Unregister token dari server (saat logout)
   */
  async unregisterTokenFromServer(): Promise<void> {
    if (!this.token) {
      console.log('ℹ️ No token to unregister');
      return;
    }

    try {
      console.log('📡 Unregistering token from server...');

      await apiClient.post('/device/unregister', {
        fcm_token: this.token
      });

      console.log('✅ Token unregistered from server');

    } catch (error: any) {
      console.error('❌ Failed to unregister token:', error.message);
      // Jangan throw error agar logout tetap berjalan
    } finally {
      this.clearToken();
    }
  }

  /**
   * Unregister semua tokens user (full logout)
   */
  async unregisterAllTokens(): Promise<void> {
    try {
      console.log('📡 Unregistering all devices...');

      await apiClient.post('/device/unregister-all');

      console.log('✅ All devices unregistered');
    } catch (error: any) {
      console.error('❌ Failed to unregister all tokens:', error.message);
    } finally {
      this.clearToken();
    }
  }

  /**
   * Setup notification listeners
   */
  setupNotificationListeners(navigation: any): () => void {
    // Listener untuk notifikasi yang diterima saat app foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('📲 Notification received in foreground:', {
        title: notification.request.content.title,
        body: notification.request.content.body,
        data: notification.request.content.data
      });

      // Bisa tambahkan logic untuk menampilkan custom UI di sini
      this.handleForegroundNotification(notification);
    });

    // Listener untuk notifikasi yang diklik/dibuka
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification response:', {
        action: response.actionIdentifier,
        data: response.notification.request.content.data
      });

      // Handle navigation based on notification data
      this.handleNotificationNavigation(response.notification, navigation);
    });

    // Simpan listeners untuk cleanup
    this.notificationListeners.push(() => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    });

    // Return cleanup function
    return () => {
      this.notificationListeners.forEach(cleanup => cleanup());
      this.notificationListeners = [];
    };
  }

  /**
   * Handle foreground notification (bisa untuk custom UI)
   */
  private handleForegroundNotification(notification: any): void {
    // Bisa implement custom in-app notification UI di sini
    // Contoh: show toast, update badge, dll.

    // Update app badge (jika diperlukan)
    // Notifications.setBadgeCountAsync(1);
  }

  /**
   * Handle navigation ketika notifikasi diklik
   */
  private handleNotificationNavigation(notification: any, navigation: any): void {
    const data = notification.request.content.data;
    console.log('🧭 Handling notification navigation:', data);

    // Clear badge ketika notifikasi dibuka
    Notifications.setBadgeCountAsync(0);

    // Implement navigation logic based on notification type
    if (data.screen && navigation) {
      try {
        const navigateParams: any = {
          ...(data.params || {})
        };

        switch (data.screen) {
          case 'SalesOrderDetail':
            navigation.navigate('SalesOrder', {
              screen: 'SalesOrderDetail',
              params: { orderId: data.orderId || data.id, ...navigateParams }
            });
            break;
          case 'PPIDetail':
            navigation.navigate('PPI', {
              screen: 'PPIDetail',
              params: { ppiId: data.ppiId || data.id, ...navigateParams }
            });
            break;
          case 'RKSList':
            navigation.navigate('RKS', navigateParams);
            break;
          case 'Dashboard':
            navigation.navigate('Dashboard', navigateParams);
            break;
          case 'Home':
            navigation.navigate('Home', navigateParams);
            break;
          default:
            // Default navigation ke screen yang ditentukan atau home
            if (data.screen) {
              navigation.navigate(data.screen, navigateParams);
            } else {
              navigation.navigate('Home');
            }
        }
      } catch (error) {
        console.error('Navigation error:', error);
        // Fallback ke home screen
        navigation.navigate('Home');
      }
    } else {
      // Fallback navigation
      navigation.navigate('Home');
    }
  }

  /**
   * Get current FCM token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Check if FCM is initialized
   */
  isServiceInitialized(): boolean {
    return this.isInitialized && this.token !== null;
  }

  /**
   * Clear token dan reset state
   */
  clearToken(): void {
    this.token = null;
    this.isInitialized = false;
    console.log('🧹 FCM token cleared');
  }

  /**
   * Health check - cek status registrasi device
   */
  async healthCheck(): Promise<boolean> {
    if (!this.token) {
      return false;
    }

    try {
      const response = await apiClient.post('/device/health-check', {
        fcm_token: this.token
      });

      return response.data.isRegistered === true;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Schedule local notification (untuk testing)
   */
  async scheduleLocalNotification(title: string, body: string, data: any = {}) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
        data: data,
        sound: true,
        badge: 1,
      },
      trigger: {
        type: 'timeInterval',
        seconds: 2,
      } as Notifications.TimeIntervalTriggerInput,
    });
  }

  /**
   * Get device info untuk debugging
   */
  getDeviceInfo() {
    return {
      deviceName: Device.deviceName,
      model: Device.modelName,
      brand: Device.brand,
      platform: Platform.OS,
      version: Platform.Version,
      isDevice: Device.isDevice,
    };
  }
}

// Export singleton instance
export const fcmService = new FCMMobileService();

// Export class untuk testing purposes
export default FCMMobileService;