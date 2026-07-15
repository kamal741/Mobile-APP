// PropertyPhotoCarousel.tsx
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import { Image } from "expo-image";
import { useRef, useState, useCallback } from "react";

export interface PropertyPhoto {
  id: string;
  url: string;
  caption?: string | null;
  displayOrder?: number;
  mediaCategory?: string;
  isPreferred?: boolean;
}

interface PropertyPhotoCarouselProps {
  photos: PropertyPhoto[];
  imageUrl?: string | null;
  height?: number;
  showIndicators?: boolean;
  onEnlargePress?: (photos: PropertyPhoto[], startIndex: number) => void;
}

// How many photos to reveal at each milestone index
const LOAD_BATCHES: Record<number, number> = {
  0: 2, // initial: load first 2
  1: 4, // on slide to index 1: load 4 more (total 6)
  2: 4, // on slide to index 2: load 4 more (total 10)
};

export function PropertyPhotoCarousel({
  photos = [],
  imageUrl,
  height = 120,
  showIndicators = true,
  onEnlargePress,
}: PropertyPhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const flatListRef = useRef<FlatList<PropertyPhoto>>(null);

  const resolvedPhotos: PropertyPhoto[] =
    photos.filter(
      (p) => !p.mediaCategory || p.mediaCategory === "Property Photo",
    ).length > 0
      ? photos.filter(
          (p) => !p.mediaCategory || p.mediaCategory === "Property Photo",
        )
      : imageUrl
        ? [{ id: "fallback", url: imageUrl }]
        : [];

  const [loadedCount, setLoadedCount] = useState(() =>
    Math.min(2, resolvedPhotos.length),
  );
  // Tracks the loadedCount threshold at which next load was already triggered
  const triggeredAtCount = useRef<Set<number>>(new Set());
  // Track which milestone indices have already triggered a load
  const loadedMilestones = useRef<Set<number>>(new Set([0]));

  const visiblePhotos = resolvedPhotos.slice(0, loadedCount);

  const lastTriggerAt = useRef<number>(2);

  const maybeLoadMore = useCallback(
    (index: number) => {
      setLoadedCount((prev) => {
        if (prev >= resolvedPhotos.length) return prev; // all loaded
        // Trigger when user is within 2 slots of the end of loaded batch
        if (index >= prev - 2 && !triggeredAtCount.current.has(prev)) {
          triggeredAtCount.current.add(prev);
          return Math.min(prev + 4, resolvedPhotos.length);
        }
        return prev;
      });
    },
    [resolvedPhotos.length],
  );

  if (resolvedPhotos.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>🏠</Text>
        </View>
      </View>
    );
  }

  const goTo = (index: number) => {
    if (containerWidth === 0) return;
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setCurrentIndex(index);
    maybeLoadMore(index);
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const width = e.nativeEvent.layoutMeasurement.width;
    if (width === 0) return;
    const index = Math.round(offsetX / width);
    if (index !== currentIndex) {
      setCurrentIndex(index);
      maybeLoadMore(index);
    }
  };

  return (
    <View
      style={[styles.container, { height }]}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <FlatList
        ref={flatListRef}
        data={visiblePhotos}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        disableIntervalMomentum
        getItemLayout={(_, index) => ({
          length: containerWidth,
          offset: containerWidth * index,
          index,
        })}
        renderItem={({ item, index }) => (
          <Image
            source={{ uri: item.url }}
            style={{ width: containerWidth, height }}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
            recyclingKey={item.id}
            priority={index < 2 ? "high" : "normal"}
          />
        )}
      />

      {/* ── Dot indicators ── */}
      {showIndicators && resolvedPhotos.length > 1 && (
        <View style={styles.dotsContainer}>
          {resolvedPhotos.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === currentIndex && styles.activeDot]}
            />
          ))}
        </View>
      )}

      {/* ── Enlarge button — top-right ── */}
      {onEnlargePress && (
        <TouchableOpacity
          style={styles.enlargeBtn}
          onPress={() => onEnlargePress(resolvedPhotos, currentIndex)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.enlargeBtnText}>⛶</Text>
        </TouchableOpacity>
      )}

      {/* ── Prev / Next arrow buttons ── */}
      {resolvedPhotos.length > 1 && (
        <View style={styles.buttonContainer} pointerEvents="box-none">
          {currentIndex > 0 && (
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => goTo(currentIndex - 1)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.navButtonText}>◀</Text>
            </TouchableOpacity>
          )}
          {currentIndex < resolvedPhotos.length - 1 && (
            <TouchableOpacity
              style={[styles.navButton, styles.navButtonRight]}
              onPress={() => goTo(currentIndex + 1)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.navButtonText}>▶</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#f1f5f9",
    overflow: "hidden",
  },
  placeholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
  },
  placeholderText: {
    fontSize: 32,
  },
  dotsContainer: {
    position: "absolute",
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    paddingVertical: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  activeDot: {
    backgroundColor: "#ffffff",
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  enlargeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#00000066",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    zIndex: 10,
  },
  enlargeBtnText: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 20,
  },
  buttonContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  navButton: {
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  navButtonRight: {
    marginLeft: "auto",
  },
  navButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
});








