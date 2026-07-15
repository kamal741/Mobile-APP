import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  AlertCircle,
  Bath,
  BedDouble,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  Home,
  LocateFixed,
  MapPin,
  Navigation,
  Pencil,
  Plus,
  StickyNote,
} from "lucide-react-native";

import {
  AgentShowingRequest,
  CalculateRoutePlanPayload,
  RoutePlanResponse,
  UpdateRouteStartPayload,
  useCalculateRoutePlan,
  useUpdateRouteStart,
  useUpdateShowingRequestStatus,
} from "@/lib/agentRoutePlanningAPI";
import { fetchPropertyById } from "@/lib/propertyApi";
import { Property, StartPointOption } from "../types";
import { colors, sharedStyles } from "../theme";
import { START_POINT_OPTIONS } from "../constants";
import { DateTimePickerModal } from "@/components/DateTimePickerModal";
import ClientNotesModal from "../components/modals/ClientNotesModal";
import type { RootStackParamList } from "@/navigation/types";
import { getTourForegroundCoordinates } from "@/lib/tourGeolocation";
// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgentWorkAddress {
  street: string;
  unit: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  /** Pre-formatted label shown in the UI, e.g. "123 Main St, Toronto, ON" */
  label: string;
  /** Full formatted address text sent to the API */
  addressText: string;
  latitude: number;
  longitude: number;
}

interface InitialScreenProps {
  showingRequestId: string;
  /** Agent work address resolved by RoutePlanningScreen from /me */
  agentWorkAddress: AgentWorkAddress | null;
  startPoint: StartPointOption;
  onStartPointChange: (option: StartPointOption) => void;
  properties: Property[];
  onPropertiesLoaded: (properties: Property[]) => void;
  /** Raw showing-request data and loading state fetched by the parent */
  showingRequest: AgentShowingRequest | undefined;
  isLoadingRequest: boolean;
  isLoadingAgentMe: boolean;
  /** Called on successful route calculation, receives the plan and the preferred start time */
  onCalculate: (routePlan: RoutePlanResponse, preferredTime: string) => void;
}

// ─── Payload builders ─────────────────────────────────────────────────────────

/** Agent Address — slim custom_address shape (no GPS fields). */
function buildAgentAddressPayload(
  agentWorkAddress: AgentWorkAddress,
): UpdateRouteStartPayload {
  return {
    type: "custom_address",
    label: agentWorkAddress.label,
    addressText: agentWorkAddress.addressText,
    address: {
      street: agentWorkAddress.street,
      unit: agentWorkAddress.unit,
      city: agentWorkAddress.city,
      province: agentWorkAddress.province,
      postalCode: agentWorkAddress.postalCode,
      country: agentWorkAddress.country,
    },
    liveTrafficEnabled: true,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    recalculate: false,
  };
}

/** Current Location — full GPS payload. */
function buildCurrentLocationPayload(
  latitude: number,
  longitude: number,
  accuracyM: number,
): UpdateRouteStartPayload {
  return {
    type: "CURRENT_LOCATION",
    label: "Current Location",
    addressText: "Current Location",
    address: {
      street: "",
      unit: "",
      city: "",
      province: "",
      postalCode: "",
      country: "",
    },
    latitude,
    longitude,
    accuracyM,
    capturedAt: new Date().toISOString(),
    liveTrafficEnabled: true,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    recalculate: false,
    sortMode: "distance",
    departureTime: new Date().toISOString(),
  };
}

function buildCalculatePayload(
  startType: string,
): Pick<
  CalculateRoutePlanPayload,
  "sortMode" | "startType" | "startLabel" | "liveTrafficEnabled" | "timezone"
