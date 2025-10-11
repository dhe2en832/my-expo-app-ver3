// components/SyncLoadingOverlay.tsx
import React, { useEffect, useState, useRef } from "react";
import {
    View,
    Text,
    Modal,
    ActivityIndicator,
    Animated,
    StyleSheet,
    Dimensions,
} from "react-native";

interface SyncLoadingOverlayProps {
    isVisible: boolean;
    message?: string;
    progress?: number; // ✅ NEW: Tambahkan progress dari 0 sampai 100
}

export function SyncLoadingOverlay({
    isVisible,
    message = "Sinkronisasi otomatis",
    progress = 0, // ✅ NEW: Ambil nilai progress
}: SyncLoadingOverlayProps) {
    const [dotCount, setDotCount] = useState(0);
    const animatedValue = new Animated.Value(0);
    const spinAnim = new Animated.Value(0);
    const progressAnim = useRef(new Animated.Value(0)).current; // ✅ NEW: Untuk animasi progress bar

    // --- Efek Titik Animasi (...) ---
    useEffect(() => {
        if (!isVisible) return;
        const dotInterval = setInterval(() => {
            setDotCount((prev) => (prev + 1) % 4);
        }, 500);
        return () => clearInterval(dotInterval);
    }, [isVisible]);

    // --- Efek Spin Animasi ---
    useEffect(() => {
        if (!isVisible) {
            spinAnim.setValue(0);
            return;
        }

        Animated.loop(
            Animated.timing(spinAnim, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: true,
            })
        ).start();
    }, [isVisible, spinAnim]);

    // --- Efek Pulse Animasi (untuk lingkaran tengah) ---
    useEffect(() => {
        if (!isVisible) return;

        Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [isVisible, animatedValue]);

    // --- Efek Animasi Progress Bar (memperbarui lebar) ---
    useEffect(() => {
        // Update animasi progressAnim setiap kali prop 'progress' berubah
        Animated.timing(progressAnim, {
            toValue: progress,
            duration: 300, // Durasi transisi yang halus
            useNativeDriver: false, // Wajib false untuk animasi property 'width'
        }).start();
    }, [progress, progressAnim]);

    const spinInterpolate = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
    });

    const opacityInterpolate = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.6, 1],
    });

    // ✅ NEW: Interpolasi nilai progress (0-100) menjadi string lebar ("0%" - "100%")
    const progressWidth = progressAnim.interpolate({
        inputRange: [0, 100],
        outputRange: ["0%", "100%"],
    });

    const dots = ".".repeat(dotCount);

    return (
        <Modal visible={isVisible} transparent statusBarTranslucent>
            <View style={styles.container}>
                {/* Semi-transparent backdrop */}
                <View style={styles.backdrop} />

                {/* Card */}
                <View style={styles.card}>
                    {/* Animated Spinner */}
                    <View style={styles.spinnerContainer}>
                        <Animated.View
                            style={[
                                styles.spinner,
                                {
                                    transform: [{ rotate: spinInterpolate }],
                                },
                            ]}
                        />

                        {/* Inner pulsing circle */}
                        <Animated.View
                            style={[
                                styles.pulseCircle,
                                {
                                    opacity: opacityInterpolate,
                                },
                            ]}
                        >
                            <View style={styles.centerDot} />
                        </Animated.View>
                    </View>

                    {/* Text with animated dots */}
                    <View style={styles.textContainer}>
                        <Text style={styles.mainText}>
                            {message}
                            {dots}
                        </Text>
                        <Text style={styles.subText}>Harap tunggu sebentar</Text>
                    </View>

                    {/* Progress indicator */}
                    <View style={styles.progressBar}>
                        <Animated.View
                            style={[
                                styles.progressFill,
                                {
                                    // ✅ NEW: Gunakan interpolated width
                                    width: progressWidth,
                                },
                            ]}
                        />
                    </View>

                    {/* Sync status: Menampilkan Persentase Progress */}
                    <Text style={styles.statusText}>
                        Progress: {Math.floor(progress)}%
                    </Text>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 20,
        paddingVertical: 48,
        paddingHorizontal: 32,
        width: Dimensions.get("window").width * 0.8,
        maxWidth: 320,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 10,
    },
    spinnerContainer: {
        width: 96,
        height: 96,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
        position: "relative",
    },
    spinner: {
        width: 96,
        height: 96,
        borderRadius: 48,
        borderWidth: 4,
        borderColor: "rgba(59, 130, 246, 0.3)",
        borderTopColor: "#3b82f6",
        borderRightColor: "#60a5fa",
        position: "absolute",
    },
    pulseCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: "#3b82f6",
        justifyContent: "center",
        alignItems: "center",
    },
    centerDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: "#fff",
    },
    textContainer: {
        alignItems: "center",
        marginBottom: 16,
    },
    mainText: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1f2937",
        letterSpacing: 0.5,
    },
    subText: {
        fontSize: 14,
        color: "#9ca3af",
        marginTop: 8,
    },
    progressBar: {
        width: "100%",
        height: 4,
        backgroundColor: "#e5e7eb",
        borderRadius: 2,
        overflow: "hidden",
        marginBottom: 12,
    },
    progressFill: {
        height: "100%", // Ubah flex: 1 menjadi height: '100%' untuk bekerja dengan width
        backgroundColor: "#3b82f6",
    },
    statusText: {
        fontSize: 14, // Ditingkatkan agar lebih jelas
        fontWeight: '500',
        color: "#3b82f6", // Warna biru agar terlihat
    },
});
