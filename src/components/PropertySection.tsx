import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
  Platform,
} from "react-native";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  usePropertySearch,
  PropertySearchItem,
  PropertyFilters,
  EMPTY_PROPERTY_FILTERS,
  PROPERTY_TYPE_OPTIONS,
  BASEMENT_FILTER_OPTIONS,
  PARKING_FILTER_OPTIONS,
  FIREPLACE_FILTER_OPTIONS,
  buildPropertySearchParams,
  countActivePropertyFilters,
  arePropertyFiltersEqual,
} from "../lib/propertyApi";
import { PropertyCard } from "./PropertyCard";
import { PropertyFilterRangeSlider } from "./PropertyFilterRangeSlider";
import {
  PRICE_FILTER_RANGE_CONFIG,
  AREA_FILTER_RANGE_CONFIG,
  LOT_DIMENSION_FILTER_RANGE_CONFIG,
  YEAR_BUILT_FILTER_RANGE_CONFIG,
} from "./propertyFilterRangeConfigs";
import {
  useClientShortlists,
  useSaveClientShortlist,
  useRemoveClientShortlist,
} from "../lib/clientApi";
import { useSafeAreaInsets } from "react-native-safe-area-context";
// ─── Constants ────────────────────────────────────────────────────────────────

const BEDS_OPTIONS = [
  { label: "Any", value: "" },
  { label: "1+", value: "1" },
  { label: "2+", value: "2" },
  { label: "3+", value: "3" },
  { label: "4+", value: "4" },
];

const BATHS_OPTIONS = [
  { label: "Any", value: "" },
  { label: "1+", value: "1" },
  { label: "2+", value: "2" },
  { label: "3+", value: "3" },
];

const SEARCH_DEBOUNCE_MS = 500;

function normalizeSchoolRatingInput(value: string): string {
  const normalized = value.replace(",", ".").replace(/[^\d.]/g, "");
  const [whole = "", ...fractionParts] = normalized.split(".");
  const hasDecimal = normalized.includes(".");
  const fraction = fractionParts.join("").slice(0, 1);
  const sanitized = hasDecimal
    ? `${whole || "0"}.${fraction}`
    : whole;
  const rating = Number(sanitized);

  return Number.isFinite(rating) && rating > 10 ? "10" : sanitized;
}

function withoutLocationFilters(filters: PropertyFilters): PropertyFilters {
  return {
    ...filters,
    city: "",
    postalCode: "",
    province: "",
    cityRegion: "",
    subdivisionName: "",
  };
}

export type { PropertyFilters } from "../lib/propertyApi";
export { EMPTY_PROPERTY_FILTERS } from "../lib/propertyApi";
export type SortByPrice = "none" | "priceAsc" | "priceDesc";