> {
  return {
    sortMode: "distance",
    startType,
    startLabel:
      startType === "current_location" ? "Current Location" : "Agent Address",
    liveTrafficEnabled: true,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

function formatPreferredDateTime(date?: string, time?: string): string {
  if (!date) return "—";
  try {
    const dt = new Date(date);
    const dateLabel = dt.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    return time ? `${dateLabel} at ${time}` : dateLabel;
  } catch {
    return time ? `${date} | ${time}` : date;
  }
}

/** Convert the selected app-local date and time into an absolute UTC timestamp. */
function localDateTimeToIso(ymd: string, time: string): string {
  const [year, month, day] = ymd.split("-").map(Number);
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!year || !month || !day || !match) {
    return `${ymd}T00:00:00Z`;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
}

/** Extract a YYYY-MM-DD value in the app's current timezone. */
function isoToYmd(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.split("T")[0] ?? "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

// ─── Custom address form state ────────────────────────────────────────────────

interface CustomAddressForm {
  label: string;
  street: string;
  unit: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

const EMPTY_FORM: CustomAddressForm = {
  label: "",
  street: "",
  unit: "",
  city: "",
  province: "",
  postalCode: "",
  country: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

const InitialScreen: React.FC<InitialScreenProps> = ({
  showingRequestId,
  agentWorkAddress,
  startPoint,
  onStartPointChange,
  properties,
  onPropertiesLoaded,
  showingRequest,
  isLoadingRequest,
  isLoadingAgentMe,
  onCalculate,
}) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // ── API hooks ─────────────────────────────────────────────────────────────
  const { mutate: updateRouteStart, isPending: isUpdatingStart } =
    useUpdateRouteStart(showingRequestId);

  const { mutate: calculateRoute, isPending: isCalculating } =
    useCalculateRoutePlan(showingRequestId);

  const { mutate: updateStatus, isPending: isUpdatingDateTime } =
    useUpdateShowingRequestStatus(showingRequestId);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressForm, setAddressForm] = useState<CustomAddressForm>(EMPTY_FORM);

  // ── DateTime picker state ─────────────────────────────────────────────────
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [showClientNotes, setShowClientNotes] = useState(false);
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  // ── Sync requestedProperties upward once the request loads ────────────────
  const propertiesSyncedRef = useRef(false);
  const startPointRequestInFlightRef = useRef(false);

  useEffect(() => {
    if (
      showingRequest?.requestedProperties?.length &&
      !propertiesSyncedRef.current
    ) {
      propertiesSyncedRef.current = true;

      // Seed with placeholder rows immediately so the list is not empty while fetching
      onPropertiesLoaded(
        showingRequest.requestedProperties.map((rp) => ({
          id: rp.id,
          masterPropertyId: rp.masterPropertyId,
          requestedPropertyId: rp.id,
          address: `Property #${rp.masterPropertyId}`,
          price: "",
          beds: 0,
          baths: 0,
        })) as Property[],
      );

      // Fetch real details for every property and replace the placeholders
      const requestedProps = showingRequest.requestedProperties;
      Promise.allSettled(
        requestedProps.map((rp) =>
          fetchPropertyById(rp.masterPropertyId).then((detail) => ({
            id: rp.id,
            masterPropertyId: rp.masterPropertyId,
            requestedPropertyId: rp.id,
            address: `${detail.address}, ${detail.city}, ${detail.province}`,
            price: `$${detail.price.toLocaleString()}`,
            beds: detail.bedrooms,
            baths: detail.bathrooms,
          })),
        ),
      ).then((results) => {
        const resolved = results.map((result, idx) => {
          if (result.status === "fulfilled") return result.value;
          // Keep the placeholder row on failure
          const rp = requestedProps[idx];
          return {
            id: rp.id,
            masterPropertyId: rp.masterPropertyId,
            requestedPropertyId: rp.id,
            address: `Property #${rp.masterPropertyId}`,
            price: "",
            beds: 0,
            baths: 0,
          };
        });
        onPropertiesLoaded(resolved as Property[]);
      });
    }
  }, [showingRequest, onPropertiesLoaded]);

  // ── Start-point selection ─────────────────────────────────────────────────
  const handleStartPointChange = async (option: StartPointOption) => {
    if (startPointRequestInFlightRef.current) return;
    startPointRequestInFlightRef.current = true;
    setLocationError(null);

    if (option === "Agent Address") {
      if (!agentWorkAddress) {
        setLocationError("Your agent address is not available.");
        startPointRequestInFlightRef.current = false;
        return;
      }
      updateRouteStart(buildAgentAddressPayload(agentWorkAddress), {
        onSuccess: () => onStartPointChange(option),
        onError: () =>
          setLocationError("Could not update the route starting point."),
        onSettled: () => {
          startPointRequestInFlightRef.current = false;
        },
      });
      return;
    }

    setIsResolvingLocation(true);
    try {
      const coordinates = await getTourForegroundCoordinates();
      if (!coordinates) {
        setLocationError(
          "Location is unavailable. Allow location access in your device or browser settings and try again.",
        );
        startPointRequestInFlightRef.current = false;
        return;
      }

      updateRouteStart(
        buildCurrentLocationPayload(
          coordinates.latitude,
          coordinates.longitude,
          0,
        ),
        {
          onSuccess: () => onStartPointChange("Current Location"),
          onError: () =>
            setLocationError(
              "Your location was found, but the starting point could not be saved.",
            ),
          onSettled: () => {
            startPointRequestInFlightRef.current = false;
          },
        },
      );
    } catch (err) {
      console.warn("[InitialScreen] Could not get current location:", err);
      setLocationError("Could not read your current location. Please try again.");
      startPointRequestInFlightRef.current = false;
    } finally {
      setIsResolvingLocation(false);
    }
  };

  // ── Custom address modal ──────────────────────────────────────────────────
  const handleAddAddressPress = () => {
    setLocationError(null);
    setAddressForm(EMPTY_FORM);
    setShowAddressModal(true);
  };

  const handleAddressFormSubmit = () => {
    if (startPointRequestInFlightRef.current) return;
    startPointRequestInFlightRef.current = true;

    const addressText = [
      addressForm.street,
      addressForm.unit,
      addressForm.city,
      addressForm.province,
      addressForm.postalCode,
      addressForm.country,
    ]
      .filter(Boolean)
      .join(", ");

    updateRouteStart(
      {
        type: "custom_address",
        label: addressForm.label || addressText,
        addressText,
        address: {
          street: addressForm.street,
          unit: addressForm.unit,
          city: addressForm.city,
          province: addressForm.province,
          postalCode: addressForm.postalCode,
          country: addressForm.country,
        },
        liveTrafficEnabled: true,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        recalculate: false,
      },
      {
        onError: () =>
          setLocationError("Could not save the custom starting address."),
        onSettled: () => {
          startPointRequestInFlightRef.current = false;
        },
      },
    );

    onStartPointChange("Add Address");
    setShowAddressModal(false);
  };

  // ── DateTime edit ─────────────────────────────────────────────────────────
  const handleDateTimeConfirm = ({
    date,
    time,
  }: {
    date: string;
    time: string;
  }) => {
    setShowDateTimePicker(false);
    updateStatus({
      status: showingRequest?.status ?? "pending",
      preferredDate: localDateTimeToIso(date, time),
      preferredTime: time,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  };

  // ── Calculate route ───────────────────────────────────────────────────────
  const handleCalculate = () => {
    const startType =
      startPoint === "Current Location" ? "current_location" : "agent_address";

    calculateRoute(
      buildCalculatePayload(startType) as CalculateRoutePlanPayload,
      {
        onSuccess: (data) =>
          onCalculate(data, showingRequest?.preferredTime ?? ""),
      },
    );
  };

  // ── Derived display values ────────────────────────────────────────────────
  const dateTimeLabel = formatPreferredDateTime(
    showingRequest?.preferredDate,
    showingRequest?.preferredTime,
  );
  const clientLabel = showingRequest?.clientName ?? "—";
  const isBusy = isLoadingRequest || isCalculating;
  const isCalculateDisabled = isBusy || properties.length === 0;
  const selectedStartPointLabel =
    startPoint === "Agent Address"
      ? agentWorkAddress?.label ?? "Agent address unavailable"
      : startPoint === "Current Location"
        ? "Using your current GPS location"
        : [addressForm.street, addressForm.city, addressForm.province]
            .filter(Boolean)
            .join(", ") || "Custom address set";

  // Format structured notes object into a readable string for the modal
  const formattedNotes: string | undefined = (() => {
    const n = showingRequest?.notes;
    if (!n) return undefined;
    if (typeof n === "string") return n || undefined;
    if (typeof n === "object") {
      const parts: string[] = [];
      if (n.intent) parts.push(`Intent: ${n.intent.replace(/_/g, " ")}`);
      if (n.timeline) parts.push(`Timeline: ${n.timeline}`);
      if (n.priorities?.length) parts.push(`Priorities: ${n.priorities.join(", ")}`);
      if (n.comments?.trim()) parts.push(`Comments: ${n.comments.trim()}`);
      return parts.length ? parts.join("\n") : undefined;
    }
    return undefined;
  })();

  // Pre-fill values for the picker (extracted from current showingRequest)
  const pickerInitialDate = showingRequest?.preferredDate
    ? isoToYmd(showingRequest.preferredDate)
    : "";
  const pickerInitialTime = showingRequest?.preferredTime ?? "";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={sharedStyles.screenContainer}>
      {/* <TopBar leftLabel="Exit" title="Showing Request" /> */}

      {isLoadingRequest ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.blue} />
          <Text style={styles.loadingText}>Loading showing request…</Text>
        </View>
      ) : (
        <>
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.requestCard}>
              <View style={styles.clientSummary}>
                <View style={styles.clientAvatar}>
                  <Text style={styles.clientAvatarText}>
                    {clientLabel.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.clientSummaryCopy}>
                  <Text style={styles.summaryEyebrow}>SHOWING FOR</Text>
                  <Text style={styles.clientName}>{clientLabel}</Text>
                </View>
                {formattedNotes && (
                  <TouchableOpacity
                    style={styles.notesButton}
                    onPress={() => setShowClientNotes(true)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={`View notes for ${clientLabel}`}
                  >
                    <StickyNote size={15} color={colors.blue} strokeWidth={2.2} />
                    <Text style={styles.notesButtonText}>Notes</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.scheduleSummary}>
                <View style={styles.scheduleIcon}>
                  <CalendarDays size={20} color={colors.blue} strokeWidth={2.1} />
                </View>
                <View style={styles.scheduleCopy}>
                  <Text style={styles.summaryEyebrow}>PREFERRED DATE & TIME</Text>
                  {isUpdatingDateTime ? (
                    <View style={styles.dateTimeUpdatingRow}>
                      <ActivityIndicator size="small" color={colors.blue} />
                      <Text style={styles.dateTimeUpdatingText}>Updating…</Text>
                    </View>
                  ) : (
                    <Text style={styles.scheduleValue}>{dateTimeLabel}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setShowDateTimePicker(true)}
                  activeOpacity={0.75}
                  disabled={isUpdatingDateTime}
                  accessibilityRole="button"
                  accessibilityLabel="Edit preferred date and time"
                >
                  <Pencil size={14} color={colors.blue} strokeWidth={2.2} />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.startPointCard}>
              <View style={styles.startPointHeader}>
                <View style={styles.startPointHeaderIcon}>
                  <Navigation size={18} color={colors.blue} strokeWidth={2.2} />
                </View>
                <View style={styles.startPointHeaderCopy}>
                  <Text style={styles.startPointTitle}>Choose starting point</Text>
                  <Text style={styles.startPointSubtitle}>
                    We’ll calculate travel time from here
                  </Text>
                </View>
                {(isUpdatingStart || isResolvingLocation) && (
                  <ActivityIndicator size="small" color={colors.blue} />
                )}
              </View>

              <View style={styles.startPointOptions}>
                {START_POINT_OPTIONS.map((opt) => {
                  const isAddAddress = opt === "Add Address";
                  const isActive = startPoint === opt;
                  const OptionIcon =
                    opt === "Agent Address"
                      ? Building2
                      : opt === "Current Location"
                        ? LocateFixed
                        : Plus;

                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.optionButton,
                        isActive && styles.optionButtonActive,
                      ]}
                      onPress={() => {
                        if (isAddAddress) {
                          handleAddAddressPress();
                        } else {
                          void handleStartPointChange(opt as StartPointOption);
                        }
                      }}
                      activeOpacity={0.8}
                      disabled={
                        isUpdatingStart
                        || isResolvingLocation
                        || (opt === "Agent Address" && isLoadingAgentMe)
                      }
                    >
                      <View
                        style={[
                          styles.optionIcon,
                          isActive && styles.optionIconActive,
                        ]}
                      >
                        <OptionIcon
                          size={17}
                          color={isActive ? colors.white : colors.blue}
                          strokeWidth={2.2}
                        />
                      </View>
                      <Text
                        style={[
                          styles.optionButtonText,
                          isActive && styles.optionButtonTextActive,
                        ]}
                      >
                        {opt}
                      </Text>
                      {isActive && (
                        <View style={styles.optionCheck}>
                          <Check size={10} color={colors.blue} strokeWidth={3} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {locationError && (
                <View style={styles.locationError}>
                  <AlertCircle size={15} color={colors.dangerText} strokeWidth={2.2} />
                  <Text style={styles.locationErrorText}>{locationError}</Text>
                </View>
              )}

              <View style={styles.resolvedAddressCard}>
                <MapPin size={16} color={colors.blue} strokeWidth={2.2} />
                <View style={styles.resolvedAddressCopy}>
                  <Text style={styles.resolvedAddressLabel}>SELECTED LOCATION</Text>
                  <Text style={styles.resolvedAddress}>
                    {selectedStartPointLabel}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.propertiesHeader}>
              <View>
                <Text style={styles.propertiesTitle}>Requested properties</Text>
                <Text style={styles.propertiesSubtitle}>
                  {properties.length} {properties.length === 1 ? "stop" : "stops"} to include
                </Text>
              </View>
              <View style={styles.propertyCount}>
                <Home size={14} color={colors.blue} strokeWidth={2.2} />
                <Text style={styles.propertyCountText}>{properties.length}</Text>
              </View>
            </View>

            {properties.length === 0 ? (
              <View style={styles.noPropertiesCard}>
                <View style={styles.noPropertiesIcon}>
                  <Home size={24} color={colors.blue} strokeWidth={2} />
                </View>
                <Text style={styles.noPropertiesText}>No properties yet</Text>
                <Text style={styles.noPropertiesSubtext}>
                  No properties have been added to this showing request yet.
                </Text>
              </View>
            ) : (
              properties.map((property, index) => (
                <TouchableOpacity
                  key={property.id}
                  style={styles.propertyCard}
                  activeOpacity={property.masterPropertyId ? 0.75 : 1}
                  disabled={!property.masterPropertyId}
                  accessibilityRole={property.masterPropertyId ? "button" : undefined}
                  accessibilityLabel={`View details for ${property.address}`}
                  accessibilityHint="Opens the full property details page"
                  onPress={() => {
                    if (!property.masterPropertyId) return;
                    navigation.navigate("PropertyDetails", {
                      propertyId: property.masterPropertyId,
                      userType: "agent",
                    });
                  }}
                >
                  <View style={styles.propertyNumber}>
                    <Text style={styles.propertyNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.propertyInfo}>
                    <Text style={styles.address}>{property.address}</Text>
                    <View style={styles.propertyMetaRow}>
                      {!!property.price && (
                        <Text style={styles.priceText}>{property.price}</Text>
                      )}
                      {!!property.price && <View style={styles.metaDot} />}
                      <View style={styles.propertyMetaItem}>
                        <BedDouble size={14} color={colors.textSecondary} strokeWidth={2} />
                        <Text style={styles.meta}>{property.beds} bed</Text>
                      </View>
                      <View style={styles.propertyMetaItem}>
                        <Bath size={14} color={colors.textSecondary} strokeWidth={2} />
                        <Text style={styles.meta}>{property.baths} bath</Text>
                      </View>
                    </View>
                  </View>
                  <ChevronRight size={18} color={colors.textMuted} strokeWidth={2} />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <View style={styles.stickyFooter}>
            <TouchableOpacity
              style={[
                styles.calculateButton,
                isCalculating && styles.calculateButtonBusy,
                isCalculateDisabled && styles.btnDisabled,
              ]}
              onPress={handleCalculate}
              activeOpacity={0.85}
              disabled={isCalculateDisabled}
            >
              {isCalculating ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <>
                  <View style={styles.calculateIcon}>
                    <Navigation
                      size={18}
                      color={isCalculateDisabled ? colors.textMuted : colors.blue}
                      fill={isCalculateDisabled ? colors.textMuted : colors.blue}
                      strokeWidth={2}
                    />
                  </View>
                  <View style={styles.calculateCopy}>
                    <Text
                      style={[
                        styles.calculateTitle,
                        isCalculateDisabled && styles.btnDisabledText,
                      ]}
                    >
                      Calculate best route
                    </Text>
                    <Text
                      style={[
                        styles.calculateSubtitle,
                        isCalculateDisabled && styles.btnDisabledSubtext,
                      ]}
                    >
                      {properties.length} {properties.length === 1 ? "stop" : "stops"} · Live traffic enabled
                    </Text>
                  </View>
                  <ChevronRight
                    size={20}
                    color={isCalculateDisabled ? colors.textMuted : colors.white}
                    strokeWidth={2.3}
                  />
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ── DateTime Picker Modal ─────────────────────────────────────────── */}
      <DateTimePickerModal
        visible={showDateTimePicker}
        initialDate={pickerInitialDate}
        initialTime={pickerInitialTime}
        onConfirm={handleDateTimeConfirm}
        onDismiss={() => setShowDateTimePicker(false)}
        minDate={new Date()}
      />

      {/* ── Add Address Modal ─────────────────────────────────────────────── */}
      <Modal
        visible={showAddressModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddressModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Start Address</Text>

            <Text style={styles.fieldLabel}>Label (optional)</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="e.g. Office, Home"
              placeholderTextColor={colors.textSecondary}
              value={addressForm.label}
              onChangeText={(v) => setAddressForm((f) => ({ ...f, label: v }))}
            />

            <Text style={styles.fieldLabel}>Street *</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="123 Front St W"
              placeholderTextColor={colors.textSecondary}
              value={addressForm.street}
              onChangeText={(v) => setAddressForm((f) => ({ ...f, street: v }))}
            />

            <Text style={styles.fieldLabel}>Unit</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Unit 302"
              placeholderTextColor={colors.textSecondary}
              value={addressForm.unit}
              onChangeText={(v) => setAddressForm((f) => ({ ...f, unit: v }))}
            />

            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.fieldLabel}>City *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="Toronto"
                  placeholderTextColor={colors.textSecondary}
                  value={addressForm.city}
                  onChangeText={(v) =>
                    setAddressForm((f) => ({ ...f, city: v }))
                  }
                />
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.fieldLabel}>Province *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="ON"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="characters"
                  value={addressForm.province}
                  onChangeText={(v) =>
                    setAddressForm((f) => ({ ...f, province: v }))
                  }
                />
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.fieldLabel}>Postal Code *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="M5J 2M2"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="characters"
                  value={addressForm.postalCode}
                  onChangeText={(v) =>
                    setAddressForm((f) => ({ ...f, postalCode: v }))
                  }
                />
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.fieldLabel}>Country *</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="CA"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="characters"
                  value={addressForm.country}
                  onChangeText={(v) =>
                    setAddressForm((f) => ({ ...f, country: v }))
                  }
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setShowAddressModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtnOkay,
                  !addressForm.street.trim() && styles.modalBtnDisabled,
                ]}
                onPress={handleAddressFormSubmit}
                disabled={!addressForm.street.trim()}
                activeOpacity={0.85}
              >
                <Text style={styles.modalBtnOkayText}>Okay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* ── Client Notes Modal ──────────────────────────────────────── */}
            <ClientNotesModal
        visible={showClientNotes}
        clientName={clientLabel}
        notes={showingRequest?.notes}
        onClose={() => setShowClientNotes(false)}
      />
    </View>
  );
};

export default InitialScreen;

const styles = StyleSheet.create({
  scrollArea: {
    flex: 1,
    backgroundColor: "#F4F7FB",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  requestCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E3EAF3",
    overflow: "hidden",
    marginBottom: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  clientSummary: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  clientAvatar: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.blue,
    marginRight: 11,
  },
  clientAvatarText: {
    fontSize: 19,
    color: colors.white,
    fontWeight: "800",
  },
  clientSummaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  summaryEyebrow: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "800",
    color: colors.textMuted,
    letterSpacing: 0.75,
  },
  clientName: {
    marginTop: 2,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  notesButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    backgroundColor: colors.blueLight,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginLeft: 10,
  },
  notesButtonText: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.blue,
    fontWeight: "700",
  },
  scheduleSummary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FBFCFE",
    borderTopWidth: 1,
    borderTopColor: "#EDF1F6",
    padding: 14,
  },
  scheduleIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.blueLight,
    marginRight: 10,
  },
  scheduleCopy: {
    flex: 1,
    minWidth: 0,
  },
  scheduleValue: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  dateTimeUpdatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateTimeUpdatingText: {
    fontSize: 13,
    color: colors.blue,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.blueLight,
    marginLeft: 10,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.blue,
  },

  startPointCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E3EAF3",
    padding: 16,
    marginBottom: 22,
  },
  startPointHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  startPointHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.blueLight,
    marginRight: 10,
  },
  startPointHeaderCopy: {
    flex: 1,
  },
  startPointTitle: {
    fontSize: 16,
    lineHeight: 21,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  startPointSubtitle: {
    marginTop: 1,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  startPointOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionButton: {
    minHeight: 46,
    flexGrow: 1,
    flexBasis: "46%",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  optionButtonActive: {
    backgroundColor: colors.blueLight,
    borderColor: colors.blue,
  },
  optionIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    marginRight: 7,
  },
  optionIconActive: {
    backgroundColor: colors.blue,
  },
  optionButtonText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSecondary,
    fontWeight: "700",
  },
  optionButtonTextActive: {
    color: colors.blue,
  },
  optionCheck: {
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    marginLeft: 4,
  },
  locationError: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    borderRadius: 11,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginTop: 12,
  },
  locationErrorText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
    color: colors.dangerText,
    fontWeight: "600",
  },
  resolvedAddressCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderTopWidth: 1,
    borderTopColor: "#EDF1F6",
    marginTop: 14,
    paddingTop: 12,
  },
  resolvedAddressCopy: {
    flex: 1,
    marginLeft: 8,
  },
  resolvedAddressLabel: {
    fontSize: 8,
    lineHeight: 11,
    color: colors.textMuted,
    fontWeight: "800",
    letterSpacing: 0.55,
  },
  resolvedAddress: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: "600",
  },
  propertiesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  propertiesTitle: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "800",
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  propertiesSubtitle: {
    marginTop: 1,
    fontSize: 11,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  propertyCount: {
    minWidth: 40,
    height: 32,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: colors.blueLight,
  },
  propertyCountText: {
    fontSize: 12,
    color: colors.blue,
    fontWeight: "800",
  },

  noPropertiesCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  noPropertiesIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.blueLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  noPropertiesText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  noPropertiesSubtext: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
  },

  propertyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    marginBottom: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 5,
    elevation: 1,
  },
  propertyNumber: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.blue,
  },
  propertyNumberText: {
    fontSize: 14,
    color: colors.white,
    fontWeight: "800",
  },
  propertyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  address: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  propertyMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 5,
  },
  propertyMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  priceText: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.blue,
    fontWeight: "700",
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
  },
  meta: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.textSecondary,
  },

  stickyFooter: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  calculateButton: {
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.blue,
    borderRadius: 16,
    paddingHorizontal: 10,
  },
  calculateButtonBusy: {
    justifyContent: "center",
  },
  calculateIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    marginRight: 10,
  },
  calculateCopy: {
    flex: 1,
  },
  calculateTitle: {
    fontSize: 15,
    lineHeight: 20,
    color: colors.white,
    fontWeight: "800",
  },
  calculateSubtitle: {
    marginTop: 1,
    fontSize: 10,
    lineHeight: 14,
    color: "#BFDBFE",
    fontWeight: "600",
  },
  btnDisabled: {
    backgroundColor: colors.border,
    opacity: 1,
  },
  btnDisabledText: {
    color: colors.textSecondary,
  },
  btnDisabledSubtext: {
    color: colors.textMuted,
  },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
    marginTop: 10,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.white,
  },
  fieldRow: {
    flexDirection: "row",
    gap: 10,
  },
  fieldHalf: {
    flex: 1,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 20,
  },
  modalBtnCancel: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalBtnCancelText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  modalBtnOkay: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.blue,
  },
  modalBtnOkayText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.white,
  },
  modalBtnDisabled: {
    opacity: 0.45,
  },

  // ── Client row ──
  clientRow: {
  position: 'relative',
  marginBottom: 10,
},
viewNotesBtnWrapper: {
  position: 'absolute',
  right: 14,
  top: '50%',
  transform: [{ translateY: -16 }], // half the button height, adjust if needed
},
  viewNotesBtn: {
    position: "absolute",
    right: 14,
    borderWidth: 1,
    borderColor: colors.blue,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  viewNotesBtnText: {
    fontSize: 12,
    color: colors.blue,
    fontWeight: "600",
  },
});










