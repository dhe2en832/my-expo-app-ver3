// myExpoApp/components/EnhancedFAB.tsx
import React, { useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  PanResponder,
  StyleSheet,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { FABAction, EnhancedFABProps } from "../api/interface";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const FAB_SIZE = 64;
const SUB_FAB_SIZE = 56;
const BOTTOM_OFFSET = 24;
const RIGHT_OFFSET = 24;

const EnhancedFAB: React.FC<EnhancedFABProps> = ({
  fabOpen,
  fabAnim,
  actions,
  onMainPress,
  pan,
  isAnyCheckedIn = false,
}) => {
  const filteredActions = actions.filter((a) => a.onPress);

  const MAX_DRAG_X = SCREEN_WIDTH - FAB_SIZE - RIGHT_OFFSET * 2;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => pan.extractOffset(),
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gesture) => {
        pan.flattenOffset();
        const { dx, dy } = gesture;
        const currentX = (pan.x as any)._value + dx;
        const currentY = (pan.y as any)._value + dy;

        const absX = SCREEN_WIDTH - RIGHT_OFFSET - FAB_SIZE + currentX;
        const finalX =
          absX + FAB_SIZE / 2 > SCREEN_WIDTH / 2 ? 0 : -MAX_DRAG_X;

        const topLimit = -(SCREEN_HEIGHT - FAB_SIZE - BOTTOM_OFFSET * 2);
        const finalY = Math.min(Math.max(currentY, topLimit), 0);

        Animated.parallel([
          Animated.spring(pan.x, {
            toValue: finalX,
            useNativeDriver: true,
            tension: 68,
            friction: 8,
          }),
          Animated.spring(pan.y, {
            toValue: finalY,
            useNativeDriver: true,
            tension: 68,
            friction: 8,
          }),
        ]).start();
      },
    })
  ).current;

  const getSubActionStyle = (index: number) => {
    const distance = (SUB_FAB_SIZE + 16) * (index + 1);
    return {
      transform: [
        {
          scale: fabAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.6, 1],
            extrapolate: "clamp",
          }),
        },
        {
          translateY: fabAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -distance],
            extrapolate: "clamp",
          }),
        },
      ],
      opacity: fabAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0.8, 1],
        extrapolate: "clamp",
      }),
    };
  };

  const rotateAnim = fabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "135deg"],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.fabContainerFixed}>
      <Animated.View
        style={[
          styles.fabContainerDraggable,
          {
            transform: [{ translateX: pan.x }, { translateY: pan.y }],
            opacity: isAnyCheckedIn ? 0.7 : 1,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.subFabArea}>
          {filteredActions
            .slice()
            .reverse()
            .map((action, index) => {
              const reversedIndex = filteredActions.length - 1 - index;
              return (
                <Animated.View
                  key={action.id}
                  style={[styles.subFabItem, getSubActionStyle(reversedIndex)]}
                >
                  <TouchableOpacity
                    style={[
                      styles.subFabButton,
                      { backgroundColor: action.color || "#4CAF50" },
                    ]}
                    onPress={action.onPress}
                    disabled={isAnyCheckedIn}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name={action.icon as any}
                      size={24}
                      color="#fff"
                    />
                  </TouchableOpacity>

                  <Animated.View
                    style={[
                      styles.tooltipContainer,
                      {
                        opacity: fabAnim.interpolate({
                          inputRange: [0.5, 1],
                          outputRange: [0, 1],
                        }),
                      },
                    ]}
                  >
                    {action.label ? (
                      <View
                        style={[
                          styles.tooltip,
                          { backgroundColor: action.color || "#4CAF50" },
                        ]}
                      >
                        <Text style={styles.tooltipText}>
                          {String(action.label)}
                        </Text>
                      </View>
                    ) : null}
                  </Animated.View>
                </Animated.View>
              );
            })}
        </View>

        <TouchableOpacity
          style={[styles.fabMain, isAnyCheckedIn && styles.fabDisabled]}
          onPress={onMainPress}
          disabled={isAnyCheckedIn}
          activeOpacity={0.8}
        >
          <Animated.View style={{ transform: [{ rotate: rotateAnim }] }}>
            <MaterialIcons name="add" size={30} color="#fff" />
          </Animated.View>

          {isAnyCheckedIn && (
            <View style={styles.activeBadge}>
              <MaterialIcons name="location-on" size={12} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  fabContainerFixed: {
    position: "absolute",
    bottom: BOTTOM_OFFSET,
    right: RIGHT_OFFSET,
    zIndex: 1000,
  },
  fabContainerDraggable: {
    alignItems: "flex-end",
  },
  subFabArea: {
    position: "absolute",
    bottom: 0,
    right: 0,
    alignItems: "flex-end",
    justifyContent: "flex-end",
    pointerEvents: "box-none",
  },
  subFabItem: {
    position: "absolute",
    bottom: 0,
    right: (FAB_SIZE - SUB_FAB_SIZE) / 2,
    flexDirection: "row-reverse",
    alignItems: "center",
    zIndex: 99,
    pointerEvents: "box-none",
  },
  subFabButton: {
    width: SUB_FAB_SIZE,
    height: SUB_FAB_SIZE,
    borderRadius: SUB_FAB_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    zIndex: 1,
  },
  fabMain: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: "#667eea",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    position: "relative",
    zIndex: 100,
  },
  tooltipContainer: {
    position: "relative",
    marginRight: 12,
    zIndex: 0,
  },
  tooltip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "rgba(0,0,0,0.85)",
    minWidth: 100,
  },
  tooltipText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  fabDisabled: {
    backgroundColor: "#a0a0a0",
  },
  activeBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#f44336",
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    elevation: 2,
    zIndex: 101,
  },
});

export default EnhancedFAB;
