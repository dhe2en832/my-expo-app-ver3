// my-expo-app/components/SplashScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ProgressBar from './ProgressBar'; // Pastikan path benar
import LottieView from 'lottie-react-native';
interface SplashScreenProps {
  progress?: number; // ✅ Opsional
}

export default function SplashScreen({ progress = 0 }: SplashScreenProps) {
  // ✅ Simpan Animated.Value di useRef agar tidak reset saat re-render
  // const scaleValue = React.useRef(new Animated.Value(1)).current;

  // React.useEffect(() => {
  //   const animation = Animated.loop(
  //     Animated.sequence([
  //       Animated.timing(scaleValue, {
  //         toValue: 1.1,
  //         duration: 800,
  //         easing: Easing.inOut(Easing.ease),
  //         useNativeDriver: true,
  //       }),
  //       Animated.timing(scaleValue, {
  //         toValue: 1,
  //         duration: 800,
  //         easing: Easing.inOut(Easing.ease),
  //         useNativeDriver: true,
  //       }),
  //     ])
  //   );
  //   animation.start();

  //   return () => animation.stop();
  // }, [scaleValue]);

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      {/* <Animated.View style={[styles.logoContainer, { transform: [{ scale: scaleValue }] }]}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>SalesApp</Text>
        </View>
      </Animated.View> */}

            {/* ✅ INI TEMPAT ANIMASI LOTTIE — DI TENGAH ATAS */}
      <LottieView
        source={require('../assets/animations/welcome-animation.json')} // ✅ Path ke file .json
        autoPlay
        loop
        style={styles.lottie}
      />

      {/* ✅ Gunakan komponen ProgressBar yang sudah ada */}
      <ProgressBar
        progress={progress}
        height={6}
        backgroundColor="rgba(255,255,255,0.3)"
        progressColor="white"
        containerStyle={{ width: '80%', marginBottom: 20 }}
      />

      <Text style={styles.progressText}>{Math.round(progress)}%</Text>

      <ActivityIndicator size="large" color="white" style={styles.loader} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  lottie: {
    width: 200,
    height: 200,
    marginBottom: 40,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    marginBottom: 40,
  },
  logo: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 20,
    borderRadius: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  progressText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    marginBottom: 30,
  },
  loader: {
    marginTop: 10,
  },
});