// import React, { useEffect, useRef, useState } from "react";
// import {
//   View,
//   Text,
//   ScrollView,
//   TouchableOpacity,
//   StyleSheet,
//   ActivityIndicator,
//   Modal,
//   TextInput,
//   KeyboardAvoidingView,
//   Platform,
// } from "react-native";
// import * as Location from "expo-location";

// import {
//   AgentShowingRequest,
//   CalculateRoutePlanPayload,
//   RoutePlanResponse,
//   UpdateRouteStartPayload,
//   useCalculateRoutePlan,
//   useUpdateRouteStart,
//   useUpdateShowingRequestStatus,
// } from "@/lib/agentRoutePlanningAPI";
// import { fetchPropertyById } from "@/lib/propertyApi";
// import { Property, StartPointOption } from "../types";
// import { colors, sharedStyles } from "../theme";
// import { START_POINT_OPTIONS } from "../constants";
// import TopBar from "../components/common/TopBar";
// import { InfoCard, SectionTitle } from "../components/common/Atoms";
// import { DateTimePickerModal } from "@/components/DateTimePickerModal";
// import ClientNotesModal from "../components/modals/ClientNotesModal";
// import { NormalButton } from "@/components/common/ST_Buttons";
// // ─── Types ────────────────────────────────────────────────────────────────────

