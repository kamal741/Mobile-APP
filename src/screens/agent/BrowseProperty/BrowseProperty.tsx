// BrowseProperty.tsx
import { useMemo, useState } from "react";
import { View, FlatList, RefreshControl, StyleSheet } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTourCart } from "../../../contexts/TourCartContext";
import {
  PropertySection,
  EMPTY_PROPERTY_FILTERS,
  SortByPrice,
} from "../../../components/PropertySection";
import { PropertySearchItem } from "../../../lib/propertyApi";
import { PropertyPhoto } from "../../../components/PropertyPhotoCarousel";
import NavbarAgent from "@/screens/agent/components/NavbarAgent";
import { AgentFooter } from "../components/AgentFooter";

// import { PropertyCard } from "./components/PropertyCard";
import { PropertyCardAgent } from "./components/PropertyCardAgent";
import { FullScreenImageModal } from "./components/FullScreenImageModal";
import { SharePropertySheet, ShareProperty } from "./components/SharePropertySheet";
import { EmptyState } from "./components/EmptyState";
import { ViewMoreFooter } from "./components/ViewMoreFooter";

export function BrowseProperty() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const userType: string | undefined = route.params?.userType;
  const isAgent = userType === "agent";

  const { addToCart, removeFromCart, isInCart } = useTourCart();

  // ── Search / filter / pagination state ──
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState(EMPTY_PROPERTY_FILTERS);
  const [properties, setProperties] = useState<PropertySearchItem[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [sortByPrice, setSortByPrice] = useState<SortByPrice>("none");

  // ── Modal / sheet state ──
  const [fsModal, setFsModal] = useState<{
    photos: PropertyPhoto[];
    startIndex: number;
  } | null>(null);
  const [shareSheet, setShareSheet] = useState<ShareProperty | null>(null);

  // ── Handlers ──
  const handleSearchChange = (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length === 0 || trimmed.length >= 3) {
      setPage(0);
      setProperties([]);
    }
    setSearchQuery(query);
  };

  const handleFiltersChange = (nextFilters: typeof EMPTY_PROPERTY_FILTERS) => {
    setPage(0);
    setProperties([]);
    setFilters(nextFilters);
  };

  const clearAllFilters = () => {
    setPage(0);
    setProperties([]);
    setFilters(EMPTY_PROPERTY_FILTERS);
  };

  const handleCartToggle = (property: PropertySearchItem) => {
    const id = String(property.id);
    if (isInCart(id)) {
      removeFromCart(id);
    } else {
      addToCart({
        id,
        address: property.address,
        price: property.price,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        squareFootage: property.area,
        imageUrl: property.imageUrl,
      });
    }
  };

  const navigateToDetail = (item: PropertySearchItem) =>
    navigation.navigate("PropertyDetails", {
      propertyId: item.id,
      userType: isAgent ? "agent" : userType,
    });

  const handleShareProperty = (item: PropertySearchItem) =>
    setShareSheet({
      id: item.id,
      address: item.address,
      price: item.price,
      bedrooms: item.bedrooms,
      bathrooms: item.bathrooms,
      city: item.city,
      province: item.province,
      propertyType: item.propertyType,
      imageUrl: item.imageUrl,
    });

  // ── Derived ──
  const hasMoreToShow = page + 1 < totalPages;

  const sortedProperties = useMemo(() => {
    if (sortByPrice === "none") return properties;
    const sorted = [...properties].sort((a, b) => a.price - b.price);
    return sortByPrice === "priceDesc" ? sorted.reverse() : sorted;
  }, [properties, sortByPrice]);

  return (
    <>
      <NavbarAgent title="Browse" />

      <View style={styles.container}>
        <FlatList
          data={sortedProperties}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <PropertyCardAgent
              item={item}
              isAgent={isAgent}
              inCart={isInCart(String(item.id))}
              onCartToggle={() => handleCartToggle(item)}
              onNavigateToDetail={() => navigateToDetail(item)}
              onShareProperty={() => handleShareProperty(item)}
              onOpenFullScreen={(photos, startIndex) =>
                setFsModal({ photos, startIndex })
              }
            />
          )}
          ListHeaderComponent={
            <PropertySection
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              filters={filters}
              onFiltersChange={handleFiltersChange}
              page={page}
              pageSize={20}
              onResultsMetaChange={({ items, page: responsePage, totalPages: tp, totalElements: te }) => {
                setTotalPages(tp);
                setTotalElements(te);
                setProperties((prev) => {
                  if (responsePage === 0) return items;
                  const existing = new Set(prev.map((p) => p.id));
                  const next = [...prev];
                  for (const it of items) {
                    if (!existing.has(it.id)) next.push(it);
                  }
                  return next;
                });
              }}
              onFetchingChange={setIsFetching}
              userType="Agent"
              controlsOnly
              sortByPrice={sortByPrice}
              onSortByPriceChange={setSortByPrice}
            />
          }
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={() => {}} />
          }
          ListEmptyComponent={
            !isFetching ? (
              <EmptyState filters={filters} onClearFilters={clearAllFilters} />
            ) : null
          }
          ListFooterComponent={
            hasMoreToShow && !isFetching ? (
              <ViewMoreFooter
                totalElements={totalElements}
                loadedCount={properties.length}
                onLoadMore={() => setPage((prev) => prev + 1)}
              />
            ) : null
          }
        />
      </View>

      <AgentFooter />

      <FullScreenImageModal
        visible={fsModal !== null}
        photos={fsModal?.photos ?? []}
        startIndex={fsModal?.startIndex ?? 0}
        onClose={() => setFsModal(null)}
      />

      <SharePropertySheet
        visible={shareSheet !== null}
        property={shareSheet}
        onClose={() => setShareSheet(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  listContent: {
    padding: 16,
  },
});