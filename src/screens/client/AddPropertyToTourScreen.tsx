import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Dimensions,
  Image,
  StatusBar,
} from 'react-native';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api, apiRequest } from '@/lib/api';
import { API_GLOBAL_PATHS } from '@/lib/apiGlobalPaths';
import { fetchPropertySearch } from '@/lib/propertyApi';
import { queryClient } from '../../lib/queryClient';
import { agentTourPropertiesUrl, tourPropertiesQueryKey, tourDetailQueryKey } from '../../lib/tourApi';
import { Card, CardContent } from '../../components/Card';
import { Input } from '../../components/Input';
import { PropertyPhotoCarousel, PropertyPhoto } from '@/components/PropertyPhotoCarousel';
// import { FullScreenImageModal } from '@/components/FullScreenImageModal';
import { FullScreenImageModal } from '../agent/BrowseProperty/components/FullScreenImageModal'; 

export function AddPropertyToTourScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { tourId } = route.params;
  const [searchQuery, setSearchQuery] = useState('');

  // ── Full-screen modal state ──────────────────────────────────────────
  const [modalPhotos, setModalPhotos] = useState<PropertyPhoto[]>([]);
  const [modalStartIndex, setModalStartIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  const openFullScreen = (photos: PropertyPhoto[], startIndex: number) => {
    setModalPhotos(photos);
    setModalStartIndex(startIndex);
    setModalVisible(true);
  };

  // ── Queries ──────────────────────────────────────────────────────────
  const { data: allProperties, isLoading, refetch } = useQuery<any[]>({
    queryKey: ['properties', 'search', {}],
    queryFn: () => fetchPropertySearch().then((r) => r.items),
  });

  const { data: tourProperties } = useQuery<any[]>({
    queryKey: tourPropertiesQueryKey('agent', tourId),
    queryFn: () => api.get(agentTourPropertiesUrl(tourId)).then((r) => r.data),
    enabled: !!tourId,
  });

  const alreadyAddedIds = new Set(
    (tourProperties || []).map(
      (tp: { masterPropertyId?: number; propertyId?: string }) =>
        String(tp.masterPropertyId ?? tp.propertyId)
    )
  );

  // ── Mutation ─────────────────────────────────────────────────────────
  const addPropertyMutation = useMutation({
    mutationFn: (masterPropertyId: string) => {
      const n = Number(masterPropertyId);
      if (Number.isNaN(n)) return Promise.reject(new Error('Invalid property id'));
      return apiRequest('POST', `${agentTourPropertiesUrl(tourId)}`, { masterPropertyId: n });
    },
    onSuccess: () => {
      if (tourId) {
        void queryClient.invalidateQueries({ queryKey: tourPropertiesQueryKey('agent', tourId) });
        void queryClient.invalidateQueries({ queryKey: tourDetailQueryKey('agent', tourId) });
        void queryClient.invalidateQueries({ queryKey: [API_GLOBAL_PATHS.agentTours] });
      }
    },
  });

  const formatPrice = (price: any) => {
    if (!price) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(Number(price));
  };

  const filteredProperties = (allProperties || []).filter((p: any) =>
    p.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Card renderer ────────────────────────────────────────────────────
  const renderProperty = ({ item }: { item: any }) => {
    const mid = String(item.id);
    const isAdded = alreadyAddedIds.has(mid);
    const isAdding = addPropertyMutation.isPending && addPropertyMutation.variables === mid;

    const displayPhotos: PropertyPhoto[] = (item.photos ?? []).filter(
      (p: PropertyPhoto) => !p.mediaCategory || p.mediaCategory === 'Property Photo'
    );

    return (
      <Card style={styles.propertyCard}>
        {/* ── Carousel with enlarge support ── */}
        <PropertyPhotoCarousel
          photos={displayPhotos}
          imageUrl={item.imageUrl}
          height={180}
          onEnlargePress={(photos, startIndex) => openFullScreen(photos, startIndex)}
        />

        {/* ── Price row (outside inner TouchableOpacity to avoid nesting) ── */}
        <View style={styles.priceRowOuter}>
          <Text style={styles.price}>{formatPrice(item.price)}</Text>
        </View>

        {/* ── Card body — tap navigates to detail ── */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate('PropertyDetails', { propertyId: item.id })}
        >
          <CardContent style={styles.cardContent}>
            <Text style={styles.address} numberOfLines={2}>{item.address}</Text>
            {(item.city || item.province) && (
              <Text style={styles.location}>
                {[item.city, item.province].filter(Boolean).join(', ')}
              </Text>
            )}

            <View style={styles.specs}>
              <Text style={styles.spec}>{item.bedrooms} bed</Text>
              <Text style={styles.specDivider}>•</Text>
              <Text style={styles.spec}>{item.bathrooms} bath</Text>
              {item.area && (
                <>
                  <Text style={styles.specDivider}>•</Text>
                  <Text style={styles.spec}>{item.area}</Text>
                </>
              )}
              {item.propertyType && (
                <>
                  <Text style={styles.specDivider}>•</Text>
                  <Text style={styles.spec}>{item.propertyType}</Text>
                </>
              )}
            </View>

            <TouchableOpacity
              style={[styles.addButton, isAdded && styles.addedButton]}
              onPress={(e) => {
                e.stopPropagation();
                if (!isAdded) addPropertyMutation.mutate(mid);
              }}
              disabled={isAdded || isAdding}
            >
              <Text style={[styles.addButtonText, isAdded && styles.addedButtonText]}>
                {isAdded ? '✓ Added to Tour' : isAdding ? 'Adding...' : '+ Add to Tour'}
              </Text>
            </TouchableOpacity>
          </CardContent>
        </TouchableOpacity>
      </Card>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Input
          placeholder="Search by address..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          containerStyle={styles.searchInput}
        />
      </View>

      <FlatList
        data={filteredProperties}
        renderItem={renderProperty}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🏠</Text>
            <Text style={styles.emptyText}>No properties found</Text>
          </View>
        }
      />

      {/* Full-screen image modal */}
      <FullScreenImageModal
        visible={modalVisible}
        photos={modalPhotos}
        startIndex={modalStartIndex}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  searchBar: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInput: {
    marginBottom: 0,
  },
  list: {
    padding: 16,
  },
  propertyCard: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  priceRowOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  price: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e40af',
  },
  cardContent: {
    paddingTop: 4,
  },
  address: {
    fontSize: 14,
    color: '#1e293b',
    marginTop: 4,
    lineHeight: 20,
  },
  location: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  specs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 12,
  },
  spec: {
    fontSize: 13,
    color: '#94a3b8',
  },
  specDivider: {
    fontSize: 13,
    color: '#94a3b8',
    marginHorizontal: 6,
  },
  addButton: {
    backgroundColor: '#1e40af',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  addedButton: {
    backgroundColor: '#dcfce7',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  addedButtonText: {
    color: '#16a34a',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
  },
});