// export interface AgentWorkAddress {
//   street: string;
//   unit: string;
//   city: string;
//   province: string;
//   postalCode: string;
//   country: string;
//   /** Pre-formatted label shown in the UI, e.g. "123 Main St, Toronto, ON" */
//   label: string;
//   /** Full formatted address text sent to the API */
//   addressText: string;
//   latitude: number;
//   longitude: number;
// }

// interface InitialScreenProps {
//   showingRequestId: string;
//   /** Agent work address resolved by RoutePlanningScreen from /me */
//   agentWorkAddress: AgentWorkAddress | null;
//   startPoint: StartPointOption;
//   onStartPointChange: (option: StartPointOption) => void;
//   properties: Property[];
//   onPropertiesLoaded: (properties: Property[]) => void;
//   /** Raw showing-request data and loading state fetched by the parent */
//   showingRequest: AgentShowingRequest | undefined;
//   isLoadingRequest: boolean;
//   isLoadingAgentMe: boolean;
//   /** Called on successful route calculation, receives the plan and the preferred start time */
//   onCalculate: (routePlan: RoutePlanResponse, preferredTime: string) => void;
// }

// // ─── Payload builders ─────────────────────────────────────────────────────────

// /** Agent Address — slim custom_address shape (no GPS fields). */
// function buildAgentAddressPayload(
//   agentWorkAddress: AgentWorkAddress,
// ): UpdateRouteStartPayload {
//   return {
//     type: "custom_address",
//     label: agentWorkAddress.label,
//     addressText: agentWorkAddress.addressText,
//     address: {
//       street: agentWorkAddress.street,
//       unit: agentWorkAddress.unit,
//       city: agentWorkAddress.city,
//       province: agentWorkAddress.province,
//       postalCode: agentWorkAddress.postalCode,
//       country: agentWorkAddress.country,
//     },
//     liveTrafficEnabled: true,
//     timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
//     recalculate: false,
//   };
// }

