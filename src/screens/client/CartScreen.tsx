import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  ScrollView,
  KeyboardAvoidingView
} from "react-native";
import { useTourCart } from "../../contexts/TourCartContext";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "../../lib/api";
import { API_GLOBAL_PATHS } from "../../lib/apiGlobalPaths";
import { queryClient } from "../../lib/queryClient";
import { Card, CardContent } from "../../components/Card";
import { Button } from "../../components/Button";
import { PropertyPhotoCarousel } from "../../components/PropertyPhotoCarousel";
import { DateTimePickerModal } from "@/components/DateTimePickerModal";
import { useState } from "react";
import { TourRequestFeedbackForm } from "../../components/TourRequestFeedbackForm";
import {
  EMPTY_TOUR_REQUEST_FEEDBACK,
  type TourRequestFeedback,
} from "../../lib/tourRequestFeedback";

const showAlert = (title: string, message: string) => {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
  } else {
    const { Alert } = require("react-native");
    Alert.alert(title, message);
  }
};

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "YYYY-MM-DD" + "HH:MM AM" → "Mon, 14 Jun 2026 · 10:30 AM" */
const formatDateTimeDisplay = (date: string, time: string): string => {
  if (!date) return "";
  const [y, m, d] = date.split("-").map(Number);
  const weekday = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
  });
  const datePart = `${weekday}, ${d} ${MONTH_SHORT[m - 1]} ${y}`;
  return time ? `${datePart}  ·  ${time}` : datePart;
};

