// app/index.tsx
import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import SplashScreen from '@/components/SplashScreen';

export default function Index() {
  const { user, isLoading } = useAuth();
  const [progress, setProgress] = useState(0);

  // Simulasi progress selama auth sedang dicek
  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setProgress((p) => (p >= 100 ? 100 : p + 10));
      }, 150);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  // Setelah auth selesai, pastikan progress = 100 sebelum redirect
  useEffect(() => {
    if (!isLoading) {
      setProgress(100);
    //   const timer = setTimeout(() => {
    //     // Biarkan splash screen tampil sebentar setelah progress 100%
    //   }, 800); // Tahan 0.8 detik setelah loading selesai
    //   return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Tampilkan splash screen selama loading atau progress belum 100%
  if (isLoading || progress < 100) {
    return <SplashScreen progress={progress} />;
  }

  // Setelah siap, redirect berdasarkan status login
  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/login" />;
}