// /** Current Location — full GPS payload. */
// function buildCurrentLocationPayload(
//   latitude: number,
//   longitude: number,
//   accuracyM: number,
// ): UpdateRouteStartPayload {
//   return {
//     type: "CURRENT_LOCATION",
//     label: "Current Location",
//     addressText: "Current Location",
//     address: {
//       street: "",
//       unit: "",
//       city: "",
//       province: "",
//       postalCode: "",
//       country: "",
//     },
//     latitude,
//     longitude,
//     accuracyM,
//     capturedAt: new Date().toISOString(),
//     liveTrafficEnabled: true,
//     timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
//     recalculate: false,
//     sortMode: "distance",
//     departureTime: new Date().toISOString(),
//   };
// }

// function buildCalculatePayload(
//   startType: string,
// ): Pick<
//   CalculateRoutePlanPayload,
//   "sortMode" | "startType" | "startLabel" | "liveTrafficEnabled" | "timezone"
// > {
//   return {
//     sortMode: "distance",
//     startType,
//     startLabel:
//       startType === "current_location" ? "Current Location" : "Agent Address",
//     liveTrafficEnabled: true,
//     timezone: "America/Toronto",
//   };
// }

// function formatPreferredDateTime(date?: string, time?: string): string {
//   if (!date) return "—";
//   try {
//     const dt = new Date(date);
//     const dateLabel = dt.toLocaleDateString("en-US", {
//       month: "long",
//       day: "numeric",
//       year: "numeric",
//       timeZone: "UTC",
//     });
//     return time ? `${dateLabel} at ${time}` : dateLabel;
//   } catch {
//     return time ? `${date} | ${time}` : date;
//   }
// }

// /**
//  * Converts a 'YYYY-MM-DD' string to a UTC ISO string for the status API.
//  * e.g. '2026-06-30' → '2026-06-30T00:00:00Z'
//  */
// function dateToIso(ymd: string): string {
//   return `${ymd}T00:00:00Z`;
// }

// /**
//  * Extracts 'YYYY-MM-DD' from an ISO date string like '2026-06-30T07:30:00Z'.
//  */
// function isoToYmd(iso: string): string {
//   return iso.split("T")[0] ?? "";
// }

// // ─── Custom address form state ────────────────────────────────────────────────

// interface CustomAddressForm {
//   label: string;
//   street: string;
//   unit: string;
//   city: string;
//   province: string;
//   postalCode: string;
//   country: string;
// }

// const EMPTY_FORM: CustomAddressForm = {
//   label: "",
//   street: "",
//   unit: "",
//   city: "",
//   province: "",
//   postalCode: "",
//   country: "",
// };

// // ─── Component ────────────────────────────────────────────────────────────────

// const InitialScreen: React.FC<InitialScreenProps> = ({
//   showingRequestId,
//   agentWorkAddress,
//   startPoint,
//   onStartPointChange,
//   properties,
//   onPropertiesLoaded,
//   showingRequest,
//   isLoadingRequest,
//   isLoadingAgentMe,
//   onCalculate,
// }) => {
//   // ── API hooks ─────────────────────────────────────────────────────────────
//   const { mutate: updateRouteStart, isPending: isUpdatingStart } =
//     useUpdateRouteStart(showingRequestId);

//   const { mutate: calculateRoute, isPending: isCalculating } =
//     useCalculateRoutePlan(showingRequestId);

//   const { mutate: updateStatus, isPending: isUpdatingDateTime } =
//     useUpdateShowingRequestStatus(showingRequestId);

//   // ── Modal state ───────────────────────────────────────────────────────────
//   const [showAddressModal, setShowAddressModal] = useState(false);
//   const [addressForm, setAddressForm] = useState<CustomAddressForm>(EMPTY_FORM);

//   // ── DateTime picker state ─────────────────────────────────────────────────
//   const [showDateTimePicker, setShowDateTimePicker] = useState(false);
//   const [showClientNotes, setShowClientNotes] = useState(false);
//   // ── Sync requestedProperties upward once the request loads ────────────────
//   const propertiesSyncedRef = useRef(false);
//   const autoStartCalledRef = useRef(false);

//   useEffect(() => {
//     if (
//       showingRequest?.requestedProperties?.length &&
//       !propertiesSyncedRef.current
//     ) {
//       propertiesSyncedRef.current = true;

//       // Seed with placeholder rows immediately so the list is not empty while fetching
//       onPropertiesLoaded(
//         showingRequest.requestedProperties.map((rp) => ({
//           id: rp.id,
//           address: `Property #${rp.masterPropertyId}`,
//           price: "",
//           beds: 0,
//           baths: 0,
//         })) as Property[],
//       );

//       // Fetch real details for every property and replace the placeholders
//       const requestedProps = showingRequest.requestedProperties;
//       Promise.allSettled(
//         requestedProps.map((rp) =>
//           fetchPropertyById(rp.masterPropertyId).then((detail) => ({
//             id: rp.id,
//             address: `${detail.address}, ${detail.city}, ${detail.province}`,
//             price: `$${detail.price.toLocaleString()}`,
//             beds: detail.bedrooms,
//             baths: detail.bathrooms,
//           })),
//         ),
//       ).then((results) => {
//         const resolved = results.map((result, idx) => {
//           if (result.status === "fulfilled") return result.value;
//           // Keep the placeholder row on failure
//           const rp = requestedProps[idx];
//           return {
//             id: rp.id,
//             address: `Property #${rp.masterPropertyId}`,
//             price: "",
//             beds: 0,
//             baths: 0,
//           };
//         });
//         onPropertiesLoaded(resolved as Property[]);
//       });
//     }
//   }, [showingRequest, onPropertiesLoaded]);

//   // ── Auto-call updateRouteStart once agentMe has resolved ─────────────────
//   useEffect(() => {
//     if (isLoadingAgentMe) return;
//     if (autoStartCalledRef.current) return;
//     autoStartCalledRef.current = true;