export function CartScreen() {
  const { cartItems, removeFromCart, clearCart } = useTourCart();
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [tourFeedback, setTourFeedback] = useState<TourRequestFeedback>(
    EMPTY_TOUR_REQUEST_FEEDBACK,
  );

  const requestTourMutation = useMutation({
    mutationFn: async () => {
      const requestData = {
        preferredDate: preferredDate || null,
        preferredTime: preferredTime,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        notes: tourFeedback,
        propertyIds: cartItems.map((item) => item.id),
      };
      return apiRequest(
        "POST",
        API_GLOBAL_PATHS.clientShowingRequests,
        requestData,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [API_GLOBAL_PATHS.clientTours],
      });
      queryClient.invalidateQueries({
        queryKey: [API_GLOBAL_PATHS.clientShowingRequests],
      });
      const count = cartItems.length;
      clearCart();
      setPreferredDate("");
      setPreferredTime("");
      setTourFeedback(EMPTY_TOUR_REQUEST_FEEDBACK);
      showAlert(
        "Tour Requested!",
        `Your tour request has been submitted for ${count} ${count === 1 ? "property" : "properties"}. Your agent will contact you to schedule.`,
      );
    },
    onError: (error: any) => {
      showAlert(
        "Request Failed",
        error?.response?.data?.message ||
          error?.message ||
          "Could not submit tour request",
      );
    },
  });

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(price);

  const handleRequestTour = () => {
    if (cartItems.length === 0) {
      showAlert("Cart Empty", "Please add at least one property to your tour");
      return;
    }
    if (!preferredDate || !preferredTime) {
      showAlert(
        "Date & Time Required",
        "Please select a preferred date and time for your tour",
      );
      return;
    }
    // if (!tourFeedback.intent || !tourFeedback.timeline) {
    //   showAlert(
    //     "Tour Feedback Required",
    //     "Please select your main goal and expected buying timeline",
    //   );
    //   return;
    // }
    requestTourMutation.mutate();
  };

  const renderItem = ({ item }: { item: any }) => (
    <Card style={styles.propertyCard}>
      <CardContent style={styles.propertyContent}>
        <View style={styles.imageContainer}>
          <PropertyPhotoCarousel
            propertyId={item.id}
            height={80}
            showIndicators={false}
          />
        </View>
        <View style={styles.propertyInfo}>
          <Text style={styles.price}>{formatPrice(item.price)}</Text>
          <Text style={styles.address} numberOfLines={2}>
            {item.address}
          </Text>
          <View style={styles.details}>
            <Text style={styles.detail}>{item.bedrooms} bed</Text>
            <Text style={styles.detailDivider}>•</Text>
            <Text style={styles.detail}>{item.bathrooms} bath</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFromCart(item.id)}
        >
          <Text style={styles.removeText}>✕</Text>
        </TouchableOpacity>
      </CardContent>
    </Card>
  );

  if (cartItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
        <Text style={styles.emptyText}>
          Browse properties and add them to your cart to schedule a tour
        </Text>
      </View>
    );
  }

  const hasDateTime = !!preferredDate && !!preferredTime;


  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.headerText}>
          {cartItems.length}{" "}
          {cartItems.length === 1 ? "property" : "properties"} in your cart
        </Text>

        <FlatList
          scrollEnabled={false}
          data={cartItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />

        <View style={styles.schedulingSection}>
          <Text style={styles.sectionTitle}>Schedule Your Tour</Text>

          {/* ── Single Date & Time field ── */}
          <Text style={styles.fieldLabel}>
            Preferred Date & Time <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={[
              styles.dateTimeInput,
              !hasDateTime && styles.dateTimeInputError,
            ]}
            onPress={() => setShowDateTimePicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.dateTimeIconWrap}>
              <Text style={styles.dateTimeIcon}>📅</Text>
            </View>
            <Text
              style={
                hasDateTime ? styles.dateTimeValue : styles.dateTimePlaceholder
              }
              numberOfLines={1}
            >
              {hasDateTime
                ? formatDateTimeDisplay(preferredDate, preferredTime)
                : "Select date & time"}
            </Text>
            {hasDateTime && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => {
                  setPreferredDate("");
                  setPreferredTime("");
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.clearText}>✕</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <TourRequestFeedbackForm
            value={tourFeedback}
            onChange={setTourFeedback}
          />
        </View>
      </ScrollView>

      {/* Single DateTimePickerModal for both date and time */}
      <DateTimePickerModal
        visible={showDateTimePicker}
        initialDate={preferredDate}
        initialTime={preferredTime}
        onConfirm={({ date, time }) => {
          setPreferredDate(date);
          setPreferredTime(time);
          setShowDateTimePicker(false);
        }}
        onDismiss={() => setShowDateTimePicker(false)}
        minDate={new Date()}
      />

      <View style={styles.footer}>
        <View style={styles.footerInfo}>
          <Text style={styles.footerLabel}>Total Properties</Text>
          <Text style={styles.footerValue}>{cartItems.length}</Text>
        </View>
        <Button
          title={
            requestTourMutation.isPending ? "Submitting..." : "Request Tour"
          }
          onPress={handleRequestTour}
          loading={requestTourMutation.isPending}
          style={styles.submitButton}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 16,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  headerText: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  propertyCard: {
    marginBottom: 12,
  },
  propertyContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    overflow: "hidden",
  },
  propertyInfo: {
    flex: 1,
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e40af",
  },
  address: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
    lineHeight: 18,
  },
  details: {
    flexDirection: "row",
    marginTop: 4,
  },
  detail: {
    fontSize: 12,
    color: "#94a3b8",
  },
  detailDivider: {
    fontSize: 12,
    color: "#94a3b8",
    marginHorizontal: 6,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fee2e2",
    justifyContent: "center",
    alignItems: "center",
  },
  removeText: {
    fontSize: 14,
    color: "#dc2626",
    fontWeight: "600",
  },
  footer: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  footerInfo: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 12,
    color: "#64748b",
  },
  footerValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
  },
  schedulingSection: {
    backgroundColor: "#ffffff",
    marginTop: 12,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 6,
  },
  required: {
    color: "#dc2626",
  },
  dateTimeInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  dateTimeInputError: {
    borderColor: "#fca5a5",
  },
  dateTimeIconWrap: {
    marginRight: 10,
  },
  dateTimeIcon: {
    fontSize: 16,
  },
  dateTimeValue: {
    flex: 1,
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "500",
  },
  dateTimePlaceholder: {
    flex: 1,
    fontSize: 14,
    color: "#94a3b8",
  },
  clearBtn: {
    marginLeft: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },
  clearText: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "700",
  },
  submitButton: {
    flex: 1,
    marginLeft: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
  },
  emptyText: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 8,
    textAlign: "center",
  },
});
