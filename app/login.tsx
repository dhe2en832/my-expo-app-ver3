// my-expo-app/app/login.tsx
// screens/LoginScreen.tsx
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Lock, Building, Eye, EyeOff } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>(''); // boleh kosong
  const [kodeCabang, setKodeCabang] = useState<string>('01');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const { login } = useAuth();
  const passwordRef = useRef<TextInput>(null);
  const branchRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    // Hanya userid dan kodecabang yang wajib
    if (!username.trim() || !kodeCabang.trim()) {
      Alert.alert('Error', 'Username and Branch Code are required');
      return;
    }

    setLoading(true);
    try {
      const success = await login(username, password, kodeCabang);
      if (success) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Login Failed', 'Invalid credentials or branch code');
      }
    } catch (err) {
      console.error('Login error:', err);
      Alert.alert('Login Failed', 'Unable to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert('Forgot Password', 'Please contact your administrator.');
  };

  // Gunakan ScrollView dalam KeyboardAvoidingView untuk keamanan
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.gradient}>
        <KeyboardAvoidingView
          // Gunakan 'padding' untuk semua platform → lebih stabil di Android
          behavior="padding"
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              <View style={styles.header}>
                <Text style={styles.title}>My Expo</Text>
                <Text style={styles.subtitle}>Professional Sales Management</Text>
              </View>

              <View style={styles.form}>
                {/* Username */}
                <View style={styles.inputContainer}>
                  <User color="#666" size={20} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Username"
                    placeholderTextColor="#999"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    onSubmitEditing={() => {
                      // Fokus ke input berikutnya
                      passwordRef.current?.focus();
                    }}
                  />
                </View>

                {/* Password (boleh kosong) */}
                <View style={styles.inputContainer}>
                  <Lock color="#666" size={20} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password (optional)"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => {
                      branchRef.current?.focus();
                    }}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    {showPassword ? (
                      <EyeOff color="#666" size={20} />
                    ) : (
                      <Eye color="#666" size={20} />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Kode Cabang */}
                <View style={styles.inputContainer}>
                  <Building color="#666" size={20} style={styles.inputIcon} />
                  <TextInput
                    ref={branchRef}
                    style={styles.input}
                    placeholder="Branch Code (e.g. 01)"
                    placeholderTextColor="#999"
                    value={kodeCabang}
                    onChangeText={setKodeCabang}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  <Text style={styles.loginButtonText}>
                    {loading ? 'Signing In...' : 'Sign In'}
                  </Text>
                </TouchableOpacity>

                {/* <TouchableOpacity onPress={handleForgotPassword}>
                  <Text style={styles.forgotPassword}>Forgot Password?</Text>
                </TouchableOpacity> */}
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>©batasku-faspro</Text>
                {/* <Text style={styles.footerText}>
                  Username: administrator | Password: (optional) | Branch: 01
                </Text> */}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

// Ref untuk fokus input
const branchRef = React.createRef<TextInput>();

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40, // tambahan ruang bawah saat keyboard muncul
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32, // dikurangi dari 48 → lebih ringkas
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 4,
  },
  loginButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  forgotPassword: {
    color: 'white',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
  },
  footer: {
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 4,
  },
});