//     if (agentWorkAddress) {
//       onStartPointChange("Agent Address");
//       updateRouteStart(buildAgentAddressPayload(agentWorkAddress));
//     }
//   }, [isLoadingAgentMe, agentWorkAddress]);

//   // ── Start-point selection ─────────────────────────────────────────────────
//   const handleStartPointChange = async (option: StartPointOption) => {
//     onStartPointChange(option);

//     if (option === "Agent Address") {
//       if (!agentWorkAddress) return;
//       updateRouteStart(buildAgentAddressPayload(agentWorkAddress));
//       return;
//     }

//     try {
//       const { status } = await Location.requestForegroundPermissionsAsync();
//       if (status !== "granted") {
//         console.warn("[InitialScreen] Location permission denied");
//         return;
//       }
//       const loc = await Location.getCurrentPositionAsync({
//         accuracy: Location.Accuracy.Balanced,
//       });
//       const { latitude, longitude, accuracy } = loc.coords;

//       updateRouteStart(
//         buildCurrentLocationPayload(latitude, longitude, accuracy ?? 0),
//       );
//     } catch (err) {
//       console.warn("[InitialScreen] Could not get current location:", err);
//     }
//   };

//   // ── Custom address modal ──────────────────────────────────────────────────
//   const handleAddAddressPress = () => {
//     setAddressForm(EMPTY_FORM);
//     setShowAddressModal(true);
//   };

//   const handleAddressFormSubmit = () => {
//     const addressText = [
//       addressForm.street,
//       addressForm.unit,
//       addressForm.city,
//       addressForm.province,
//       addressForm.postalCode,
//       addressForm.country,
//     ]
//       .filter(Boolean)
//       .join(", ");

//     updateRouteStart({
//       type: "custom_address",
//       label: addressForm.label || addressText,
//       addressText,
//       address: {
//         street: addressForm.street,
//         unit: addressForm.unit,
//         city: addressForm.city,
//         province: addressForm.province,
//         postalCode: addressForm.postalCode,
//         country: addressForm.country,
//       },
//       liveTrafficEnabled: true,
//       timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
//       recalculate: false,
//     });

//     onStartPointChange("Add Address");
//     setShowAddressModal(false);
//   };

//   // ── DateTime edit ─────────────────────────────────────────────────────────
//   const handleDateTimeConfirm = ({
//     date,
//     time,
//   }: {
//     date: string;
//     time: string;
//   }) => {
//     setShowDateTimePicker(false);
//     updateStatus({
//       status: showingRequest?.status ?? "pending",
//       preferredDate: dateToIso(date),
//       preferredTime: time,
//     });
//   };

//   // ── Calculate route ───────────────────────────────────────────────────────
//   const handleCalculate = () => {
//     const startType =
//       startPoint === "Current Location" ? "current_location" : "agent_address";

//     calculateRoute(
//       buildCalculatePayload(startType) as CalculateRoutePlanPayload,
//       {
//         onSuccess: (data) =>
//           onCalculate(data, showingRequest?.preferredTime ?? ""),
//       },
//     );
//   };

//   // ── Derived display values ────────────────────────────────────────────────
//   const dateTimeLabel = formatPreferredDateTime(
//     showingRequest?.preferredDate,
//     showingRequest?.preferredTime,
//   );
//   const clientLabel = showingRequest?.clientName ?? "—";
//   const isBusy = isLoadingRequest || isCalculating;

//   // Format structured notes object into a readable string for the modal
//   const formattedNotes: string | undefined = (() => {
//     const n = showingRequest?.notes;
//     if (!n) return undefined;
//     if (typeof n === "string") return n || undefined;
//     if (typeof n === "object") {
//       const parts: string[] = [];
//       if (n.intent) parts.push(`Intent: ${n.intent.replace(/_/g, " ")}`);
//       if (n.timeline) parts.push(`Timeline: ${n.timeline}`);
//       if (n.priorities?.length) parts.push(`Priorities: ${n.priorities.join(", ")}`);
//       if (n.comments?.trim()) parts.push(`Comments: ${n.comments.trim()}`);
//       return parts.length ? parts.join("\n") : undefined;
//     }
//     return undefined;
//   })();

//   // Pre-fill values for the picker (extracted from current showingRequest)
//   const pickerInitialDate = showingRequest?.preferredDate
//     ? isoToYmd(showingRequest.preferredDate)
//     : "";
//   const pickerInitialTime = showingRequest?.preferredTime ?? "";

//   // ── Render ────────────────────────────────────────────────────────────────
//   return (
//     <View style={sharedStyles.screenContainer}>
//       {/* <TopBar leftLabel="Exit" title="Showing Request" /> */}

//       {isLoadingRequest ? (
//         <View style={styles.centered}>
//           <ActivityIndicator size="large" color={colors.blue} />
//           <Text style={styles.loadingText}>Loading showing request…</Text>
//         </View>
//       ) : (
//         <>
//           <ScrollView
//             style={sharedStyles.scrollArea}
//             showsVerticalScrollIndicator={false}
//           >
//             {/* ── Preferred Date & Time card with inline Edit button ───────── */}
//             <View style={styles.dateTimeCard}>
//               <View style={styles.dateTimeLeft}>
//                 <Text style={styles.dateTimeIcon}>📅</Text>
//                 <View style={styles.dateTimeText}>
//                   <Text style={styles.dateTimeLabel}>
//                     PREFERRED DATE & TIME
//                   </Text>
//                   {isUpdatingDateTime ? (
//                     <View style={styles.dateTimeUpdatingRow}>
//                       <ActivityIndicator size="small" color={colors.blue} />
//                       <Text style={styles.dateTimeUpdatingText}>Updating…</Text>
//                     </View>
//                   ) : (
//                     <Text style={styles.dateTimeValue}>{dateTimeLabel}</Text>
//                   )}
//                 </View>
//               </View>
//               <TouchableOpacity
//                 style={styles.editBtn}
//                 onPress={() => setShowDateTimePicker(true)}
//                 activeOpacity={0.75}
//                 disabled={isUpdatingDateTime}
//               >
//                 <Text style={styles.editBtnText}>Edit</Text>
//               </TouchableOpacity>
//             </View>

//             {/* <InfoCard icon="👤" label="CLIENT" value={clientLabel} /> */}

//             {/* ── Client row with View Notes ──────────────────────────────── */}
//           <View style={styles.clientRow}>
//   <InfoCard icon="👤" label="CLIENT" value={clientLabel} />
//   {formattedNotes && (
//     <View style={styles.viewNotesBtnWrapper}>
//       <NormalButton
//         label="Notes"
//         variant="primary"
//         size="sm"
//         fullWidth={false}
//         onPress={() => setShowClientNotes(true)}
//       />
//     </View>
//   )}
// </View>

//             {/* ── Start Point Selector ──────────────────────────────────── */}
//             <View style={styles.startPointCard}>
//               <Text style={styles.startPointLabel}>
//                 📍{"  "}START POINT (FOR ROUTE CALCULATION)
//               </Text>

//               {isUpdatingStart && (
//                 <View style={styles.updatingRow}>
//                   <ActivityIndicator size="small" color={colors.blue} />
//                   <Text style={styles.updatingText}>Updating start point…</Text>
//                 </View>
//               )}

//               <View style={styles.startPointOptions}>
//                 {START_POINT_OPTIONS.map((opt) => {
//                   const isAddAddress = opt === "Add Address";
//                   const isActive = startPoint === opt;