// // PropertyPhotoCarousel.tsx
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   FlatList,
//   Image,
//   NativeScrollEvent,
//   NativeSyntheticEvent,
// } from "react-native";
// import { useRef, useState, useCallback } from "react";

// export interface PropertyPhoto {
//   id: string;
//   url: string;
//   caption?: string | null;
//   displayOrder?: number;
//   mediaCategory?: string;
//   isPreferred?: boolean;
// }

// interface PropertyPhotoCarouselProps {
//   photos: PropertyPhoto[];
//   imageUrl?: string | null;
//   height?: number;
//   showIndicators?: boolean;
//   onEnlargePress?: (photos: PropertyPhoto[], startIndex: number) => void;
// }

// // How many photos to reveal at each milestone index
// const LOAD_BATCHES: Record<number, number> = {
//   0: 2, // initial: load first 2
//   1: 4, // on slide to index 1: load 4 more (total 6)
//   2: 4, // on slide to index 2: load 4 more (total 10)
// };

// export function PropertyPhotoCarousel({
//   photos = [],
//   imageUrl,
//   height = 120,
//   showIndicators = true,
//   onEnlargePress,
// }: PropertyPhotoCarouselProps) {
//   const [currentIndex, setCurrentIndex] = useState(0);
//   const [containerWidth, setContainerWidth] = useState(0);
//   const flatListRef = useRef<FlatList<PropertyPhoto>>(null);

//   const resolvedPhotos: PropertyPhoto[] =
//     photos.filter(
//       (p) => !p.mediaCategory || p.mediaCategory === "Property Photo",
//     ).length > 0
//       ? photos.filter(
//           (p) => !p.mediaCategory || p.mediaCategory === "Property Photo",
//         )
//       : imageUrl
//         ? [{ id: "fallback", url: imageUrl }]
//         : [];

//   // Track how many photos are currently loaded (sliced from resolvedPhotos)
//   //  const [loadedCount, setLoadedCount] = useState(() =>
//   //     Math.min(2, resolvedPhotos.length)
//   //   );

//   const [loadedCount, setLoadedCount] = useState(() =>
//     Math.min(2, resolvedPhotos.length),
//   );
//   // Tracks the loadedCount threshold at which next load was already triggered
//   const triggeredAtCount = useRef<Set<number>>(new Set());
//   // Track which milestone indices have already triggered a load
//   const loadedMilestones = useRef<Set<number>>(new Set([0]));

//   const visiblePhotos = resolvedPhotos.slice(0, loadedCount);

//   const lastTriggerAt = useRef<number>(2);

//   const maybeLoadMore = useCallback(
//     (index: number) => {
//       setLoadedCount((prev) => {
//         if (prev >= resolvedPhotos.length) return prev; // all loaded
//         // Trigger when user is within 2 slots of the end of loaded batch
//         if (index >= prev - 2 && !triggeredAtCount.current.has(prev)) {
//           triggeredAtCount.current.add(prev);
//           return Math.min(prev + 4, resolvedPhotos.length);
//         }
//         return prev;
//       });
//     },
//     [resolvedPhotos.length],
//   );

//   if (resolvedPhotos.length === 0) {
//     return (
//       <View style={[styles.container, { height }]}>
//         <View style={styles.placeholder}>
//           <Text style={styles.placeholderText}>🏠</Text>
//         </View>
//       </View>
//     );
//   }

//   const goTo = (index: number) => {
//     if (containerWidth === 0) return;
//     flatListRef.current?.scrollToIndex({ index, animated: true });
//     setCurrentIndex(index);
//     maybeLoadMore(index);
//   };