const SORT_OPTIONS: Array<{ label: string; value: SortByPrice }> = [
  { label: "Default", value: "none" },
  { label: "Price ↑", value: "priceAsc" },
  { label: "Price ↓", value: "priceDesc" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: PropertyFilters;
  onFiltersChange: (filters: PropertyFilters) => void;
  onResultsChange?: (
    results: PropertySearchItem[],
    totalElements: number,
  ) => void;
  onResultsMetaChange?: (meta: {
    items: PropertySearchItem[];
    totalElements: number;
    page: number;
    totalPages: number;
  }) => void;
  onFetchingChange?: (fetching: boolean) => void;
  userType?: "Client" | "Agent"; // ← add this
  controlsOnly?: boolean;
  page?: number;
  pageSize?: number;
  sortByPrice?: SortByPrice;
  onSortByPriceChange?: (value: SortByPrice) => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function PropertySection({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  onResultsChange,
  onResultsMetaChange,
  onFetchingChange,
  userType = "Client", // ← add this
  controlsOnly = false,
  page = 0,
  pageSize = 20,
  sortByPrice,
  onSortByPriceChange,
}: Props) {
  const insets = useSafeAreaInsets();
  const [showFilters, setShowFilters] = useState(false);
  const [draftFilters, setDraftFilters] = useState<PropertyFilters>(() =>
    withoutLocationFilters(filters),
  );
  const draftFiltersRef = useRef<PropertyFilters>(withoutLocationFilters(filters));
  const [localSortByPrice, setLocalSortByPrice] = useState<SortByPrice>("none");
  const [internalPage, setInternalPage] = useState(0);
  const [accumulatedItems, setAccumulatedItems] = useState<PropertySearchItem[]>([]);
  const browseSnapshotRef = useRef<{
    items: PropertySearchItem[];
    totalElements: number;
    page: number;
    totalPages: number;
  } | null>(null);

  const effectiveFilters = useMemo(() => withoutLocationFilters(filters), [filters]);
  const activeSortByPrice = sortByPrice ?? localSortByPrice;
  const setActiveSortByPrice = onSortByPriceChange ?? setLocalSortByPrice;
  const effectivePage = controlsOnly ? page : internalPage;

  // Debounce free-text search — only hit the API 500 ms after the user stops typing
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchQuery);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearchTerm(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    draftFiltersRef.current = effectiveFilters;
    setDraftFilters(effectiveFilters);
  }, [effectiveFilters]);

  useEffect(() => {
    draftFiltersRef.current = draftFilters;
  }, [draftFilters]);

  useEffect(() => {
    if (controlsOnly) return;
    const shouldResetForSearch =
      debouncedSearchTerm.length === 0 || debouncedSearchTerm.length >= 3;
    if (!shouldResetForSearch) return;
    setInternalPage(0);
    setAccumulatedItems([]);
  }, [controlsOnly, debouncedSearchTerm, effectiveFilters]);

  // ─── Build API params ──────────────────────────────────────────────────────
  const searchParams = buildPropertySearchParams(effectiveFilters, {
    searchTerm:
      debouncedSearchTerm.length >= 3 ? debouncedSearchTerm : undefined,
    page: effectivePage,
    size: pageSize,
  });

  const hasSearchTerm = debouncedSearchTerm.length > 0;
  const canQueryBySearchTerm = !hasSearchTerm || debouncedSearchTerm.length >= 3;

  // Always enabled — no filters = returns all properties (browse mode)
  const { data, isFetching, isError, refetch } = usePropertySearch(searchParams, {
    enabled: canQueryBySearchTerm,
  });

  useEffect(() => {
    if (!data) return;
    if (debouncedSearchTerm.length === 0) {
      browseSnapshotRef.current = {
        items: data.items,
        totalElements: data.totalElements,
        page: data.page,
        totalPages: data.totalPages,
      };
    }
  }, [data, debouncedSearchTerm]);

  const effectiveData = canQueryBySearchTerm ? data : browseSnapshotRef.current;

  const sortedAccumulatedItems = useMemo(() => {
    if (activeSortByPrice === "none") return accumulatedItems;
    const sorted = [...accumulatedItems].sort((a, b) => a.price - b.price);
    return activeSortByPrice === "priceDesc" ? sorted.reverse() : sorted;
  }, [accumulatedItems, activeSortByPrice]);
  const updateDraftFilters = (updater: (prev: PropertyFilters) => PropertyFilters) => {
    const next = updater(draftFiltersRef.current);
    draftFiltersRef.current = next;
    setDraftFilters(next);
  };

  const areFiltersEqual = arePropertyFiltersEqual;

  const togglePropertyType = (type: string) => {
    updateDraftFilters((prev) => ({
      ...prev,
      propertyTypes: prev.propertyTypes.includes(type)
        ? prev.propertyTypes.filter((value) => value !== type)
        : [...prev.propertyTypes, type],
    }));
  };


  // Push results up to BrowseScreen
  useEffect(() => {
    onResultsChange?.(effectiveData?.items ?? [], effectiveData?.totalElements ?? 0);
    if (effectiveData) {
      if (!controlsOnly) {
        setAccumulatedItems((prev) => {
          if (effectiveData.page === 0) return effectiveData.items;
          const existing = new Set(prev.map((item) => item.id));
          const next = [...prev];
          for (const item of effectiveData.items) {
            if (!existing.has(item.id)) next.push(item);
          }
          return next;
        });
      }
      onResultsMetaChange?.({
        items: effectiveData.items,
        totalElements: effectiveData.totalElements,
        page: effectiveData.page,
        totalPages: effectiveData.totalPages,
      });
    }
  }, [effectiveData, controlsOnly]);

  // ─── Shortlist (save / unsave) ────────────────────────────────────────────
  // Only fetch/mutate shortlists for clients — agents get a 403 from this endpoint
  const isClient = userType !== "Agent";
  const { data: shortlists = [] } = useClientShortlists({ enabled: isClient });
  const saveShortlist = useSaveClientShortlist();
  const removeShortlist = useRemoveClientShortlist();

  /** Set of masterPropertyIds the user has already saved */
  const savedIds = new Set(shortlists.map((s) => s.masterPropertyId));

  const handleSaveToggle = (propertyId: number) => {
    if (!isClient) return; // agents cannot save shortlists
    if (savedIds.has(propertyId)) {
      removeShortlist.mutate(propertyId);
    } else {
      saveShortlist.mutate({ masterPropertyId: propertyId });
    }
  };

  // ─── Derived state ─────────────────────────────────────────────────────────
  const appliedFilterCount = countActivePropertyFilters(effectiveFilters);
  const draftFilterCount = countActivePropertyFilters(draftFilters);

  const activeFilterCount = showFilters ? draftFilterCount : appliedFilterCount;

  const resultCount = effectiveData?.totalElements ?? 0;
  const isPending = isFetching || searchQuery !== debouncedSearchTerm;
  const hasMoreToShow = (effectiveData?.page ?? 0) + 1 < (effectiveData?.totalPages ?? 0);
  const remainingCount = Math.max(0, (effectiveData?.totalElements ?? 0) - accumulatedItems.length);

  // Push pending state up so BrowseScreen can hide empty state during debounce/fetch.
  useEffect(() => {
    onFetchingChange?.(isPending);
  }, [isPending, onFetchingChange]);

  const clearFilters = () => {
    draftFiltersRef.current = EMPTY_PROPERTY_FILTERS;
    setDraftFilters(EMPTY_PROPERTY_FILTERS);
  };

  const clearAppliedFilters = () => {
    draftFiltersRef.current = EMPTY_PROPERTY_FILTERS;
    setDraftFilters(EMPTY_PROPERTY_FILTERS);
    onFiltersChange(EMPTY_PROPERTY_FILTERS);
  };

  const applyDraftFilters = () => {
    const nextFilters = withoutLocationFilters(draftFiltersRef.current);
    draftFiltersRef.current = nextFilters;
    setDraftFilters(nextFilters);
    onFiltersChange(nextFilters);
    if (areFiltersEqual(nextFilters, effectiveFilters)) {
      void refetch();
    }
    setShowFilters(false);
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={controlsOnly ? styles.rootControlsOnly : styles.root}>
      {/* ── Search + Filter bar ── */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrapper}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[
                styles.searchInput,
                Platform.OS === "web" ? styles.searchInputWeb : null,
              ]}
              placeholder="Search by keyword..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={onSearchChange}
              underlineColorAndroid="transparent"
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {isPending ? (
              <ActivityIndicator
                size="small"
                color="#1e40af"
                style={styles.inputSpinner}
              />
            ) : searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => onSearchChange("")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFilterCount > 0 && styles.filterButtonActive,
            ]}
            onPress={() => setShowFilters(true)}
          >
            <Text
              style={[
                styles.filterButtonIcon,
                activeFilterCount > 0 && styles.filterButtonIconActive,
              ]}
            >
              ⚙
            </Text>
            <Text
              style={[
                styles.filterButtonText,
                activeFilterCount > 0 && styles.filterButtonTextActive,
              ]}
            >
              Filter
            </Text>
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.sortRow}>
          {SORT_OPTIONS.map((opt) => {
            const active = activeSortByPrice === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.sortChip, active && styles.sortChipActive]}
                onPress={() => setActiveSortByPrice(opt.value)}
              >
                <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Filter Modal ── */}
      <Modal
        visible={showFilters}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilters(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowFilters(false)} />
        <View
          style={[
            styles.modalWrap,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <View style={styles.filterPanel}>
            <View style={styles.sheetHandle} />
            <View style={styles.filterHeader}>
              <View>
                <Text style={styles.filterTitle}>Filters</Text>
                <Text style={styles.filterSubtitle}>
                  {draftFilterCount > 0 ? `${draftFilterCount} active` : "Refine listings"}
                </Text>
              </View>
              <View style={styles.filterHeaderActions}>
                <TouchableOpacity onPress={clearFilters}>
                  <Text style={styles.filterHeaderClear}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowFilters(false)}>
                  <Text style={styles.filterHeaderClose}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={styles.filterScroll}
              contentContainerStyle={styles.filterScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
            <View style={styles.filterGroup}>
            <Text style={styles.filterSectionLabel}>Price Range</Text>
            <PropertyFilterRangeSlider
              config={PRICE_FILTER_RANGE_CONFIG}
              minValue={draftFilters.minPrice}
              maxValue={draftFilters.maxPrice}
              onChange={(min, max) =>
                updateDraftFilters((prev) => ({ ...prev, minPrice: min, maxPrice: max }))
              }
            />
            </View>

            <View style={styles.filterGroup}>
            <Text style={styles.filterSectionLabel}>Bedrooms</Text>
            <View style={styles.chipRow}>
              {BEDS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.chip,
                    draftFilters.minBeds === opt.value && styles.chipActive,
                  ]}
                  onPress={() =>
                    updateDraftFilters((prev) => ({ ...prev, minBeds: opt.value }))
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      draftFilters.minBeds === opt.value && styles.chipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            </View>

            <View style={styles.filterGroup}>
            <Text style={styles.filterSectionLabel}>Bathrooms</Text>
            <View style={styles.chipRow}>
              {BATHS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.chip,
                    draftFilters.minBaths === opt.value && styles.chipActive,
                  ]}
                  onPress={() =>
                    updateDraftFilters((prev) => ({ ...prev, minBaths: opt.value }))
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      draftFilters.minBaths === opt.value && styles.chipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            </View>

            <View style={styles.filterGroup}>
            <Text style={styles.filterSectionLabel}>Property Type</Text>
            <View style={styles.chipRow}>
              {PROPERTY_TYPE_OPTIONS.map((type) => {
                const selected = draftFilters.propertyTypes.includes(type);
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.chip, selected && styles.chipActive]}
                    onPress={() => togglePropertyType(type)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            </View>

            <View style={styles.filterGroup}>
            <Text style={styles.filterSectionLabel}>Interior Area</Text>
            <PropertyFilterRangeSlider
              config={AREA_FILTER_RANGE_CONFIG}
              minValue={draftFilters.minArea}
              maxValue={draftFilters.maxArea}
              onChange={(min, max) =>
                updateDraftFilters((prev) => ({ ...prev, minArea: min, maxArea: max }))
              }
            />
            </View>

            <View style={styles.filterGroup}>
            <Text style={styles.filterSectionLabel}>Lot Front (min)</Text>
            <PropertyFilterRangeSlider
              config={LOT_DIMENSION_FILTER_RANGE_CONFIG}
              minValue={draftFilters.minLotFront}
              maxValue=""
              minOnly
              onChange={(min) =>
                updateDraftFilters((prev) => ({ ...prev, minLotFront: min }))
              }
            />
            </View>

            <View style={styles.filterGroup}>
            <Text style={styles.filterSectionLabel}>Lot Depth (min)</Text>
            <PropertyFilterRangeSlider
              config={LOT_DIMENSION_FILTER_RANGE_CONFIG}
              minValue={draftFilters.minLotDepth}
              maxValue=""
              minOnly
              onChange={(min) =>
                updateDraftFilters((prev) => ({ ...prev, minLotDepth: min }))
              }
            />
            </View>

            <View style={styles.filterGroup}>
            <Text style={styles.filterSectionLabel}>Year Built</Text>
            <PropertyFilterRangeSlider
              config={YEAR_BUILT_FILTER_RANGE_CONFIG}
              minValue={draftFilters.minYearBuilt}
              maxValue={draftFilters.maxYearBuilt}
              onChange={(min, max) =>
                updateDraftFilters((prev) => ({
                  ...prev,
                  minYearBuilt: min,
                  maxYearBuilt: max,
                }))
              }
            />
            </View>

            <View style={styles.filterGroup}>
            <Text style={styles.filterSectionLabel}>Parking Spaces</Text>
            <View style={styles.chipRow}>
              {PARKING_FILTER_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value || "any"}
                  style={[
                    styles.chip,
                    draftFilters.minParking === opt.value && styles.chipActive,
                  ]}
                  onPress={() =>
                    updateDraftFilters((prev) => ({ ...prev, minParking: opt.value }))
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      draftFilters.minParking === opt.value && styles.chipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            </View>

            <View style={styles.filterGroup}>
            <Text style={styles.filterSectionLabel}>Basement</Text>
            <View style={styles.chipRow}>
              {BASEMENT_FILTER_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value || "any"}
                  style={[
                    styles.chip,
                    draftFilters.basement === opt.value && styles.chipActive,
                  ]}
                  onPress={() =>
                    updateDraftFilters((prev) => ({ ...prev, basement: opt.value }))
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      draftFilters.basement === opt.value && styles.chipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            </View>

            <View style={styles.filterGroup}>
            <Text style={styles.filterSectionLabel}>Fireplace</Text>
            <View style={styles.chipRow}>
              {FIREPLACE_FILTER_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value || "any"}
                  style={[
                    styles.chip,
                    draftFilters.fireplace === opt.value && styles.chipActive,
                  ]}
                  onPress={() =>
                    updateDraftFilters((prev) => ({ ...prev, fireplace: opt.value }))
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      draftFilters.fireplace === opt.value && styles.chipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            </View>

            <View style={styles.filterGroup}>
            <Text style={styles.filterSectionLabel}>School Rating (min /10)</Text>
            <TextInput
              style={styles.filterTextInput}
              placeholder="e.g. 7"
              placeholderTextColor="#94a3b8"
              value={draftFilters.minSchoolRating}
              onChangeText={(v) =>
                updateDraftFilters((prev) => ({
                  ...prev,
                  minSchoolRating: normalizeSchoolRatingInput(v),
                }))
              }
              keyboardType="decimal-pad"
              maxLength={4}
            />
            </View>
            </ScrollView>

            <View style={styles.filterFooter}>
              {activeFilterCount > 0 && (
                <TouchableOpacity
                  style={styles.clearAllButton}
                  onPress={clearFilters}
                >
                  <Text style={styles.clearAllText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.applyButton}
                onPress={applyDraftFilters}
              >
                <Text style={styles.applyButtonText}>
                  {isPending ? "Searching…" : "Apply Filters"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Error banner ── */}
      {isError && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>
            ⚠ Could not load results. Please try again.
          </Text>
        </View>
      )}

      {/* ── Results count bar ── */}
      {(searchQuery || activeFilterCount > 0) && !isError && (
        <View style={styles.resultsBar}>
          <Text style={styles.resultsText}>
            {isPending
              ? "Searching…"
              : `${resultCount} propert${resultCount !== 1 ? "ies" : "y"} found`}
          </Text>
          {activeFilterCount > 0 && (
            <TouchableOpacity onPress={clearAppliedFilters}>
              <Text style={styles.clearFiltersText}>Clear filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Property Cards ── */}
      {!controlsOnly && !isError && (
        <FlatList
          style={styles.list}
          data={sortedAccumulatedItems}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <PropertyCard
              property={item}
              userType={userType} // ← add this
              isSaved={savedIds.has(item.id)}
              isSaving={
                (saveShortlist.isPending || removeShortlist.isPending) &&
                (saveShortlist.variables?.masterPropertyId === item.id ||
                  removeShortlist.variables === item.id)
              }
              onSaveToggle={() => handleSaveToggle(item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={() => {}} />
          }
          ListEmptyComponent={
            !isPending ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🏘</Text>
                <Text style={styles.emptyTitle}>No properties found</Text>
                <Text style={styles.emptySubtitle}>
                  Try adjusting your search or filters.
                </Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            isPending ? (
              <ActivityIndicator
                size="large"
                color="#1e40af"
                style={styles.listSpinner}
              />
            ) : hasMoreToShow ? (
              <View style={styles.viewMoreWrap}>
                <TouchableOpacity
                  style={styles.viewMoreButton}
                  onPress={() => setInternalPage((prev) => prev + 1)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.viewMoreButtonText}>
                    View More ({remainingCount} left)
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  searchContainer: {
    padding: 12,
    paddingBottom: 10,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    zIndex: 5,
    elevation: 2,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sortRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sortChipActive: {
    backgroundColor: "#1e40af",
    borderColor: "#1e40af",
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  sortChipTextActive: {
    color: "#ffffff",
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
    overflow: "hidden",
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1e293b",
    borderWidth: 0,
    paddingVertical: 0,
    backgroundColor: "transparent",
  },
  searchInputWeb: {
    outlineStyle: "solid",
    outlineWidth: 0,
    outlineColor: "transparent",
  },
  inputSpinner: {
    marginLeft: 4,
  },
  clearIcon: {
    fontSize: 14,
    color: "#94a3b8",
    paddingLeft: 4,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 4,
  },
  filterButtonActive: {
    backgroundColor: "#1e40af",
  },
  filterButtonIcon: {
    fontSize: 14,
    color: "#475569",
  },
  filterButtonIconActive: {
    color: "#ffffff",
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  filterButtonTextActive: {
    color: "#ffffff",
  },
  filterBadge: {
    backgroundColor: "#ef4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#ffffff",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 23, 42, 0.52)",
  },
  modalWrap: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  filterPanel: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderWidth: 1,
    borderColor: "#dbe4ee",
    maxHeight: "88%",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 14,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#cbd5e1",
    marginBottom: 10,
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eaf0f6",
  },
  filterTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0f172a",
  },
  filterSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  filterHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  filterHeaderClear: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e40af",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  filterHeaderClose: {
    fontSize: 20,
    color: "#64748b",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  filterScroll: {
    marginHorizontal: -4,
  },
  filterScrollContent: {
    paddingHorizontal: 4,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 12,
  },
  filterGroup: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e6edf5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 11,
    paddingBottom: 12,
  },
  filterSectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  sliderSection: {
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priceInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
  },
  pricePrefix: {
    fontSize: 14,
    color: "#64748b",
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    fontSize: 14,
    color: "#1e293b",
  },
  priceSeparator: {
    fontSize: 14,
    color: "#94a3b8",
  },
  textFieldStack: {
    gap: 8,
  },
  filterTextInput: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: "#1e293b",
    borderWidth: 1,
    borderColor: "#dbe4ee",
  },
  rangeInput: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 14,
    color: "#1e293b",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    minHeight: 34,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe4ee",
  },
  chipActive: {
    backgroundColor: "#1646b8",
    borderColor: "#1646b8",
    shadowColor: "#1646b8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  chipText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "700",
  },
  chipTextActive: {
    color: "#ffffff",
    fontWeight: "600",
  },
  filterFooter: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#eaf0f6",
  },
  clearAllButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
  clearAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
  },
  applyButton: {
    flex: 2,
    backgroundColor: "#1646b8",
    minHeight: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1646b8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  errorBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#fef2f2",
  },
  errorText: {
    fontSize: 13,
    color: "#dc2626",
  },
  resultsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f8fafc",
  },
  resultsText: {
    fontSize: 13,
    color: "#64748b",
  },
  clearFiltersText: {
    fontSize: 13,
    color: "#1e40af",
    fontWeight: "600",
  },
  listContent: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  list: {
    flex: 1,
  },
  root: {
    flex: 1,
  },
  rootControlsOnly: {
    flexShrink: 0,
  },
  listSpinner: {
    marginVertical: 32,
  },
  viewMoreWrap: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 20,
  },
  viewMoreButton: {
    backgroundColor: "#1e40af",
    borderRadius: 10,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  viewMoreButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 56,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
  },
});