//                   return (
//                     <TouchableOpacity
//                       key={opt}
//                       style={[
//                         styles.optionBtn,
//                         isActive && styles.optionBtnActive,
//                       ]}
//                       onPress={() => {
//                         if (isAddAddress) {
//                           handleAddAddressPress();
//                         } else {
//                           void handleStartPointChange(opt as StartPointOption);
//                         }
//                       }}
//                       activeOpacity={0.8}
//                       disabled={isAddAddress ? false : isUpdatingStart}
//                     >
//                       <Text
//                         style={[
//                           styles.optionBtnText,
//                           isActive && styles.optionBtnTextActive,
//                         ]}
//                       >
//                         {opt}
//                       </Text>
//                     </TouchableOpacity>
//                   );
//                 })}
//               </View>

//               {/* Resolved address hint below the selector */}
//               {startPoint === "Agent Address" && agentWorkAddress ? (
//                 <Text style={styles.resolvedAddress}>
//                   {agentWorkAddress.label}
//                 </Text>
//               ) : null}
//               {startPoint === "Current Location" ? (
//                 <Text style={styles.resolvedAddress}>
//                   Using your current GPS location
//                 </Text>
//               ) : null}
//               {startPoint === "Add Address" ? (
//                 <Text style={styles.resolvedAddress}>
//                   {[addressForm.street, addressForm.city, addressForm.province]
//                     .filter(Boolean)
//                     .join(", ") || "Custom address set"}
//                 </Text>
//               ) : null}
//             </View>

//             {/* ── Property List ─────────────────────────────────────────── */}
//             <SectionTitle>
//               📍{"  "}Requested Properties ({properties.length})
//             </SectionTitle>

//             {properties.length === 0 ? (
//               <View style={styles.noPropertiesCard}>
//                 <Text style={styles.noPropertiesIcon}>🏠</Text>
//                 <Text style={styles.noPropertiesText}>No Properties</Text>
//                 <Text style={styles.noPropertiesSubtext}>
//                   No properties have been added to this showing request yet.
//                 </Text>
//               </View>
//             ) : (
//               properties.map((property, index) => (
//                 <View key={property.id} style={styles.propertyCard}>
//                   <View style={sharedStyles.propertyNumber}>
//                     <Text style={sharedStyles.propertyNumberText}>
//                       {index + 1}
//                     </Text>
//                   </View>
//                   <View style={styles.propertyInfo}>
//                     <Text style={styles.address}>{property.address}</Text>
//                     <Text style={styles.meta}>
//                       {property.price} • {property.beds} bed {property.baths} bath
//                     </Text>
//                   </View>
//                 </View>
//               ))
//             )}

//             <View style={{ height: 100 }} />
//           </ScrollView>

//           {/* ── Sticky Footer CTA ─────────────────────────────────────────── */}
//           <View style={sharedStyles.stickyFooter}>
//             <TouchableOpacity
//               style={[sharedStyles.btnPrimary, (isBusy || properties.length === 0) && styles.btnDisabled]}
//               onPress={handleCalculate}
//               activeOpacity={0.85}
//               disabled={isBusy || properties.length === 0}
//             >
//               {isCalculating ? (
//                 <ActivityIndicator color={colors.white} />
//               ) : (
//                 <Text style={[sharedStyles.btnPrimaryText, (isBusy || properties.length === 0) && styles.btnDisabledText]}>
//                   CALCULATE ROUTE
//                 </Text>
//               )}
//             </TouchableOpacity>
//           </View>
//         </>
//       )}

//       {/* ── DateTime Picker Modal ─────────────────────────────────────────── */}
//       <DateTimePickerModal
//         visible={showDateTimePicker}
//         initialDate={pickerInitialDate}
//         initialTime={pickerInitialTime}
//         onConfirm={handleDateTimeConfirm}
//         onDismiss={() => setShowDateTimePicker(false)}
//         minDate={new Date()}
//       />

//       {/* ── Add Address Modal ─────────────────────────────────────────────── */}
//       <Modal
//         visible={showAddressModal}
//         transparent
//         animationType="fade"
//         onRequestClose={() => setShowAddressModal(false)}
//       >
//         <KeyboardAvoidingView
//           style={styles.modalOverlay}
//           behavior={Platform.OS === "ios" ? "padding" : "height"}
//         >
//           <View style={styles.modalCard}>
//             <Text style={styles.modalTitle}>Add Start Address</Text>

//             <Text style={styles.fieldLabel}>Label (optional)</Text>
//             <TextInput
//               style={styles.fieldInput}
//               placeholder="e.g. Office, Home"
//               placeholderTextColor={colors.textSecondary}
//               value={addressForm.label}
//               onChangeText={(v) => setAddressForm((f) => ({ ...f, label: v }))}
//             />

//             <Text style={styles.fieldLabel}>Street *</Text>
//             <TextInput
//               style={styles.fieldInput}
//               placeholder="123 Front St W"
//               placeholderTextColor={colors.textSecondary}
//               value={addressForm.street}
//               onChangeText={(v) => setAddressForm((f) => ({ ...f, street: v }))}
//             />

//             <Text style={styles.fieldLabel}>Unit</Text>
//             <TextInput
//               style={styles.fieldInput}
//               placeholder="Unit 302"
//               placeholderTextColor={colors.textSecondary}
//               value={addressForm.unit}
//               onChangeText={(v) => setAddressForm((f) => ({ ...f, unit: v }))}
//             />

//             <View style={styles.fieldRow}>
//               <View style={styles.fieldHalf}>
//                 <Text style={styles.fieldLabel}>City *</Text>
//                 <TextInput
//                   style={styles.fieldInput}
//                   placeholder="Toronto"
//                   placeholderTextColor={colors.textSecondary}
//                   value={addressForm.city}
//                   onChangeText={(v) =>
//                     setAddressForm((f) => ({ ...f, city: v }))
//                   }
//                 />
//               </View>
//               <View style={styles.fieldHalf}>
//                 <Text style={styles.fieldLabel}>Province *</Text>
//                 <TextInput
//                   style={styles.fieldInput}
//                   placeholder="ON"
//                   placeholderTextColor={colors.textSecondary}
//                   autoCapitalize="characters"
//                   value={addressForm.province}
//                   onChangeText={(v) =>
//                     setAddressForm((f) => ({ ...f, province: v }))
//                   }
//                 />
//               </View>
//             </View>

//             <View style={styles.fieldRow}>
//               <View style={styles.fieldHalf}>
//                 <Text style={styles.fieldLabel}>Postal Code *</Text>
//                 <TextInput
//                   style={styles.fieldInput}
//                   placeholder="M5J 2M2"
//                   placeholderTextColor={colors.textSecondary}
//                   autoCapitalize="characters"
//                   value={addressForm.postalCode}
//                   onChangeText={(v) =>
//                     setAddressForm((f) => ({ ...f, postalCode: v }))
//                   }
//                 />
//               </View>
//               <View style={styles.fieldHalf}>
//                 <Text style={styles.fieldLabel}>Country *</Text>
//                 <TextInput
//                   style={styles.fieldInput}
//                   placeholder="CA"
//                   placeholderTextColor={colors.textSecondary}
//                   autoCapitalize="characters"
//                   value={addressForm.country}
//                   onChangeText={(v) =>
//                     setAddressForm((f) => ({ ...f, country: v }))
//                   }
//                 />
//               </View>
//             </View>