//   const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
//     const offsetX = e.nativeEvent.contentOffset.x;
//     const width = e.nativeEvent.layoutMeasurement.width;
//     if (width === 0) return;
//     const index = Math.round(offsetX / width);
//     if (index !== currentIndex) {
//       setCurrentIndex(index);
//       maybeLoadMore(index);
//     }
//   };

//   return (
//     <View
//       style={[styles.container, { height }]}
//       onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
//     >
//       <FlatList
//         ref={flatListRef}
//         data={visiblePhotos}
//         keyExtractor={(item) => item.id}
//         horizontal
//         pagingEnabled
//         showsHorizontalScrollIndicator={false}
//         onScroll={handleScroll}
//         scrollEventThrottle={16}
//         disableIntervalMomentum
//         getItemLayout={(_, index) => ({
//           length: containerWidth,
//           offset: containerWidth * index,
//           index,
//         })}
//         renderItem={({ item }) => (
//           <Image
//             source={{ uri: item.url }}
//             style={{ width: containerWidth, height }}
//             resizeMode="cover"
//           />
//         )}
//       />

//       {/* ── Dot indicators ── */}
//       {showIndicators && resolvedPhotos.length > 1 && (
//         <View style={styles.dotsContainer}>
//           {resolvedPhotos.map((_, index) => (
//             <View
//               key={index}
//               style={[styles.dot, index === currentIndex && styles.activeDot]}
//             />
//           ))}
//         </View>
//       )}

//       {/* ── Enlarge button — top-right ── */}
//       {onEnlargePress && (
//         <TouchableOpacity
//           style={styles.enlargeBtn}
//           onPress={() => onEnlargePress(resolvedPhotos, currentIndex)}
//           hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
//         >
//           <Text style={styles.enlargeBtnText}>⛶</Text>
//         </TouchableOpacity>
//       )}

//       {/* ── Prev / Next arrow buttons ── */}
//       {resolvedPhotos.length > 1 && (
//         <View style={styles.buttonContainer} pointerEvents="box-none">
//           {currentIndex > 0 && (
//             <TouchableOpacity
//               style={styles.navButton}
//               onPress={() => goTo(currentIndex - 1)}
//               hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
//             >
//               <Text style={styles.navButtonText}>◀</Text>
//             </TouchableOpacity>
//           )}
//           {currentIndex < resolvedPhotos.length - 1 && (
//             <TouchableOpacity
//               style={[styles.navButton, styles.navButtonRight]}
//               onPress={() => goTo(currentIndex + 1)}
//               hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
//             >
//               <Text style={styles.navButtonText}>▶</Text>
//             </TouchableOpacity>
//           )}
//         </View>
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     width: "100%",
//     backgroundColor: "#f1f5f9",
//     overflow: "hidden",
//   },
//   placeholder: {
//     width: "100%",
//     height: "100%",
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: "#f1f5f9",
//   },
//   placeholderText: {
//     fontSize: 32,
//   },
//   dotsContainer: {
//     position: "absolute",
//     bottom: 8,
//     left: 0,
//     right: 0,
//     flexDirection: "row",
//     justifyContent: "center",
//     alignItems: "center",
//     gap: 4,
//     backgroundColor: "rgba(0, 0, 0, 0.3)",
//     paddingVertical: 4,
//   },
//   dot: {
//     width: 6,
//     height: 6,
//     borderRadius: 3,
//     backgroundColor: "rgba(255, 255, 255, 0.5)",
//   },
//   activeDot: {
//     backgroundColor: "#ffffff",
//     width: 8,
//     height: 8,
//     borderRadius: 4,
//   },
//   enlargeBtn: {
//     position: "absolute",
//     top: 10,
//     right: 10,
//     backgroundColor: "#00000066",
//     borderRadius: 6,
//     paddingHorizontal: 7,
//     paddingVertical: 3,
//     zIndex: 10,
//   },
//   enlargeBtnText: {
//     color: "#fff",
//     fontSize: 16,
//     lineHeight: 20,
//   },
//   buttonContainer: {
//     position: "absolute",
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     paddingHorizontal: 8,
//   },
//   navButton: {
//     backgroundColor: "rgba(0, 0, 0, 0.4)",
//     width: 30,
//     height: 30,
//     borderRadius: 15,
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   navButtonRight: {
//     marginLeft: "auto",
//   },
//   navButtonText: {
//     color: "#ffffff",
//     fontSize: 14,
//     fontWeight: "bold",
//   },
// });
