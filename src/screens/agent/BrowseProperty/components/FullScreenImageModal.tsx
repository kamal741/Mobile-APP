// components/FullScreenImageModal.tsx
import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Modal,
  StatusBar,
  TouchableOpacity,
  useWindowDimensions,
  StyleSheet,
} from "react-native";
import { PropertyPhoto } from "../../../../components/PropertyPhotoCarousel";
import { ZoomableImage } from "./ZoomableImage";

type Props = {
  visible: boolean;
  photos: PropertyPhoto[];
  startIndex: number;
  onClose: () => void;
};

export function FullScreenImageModal({ visible, photos, startIndex, onClose }: Props) {
  // useWindowDimensions reacts to rotation automatically, unlike Dimensions.get()
  // which only reads the value once at call time.
  const { width: SCREEN_W } = useWindowDimensions();

  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [flatListScrollEnabled, setFlatListScrollEnabled] = useState(true);
  const flatListRef = useRef<FlatList<PropertyPhoto>>(null);

  // Reset to the requested photo whenever the modal is (re)opened.
  useEffect(() => {
    if (visible) setCurrentIndex(startIndex);
  }, [visible, startIndex]);

  // When the width changes (rotation), the FlatList's existing scroll offset
  // (based on the OLD width) no longer points at the correct item boundary.
  // Re-sync it to the currently viewed index using the NEW width, without
  // animation, on the next frame so layout has settled.
  useEffect(() => {
    if (!visible) return;
    const id = requestAnimationFrame(() => {
      flatListRef.current?.scrollToOffset({
        offset: currentIndex * SCREEN_W,
        animated: false,
      });
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [SCREEN_W, visible]);

  if (!visible || photos.length === 0) return null;

  const handleScroll = (e: any) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const width = e.nativeEvent.layoutMeasurement.width;
    if (width === 0) return;
    const index = Math.round(offsetX / width);
    if (index !== currentIndex) setCurrentIndex(index);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar backgroundColor="#000" barStyle="light-content" />
      <View style={styles.backdrop}>
        <FlatList
          key={SCREEN_W} // force fresh layout measurement on orientation change
          ref={flatListRef}
          data={photos}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          scrollEnabled={flatListScrollEnabled}
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          initialScrollIndex={startIndex}
          getItemLayout={(_, index) => ({
            length: SCREEN_W,
            offset: SCREEN_W * index,
            index,
          })}
          renderItem={({ item }) => (
            <ZoomableImage
              uri={item.url}
              onZoomingChange={(zooming) => setFlatListScrollEnabled(!zooming)}
            />
          )}
        />

        <View style={styles.overlay} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          {photos.length > 1 && (
            <View style={styles.counter} pointerEvents="none">
              <Text style={styles.counterText}>
                {currentIndex + 1} / {photos.length}
              </Text>
            </View>
          )}

          <View style={styles.hintWrap} pointerEvents="none">
            <Text style={styles.hint}>
              {photos.length > 1 ? "Swipe to browse  •  " : ""}
              Pinch to zoom  •  Tap ✕ to close
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#000",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
    pointerEvents: "box-none",
  } as any,
  closeBtn: {
    position: "absolute",
    top: 52,
    right: 20,
    backgroundColor: "#ffffff33",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
  },
  counter: {
    position: "absolute",
    top: 58,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  counterText: {
    color: "#ffffffcc",
    fontSize: 13,
    fontWeight: "600",
  },
  hintWrap: {
    position: "absolute",
    bottom: 36,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  hint: {
    color: "#ffffff66",
    fontSize: 12,
    textAlign: "center",
  },
});










// // components/FullScreenImageModal.tsx
// import { useRef, useState } from "react";
// import {
//   View,
//   Text,
//   FlatList,
//   Modal,
//   StatusBar,
//   TouchableOpacity,
//   Dimensions,
//   StyleSheet,
// } from "react-native";
// import { PropertyPhoto } from "../../../../components/PropertyPhotoCarousel";
// import { ZoomableImage } from "./ZoomableImage";

// const { width: SCREEN_W } = Dimensions.get("window");

// type Props = {
//   visible: boolean;
//   photos: PropertyPhoto[];
//   startIndex: number;
//   onClose: () => void;
// };

// export function FullScreenImageModal({ visible, photos, startIndex, onClose }: Props) {
//   const [currentIndex, setCurrentIndex] = useState(startIndex);
//   const [flatListScrollEnabled, setFlatListScrollEnabled] = useState(true);
//   const flatListRef = useRef<FlatList<PropertyPhoto>>(null);

//   if (!visible || photos.length === 0) return null;

//   const handleScroll = (e: any) => {
//     const offsetX = e.nativeEvent.contentOffset.x;
//     const width = e.nativeEvent.layoutMeasurement.width;
//     if (width === 0) return;
//     const index = Math.round(offsetX / width);
//     if (index !== currentIndex) setCurrentIndex(index);
//   };

//   return (
//     <Modal
//       visible={visible}
//       transparent
//       animationType="fade"
//       statusBarTranslucent
//       onRequestClose={onClose}
//     >
//       <StatusBar backgroundColor="#000" barStyle="light-content" />
//       <View style={styles.backdrop}>
//         <FlatList
//           ref={flatListRef}
//           data={photos}
//           keyExtractor={(item) => item.id}
//           horizontal
//           pagingEnabled
//           scrollEnabled={flatListScrollEnabled}
//           showsHorizontalScrollIndicator={false}
//           onScroll={handleScroll}
//           scrollEventThrottle={16}
//           initialScrollIndex={startIndex}
//           getItemLayout={(_, index) => ({
//             length: SCREEN_W,
//             offset: SCREEN_W * index,
//             index,
//           })}
//           renderItem={({ item }) => (
//             <ZoomableImage
//               uri={item.url}
//               onZoomingChange={(zooming) => setFlatListScrollEnabled(!zooming)}
//             />
//           )}
//         />

//         <View style={styles.overlay} pointerEvents="box-none">
//           <TouchableOpacity
//             style={styles.closeBtn}
//             onPress={onClose}
//             hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
//           >
//             <Text style={styles.closeBtnText}>✕</Text>
//           </TouchableOpacity>

//           {photos.length > 1 && (
//             <View style={styles.counter} pointerEvents="none">
//               <Text style={styles.counterText}>
//                 {currentIndex + 1} / {photos.length}
//               </Text>
//             </View>
//           )}

//           <View style={styles.hintWrap} pointerEvents="none">
//             <Text style={styles.hint}>
//               {photos.length > 1 ? "Swipe to browse  •  " : ""}
//               Pinch to zoom  •  Tap ✕ to close
//             </Text>
//           </View>
//         </View>
//       </View>
//     </Modal>
//   );
// }

// const styles = StyleSheet.create({
//   backdrop: {
//     flex: 1,
//     backgroundColor: "#000",
//   },
//   overlay: {
//     ...StyleSheet.absoluteFillObject,
//     zIndex: 10,
//     pointerEvents: "box-none",
//   } as any,
//   closeBtn: {
//     position: "absolute",
//     top: 52,
//     right: 20,
//     backgroundColor: "#ffffff33",
//     borderRadius: 20,
//     width: 40,
//     height: 40,
//     alignItems: "center",
//     justifyContent: "center",
//   },
//   closeBtnText: {
//     color: "#fff",
//     fontSize: 18,
//     fontWeight: "700",
//     lineHeight: 22,
//   },
//   counter: {
//     position: "absolute",
//     top: 58,
//     left: 0,
//     right: 0,
//     alignItems: "center",
//   },
//   counterText: {
//     color: "#ffffffcc",
//     fontSize: 13,
//     fontWeight: "600",
//   },
//   hintWrap: {
//     position: "absolute",
//     bottom: 36,
//     left: 0,
//     right: 0,
//     alignItems: "center",
//   },
//   hint: {
//     color: "#ffffff66",
//     fontSize: 12,
//     textAlign: "center",
//   },
// });