//             <View style={styles.modalActions}>
//               <TouchableOpacity
//                 style={styles.modalBtnCancel}
//                 onPress={() => setShowAddressModal(false)}
//                 activeOpacity={0.8}
//               >
//                 <Text style={styles.modalBtnCancelText}>Cancel</Text>
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={[
//                   styles.modalBtnOkay,
//                   !addressForm.street.trim() && styles.modalBtnDisabled,
//                 ]}
//                 onPress={handleAddressFormSubmit}
//                 disabled={!addressForm.street.trim()}
//                 activeOpacity={0.85}
//               >
//                 <Text style={styles.modalBtnOkayText}>Okay</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </KeyboardAvoidingView>
//       </Modal>
//       {/* ── Client Notes Modal ──────────────────────────────────────── */}
//             <ClientNotesModal
//         visible={showClientNotes}
//         clientName={clientLabel}
//         notes={showingRequest?.notes}
//         onClose={() => setShowClientNotes(false)}
//       />
//     </View>
//   );
// };

// export default InitialScreen;

// const styles = StyleSheet.create({
//   centered: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//     gap: 12,
//   },
//   loadingText: {
//     fontSize: 14,
//     color: colors.textSecondary,
//   },

//   // ── Preferred Date & Time card ──
//   dateTimeCard: {
//     flexDirection: "row",
//     alignItems: "center",
//     justifyContent: "space-between",
//     backgroundColor: colors.white,
//     borderRadius: 10,
//     borderWidth: 1,
//     borderColor: colors.border,
//     paddingHorizontal: 14,
//     paddingVertical: 12,
//     marginBottom: 10,
//   },
//   dateTimeLeft: {
//     flexDirection: "row",
//     alignItems: "center",
//     flex: 1,
//     gap: 10,
//   },
//   dateTimeIcon: {
//     fontSize: 18,
//   },
//   dateTimeText: {
//     flex: 1,
//   },
//   dateTimeLabel: {
//     fontSize: 10,
//     fontWeight: "700",
//     color: colors.textSecondary,
//     textTransform: "uppercase",
//     letterSpacing: 0.5,
//     marginBottom: 3,
//   },
//   dateTimeValue: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: colors.textPrimary,
//   },
//   dateTimeUpdatingRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 6,
//   },
//   dateTimeUpdatingText: {
//     fontSize: 13,
//     color: colors.blue,
//   },
//   editBtn: {
//     paddingHorizontal: 14,
//     paddingVertical: 6,
//     borderRadius: 8,
//     borderWidth: 1.5,
//     borderColor: colors.blue,
//     backgroundColor: colors.blueLight,
//     marginLeft: 10,
//   },
//   editBtnText: {
//     fontSize: 13,
//     fontWeight: "600",
//     color: colors.blue,
//   },

//   // ── Start Point Card ──
//   startPointCard: {
//     backgroundColor: colors.blueLight,
//     borderRadius: 10,
//     borderWidth: 1,
//     borderColor: colors.blueBorder,
//     paddingHorizontal: 14,
//     paddingVertical: 12,
//     marginBottom: 16,
//   },
//   startPointLabel: {
//     fontSize: 11,
//     color: colors.blue,
//     textTransform: "uppercase",
//     fontWeight: "700",
//     letterSpacing: 0.5,
//     marginBottom: 10,
//   },
//   updatingRow: {
//     flexDirection: "row",
//     alignItems: "center",
//     gap: 6,
//     marginBottom: 8,
//   },
//   updatingText: {
//     fontSize: 12,
//     color: colors.blue,
//   },
//   startPointOptions: {
//     flexDirection: "row",
//     flexWrap: "wrap",
//     gap: 8,
//   },
//   optionBtn: {
//     paddingHorizontal: 14,
//     paddingVertical: 7,
//     borderRadius: 20,
//     borderWidth: 1.5,
//     borderColor: colors.blue,
//     backgroundColor: colors.white,
//   },
//   optionBtnActive: {
//     backgroundColor: colors.blue,
//   },
//   optionBtnText: {
//     fontSize: 13,
//     color: colors.blue,
//     fontWeight: "500",
//   },
//   optionBtnTextActive: {
//     color: colors.white,
//   },
//   resolvedAddress: {
//     fontSize: 12,
//     color: colors.textSecondary,
//     marginTop: 8,
//     fontStyle: "italic",
//   },

//   // ── No Properties Empty State ──
//   noPropertiesCard: {
//     alignItems: "center",
//     justifyContent: "center",
//     paddingVertical: 32,
//     paddingHorizontal: 20,
//     backgroundColor: colors.white,
//     borderRadius: 10,
//     borderWidth: 1,
//     borderColor: colors.border,
//     marginBottom: 8,
//   },
//   noPropertiesIcon: {
//     fontSize: 36,
//     marginBottom: 10,
//   },
//   noPropertiesText: {
//     fontSize: 16,
//     fontWeight: "700",
//     color: colors.textPrimary,
//     marginBottom: 4,
//   },
//   noPropertiesSubtext: {
//     fontSize: 13,
//     color: colors.textSecondary,
//     textAlign: "center",
//   },

//   // ── Property List Item ──
//   propertyCard: {
//     flexDirection: "row",
//     alignItems: "center",
//     backgroundColor: colors.white,
//     borderRadius: 10,
//     borderWidth: 1,
//     borderColor: colors.border,
//     paddingHorizontal: 14,
//     paddingVertical: 12,
//     marginBottom: 8,
//   },
//   propertyInfo: {
//     flex: 1,
//     marginLeft: 12,
//   },
//   address: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: colors.textPrimary,
//   },
//   meta: {
//     fontSize: 12,
//     color: colors.textSecondary,
//     marginTop: 2,
//   },

//   // ── Button ──
//   btnDisabled: {
//     backgroundColor: colors.border,
//     opacity: 1,
//   },
//   btnDisabledText: {
//     color: colors.textSecondary,
//   },

//   // ── Modal ──
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: "rgba(0,0,0,0.45)",
//     justifyContent: "center",
//     paddingHorizontal: 20,
//   },
//   modalCard: {
//     backgroundColor: colors.white,
//     borderRadius: 14,
//     padding: 20,
//   },
//   modalTitle: {
//     fontSize: 17,
//     fontWeight: "700",
//     color: colors.textPrimary,
//     marginBottom: 16,
//   },
//   fieldLabel: {
//     fontSize: 11,
//     fontWeight: "600",
//     color: colors.textSecondary,
//     textTransform: "uppercase",
//     letterSpacing: 0.4,
//     marginBottom: 4,
//     marginTop: 10,
//   },
//   fieldInput: {
//     borderWidth: 1,
//     borderColor: colors.border,
//     borderRadius: 8,
//     paddingHorizontal: 10,
//     paddingVertical: 9,
//     fontSize: 14,
//     color: colors.textPrimary,
//     backgroundColor: colors.white,
//   },
//   fieldRow: {
//     flexDirection: "row",
//     gap: 10,
//   },
//   fieldHalf: {
//     flex: 1,
//   },
//   modalActions: {
//     flexDirection: "row",
//     justifyContent: "flex-end",
//     gap: 10,
//     marginTop: 20,
//   },
//   modalBtnCancel: {
//     paddingHorizontal: 18,
//     paddingVertical: 10,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: colors.border,
//   },
//   modalBtnCancelText: {
//     fontSize: 14,
//     fontWeight: "500",
//     color: colors.textSecondary,
//   },
//   modalBtnOkay: {
//     paddingHorizontal: 22,
//     paddingVertical: 10,
//     borderRadius: 8,
//     backgroundColor: colors.blue,
//   },
//   modalBtnOkayText: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: colors.white,
//   },
//   modalBtnDisabled: {
//     opacity: 0.45,
//   },

//   // ── Client row ──
//   clientRow: {
//   position: 'relative',
//   marginBottom: 10,
// },
// viewNotesBtnWrapper: {
//   position: 'absolute',
//   right: 14,
//   top: '50%',
//   transform: [{ translateY: -16 }], // half the button height, adjust if needed
// },
//   viewNotesBtn: {
//     position: "absolute",
//     right: 14,
//     borderWidth: 1,
//     borderColor: colors.blue,
//     borderRadius: 14,
//     paddingHorizontal: 12,
//     paddingVertical: 5,
//   },
//   viewNotesBtnText: {
//     fontSize: 12,
//     color: colors.blue,
//     fontWeight: "600",
//   },
// });
