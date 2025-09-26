// Utility functions for the Sales App
// utils/helpers.ts
import { SalesOrder } from '@/api/mockData';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

// Tambahkan di paling bawah helpers.ts

// Delay helper (simulasi API delay)
export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};


// Format currency in Indonesian Rupiah
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

// Format date to Indonesian locale
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// Format date and time
export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Format time only
export const formatTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Calculate distance between two coordinates (Haversine formula)
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Check if location is within geofence
export const isWithinGeofence = (
  currentLat: number,
  currentLon: number,
  fenceLat: number,
  fenceLon: number,
  radius: number
): boolean => {
  const distance = calculateDistance(currentLat, currentLon, fenceLat, fenceLon);
  return distance <= radius;
};

// Generate unique ID
export const generateId = (): string => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

// Validate email format
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number (Indonesian format)
export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^(\+62|62|0)8[1-9][0-9]{6,9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// Format phone number
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('62')) {
    return `+${cleaned}`;
  } else if (cleaned.startsWith('0')) {
    return `+62${cleaned.substring(1)}`;
  }
  return `+62${cleaned}`;
};

// Debounce function
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// // Convert image to base64
// export const imageToBase64 = async (uri: string): Promise<string> => {
//   try {
//     const base64 = await FileSystem.readAsStringAsync(uri, {
//       encoding: FileSystem.EncodingType.Base64,
//     });
//     return base64;
//   } catch (error) {
//     console.error('Error converting image to base64:', error);
//     throw error;
//   }
// };

// // Save base64 image to file
// export const saveBase64Image = async (
//   base64: string,
//   filename: string
// ): Promise<string> => {
//   try {
//     const fileUri = `${FileSystem.documentDirectory}${filename}`;
//     await FileSystem.writeAsStringAsync(fileUri, base64, {
//       encoding: FileSystem.EncodingType.Base64,
//     });
//     return fileUri;
//   } catch (error) {
//     console.error('Error saving base64 image:', error);
//     throw error;
//   }
// };

// Convert image to base64
export const imageToBase64 = async (uri: string): Promise<string> => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',  // ✅ gunakan string langsung
    });
    return base64;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
};

// Save base64 image to file
export const saveBase64Image = async (
  base64: string,
  filename: string
): Promise<string> => {
  try {
    const dir = (FileSystem as any).documentDirectory;
    const fileUri = `${dir}${filename}`;
    // const fileUri = `${FileSystem.documentDirectory}${filename}`;

    // Masih works meskipun deprecated
    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: 'base64',
    });

    return fileUri;
  } catch (error) {
    console.error('Error saving base64 image:', error);
    throw error;
  }
};


// Get file info
export const getFileInfo = async (uri: string) => {
  try {
    return await FileSystem.getInfoAsync(uri);
  } catch (error) {
    console.error('Error getting file info:', error);
    return null;
  }
};

// Export data to CSV format
export const exportToCSV = (data: any[], filename: string): string => {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  return csvContent;
};

// Calculate percentage
export const calculatePercentage = (current: number, target: number): number => {
  if (target === 0) return 0;
  return Math.round((current / target) * 100 * 10) / 10; // Round to 1 decimal place
};

// Get status color based on percentage
export const getStatusColor = (percentage: number): string => {
  if (percentage >= 90) return '#4CAF50'; // Green
  if (percentage >= 70) return '#FF9800'; // Orange
  if (percentage >= 50) return '#FFC107'; // Yellow
  return '#f44336'; // Red
};

// Capitalize first letter
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Truncate text
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

// Get greeting based on time
export const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Selamat Pagi';
  if (hour < 17) return 'Selamat Siang';
  return 'Selamat Malam';
};

// Get shift based on time
export const getCurrentShift = (): 'morning' | 'afternoon' | 'night' => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 14) return 'morning';
  if (hour >= 14 && hour < 22) return 'afternoon';
  return 'night';
};

// Validate required fields
export const validateRequiredFields = (
  data: Record<string, any>,
  requiredFields: string[]
): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};
  
  requiredFields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      errors[field] = `${field} is required`;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Format number with thousand separators
export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('id-ID').format(num);
};

// Get platform-specific styles
export const getPlatformStyle = (webStyle: any, nativeStyle: any) => {
  return Platform.OS === 'web' ? webStyle : nativeStyle;
};

// Check if running on web
export const isWeb = (): boolean => {
  return Platform.OS === 'web';
};

// Safe JSON parse
export const safeJsonParse = <T>(jsonString: string, defaultValue: T): T => {
  try {
    return JSON.parse(jsonString);
  } catch {
    return defaultValue;
  }
};

// Generate order number
export const generateOrderNumber = (prefix: string = 'SO'): string => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const timestamp = Date.now().toString().slice(-4);
  
  return `${prefix}-${year}${month}${day}-${timestamp}`;
};

// Calculate tax
export const calculateTax = (amount: number, taxRate: number = 0.11): number => {
  return Math.round(amount * taxRate);
};

// Calculate discount
export const calculateDiscount = (
  amount: number,
  discountType: 'percentage' | 'fixed',
  discountValue: number
): number => {
  if (discountType === 'percentage') {
    return Math.round(amount * (discountValue / 100));
  }
  return discountValue;
};

// Get days between dates
export const getDaysBetween = (date1: string, date2: string): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Check if date is overdue
export const isOverdue = (dueDate: string): boolean => {
  return new Date(dueDate) < new Date();
};

// utils/helper.ts
export const calculateSalesRealization = (orders: SalesOrder[]): { nominal: number; units: number } => {
  return orders.reduce(
    (acc, order) => {
      if (['approved', 'processed'].includes(order.status)) {
        acc.nominal += order.total;
        acc.units += order.items.reduce((sum, item) => sum + item.quantity, 0);
      }
      return acc;
    },
    { nominal: 0, units: 0 }
  );
};