import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowRight, ExternalLink } from 'lucide-react-native';
import {
  EMPTY_PROPERTY_FILTERS,
  PropertySection,
  type SortByPrice,
} from '@/components/PropertySection';
import type {
  PropertyFilters,
  PropertySearchItem,
} from '@/lib/propertyApi';
import type { ClientHistoryProperty } from '../../../../../lib/offersApi';
import { OFFER_STEP_LABELS } from '../../constants/createOffer.constants';
import { sharedOfferStyles as ss } from '../../styles/shared.styles';
import { createOfferStyles as s } from '../../styles/createOffer.styles';
import { OfferStepHeader } from './OfferStepHeader';
import { formatIndianPrice } from '../../utils/createOffer.utils';
import { ViewMoreFooter } from '../../../BrowseProperty/components/ViewMoreFooter';

interface Props {
  selectedProperty: ClientHistoryProperty | null;
  propertySearch: string;
  onSearchChange: (text: string) => void;
  onSelectProperty: (property: ClientHistoryProperty) => void;
}

function mapSearchProperty(property: PropertySearchItem): ClientHistoryProperty {
  return {
    id: property.id,
    imageUrl: property.imageUrl ?? '',
    address: property.address,
    city: property.city,
    province: property.province,
    propertyType: property.propertyType,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    price: property.price,
    rating: null,
    media: {
      totalCount: property.photos?.length ?? 0,
      photos: property.photos?.map((photo) => photo.url) ?? [],
      videos: [],
    },
  };
}

export function SelectOfferPropertyStep({
  selectedProperty,
  propertySearch,
  onSearchChange,
  onSelectProperty,
}: Props) {
  const navigation = useNavigation<any>();
  const [filters, setFilters] = useState<PropertyFilters>(EMPTY_PROPERTY_FILTERS);
  const [properties, setProperties] = useState<ClientHistoryProperty[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isFetching, setIsFetching] = useState(true);
  const [sortByPrice, setSortByPrice] = useState<SortByPrice>('none');

  const resetResults = () => {
    setPage(0);
    setProperties([]);
  };

  const handleSearchChange = (query: string) => {
    resetResults();
    onSearchChange(query);
  };

  const handleFiltersChange = (nextFilters: PropertyFilters) => {
    resetResults();
    setFilters(nextFilters);
  };

  const hasMore = page + 1 < totalPages;
  const displayedProperties = useMemo(() => {
    if (sortByPrice === 'none') return properties;
    const sorted = [...properties].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    return sortByPrice === 'priceDesc' ? sorted.reverse() : sorted;
  }, [properties, sortByPrice]);

  const { icon, title, subtitle } = OFFER_STEP_LABELS[2];

  return (
    <View>
      <OfferStepHeader icon={icon} title={title} subtitle={subtitle} />

      <PropertySection
        searchQuery={propertySearch}
        onSearchChange={handleSearchChange}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        page={page}
        pageSize={20}
        userType="Agent"
        controlsOnly
        sortByPrice={sortByPrice}
        onSortByPriceChange={setSortByPrice}
        onFetchingChange={setIsFetching}
        onResultsMetaChange={({
          items,
          page: responsePage,
          totalPages: nextTotalPages,
          totalElements: nextTotalElements,
        }) => {
          const mapped = items.map(mapSearchProperty);
          setTotalPages(nextTotalPages);
          setTotalElements(nextTotalElements);
          setPage(responsePage);
          setProperties((current) => {
            if (responsePage === 0) return mapped;
            const existingIds = new Set(current.map((property) => property.id));
            return [
              ...current,
              ...mapped.filter((property) => !existingIds.has(property.id)),
            ];
          });
        }}
      />

      {isFetching && page === 0 && properties.length === 0 ? (
        <ActivityIndicator size="small" color="#1e40af" style={{ marginVertical: 20 }} />
      ) : properties.length === 0 ? (
        <View style={s.propertyEmptyState}>
          <Text style={ss.emptyText}>No properties match your search</Text>
          <TouchableOpacity
            style={s.clearPropertyFiltersButton}
            onPress={() => {
              resetResults();
              onSearchChange('');
              setFilters(EMPTY_PROPERTY_FILTERS);
            }}
          >
            <Text style={s.clearPropertyFiltersText}>Clear search and filters</Text>
          </TouchableOpacity>
        </View>
      ) : (
        displayedProperties.map((property) => {
          const isActive = selectedProperty?.id === property.id;
          return (
            <TouchableOpacity
              key={property.id}
              style={[ss.selectCard, isActive && ss.selectCardActive]}
              onPress={() => onSelectProperty(property)}
              activeOpacity={0.7}
            >
              <View style={ss.selectCardContent}>
                <View style={ss.selectCardInfo}>
                  <Text style={ss.selectCardTitle} numberOfLines={1}>
                    {property.address}
                  </Text>
                  <Text style={ss.selectCardSub}>
                    {property.city ?? '—'}
                    {property.province ? `, ${property.province}` : ''}
                  </Text>
                  <View style={s.propertyMeta}>
                    <View style={ss.typeBadge}>
                      <Text style={ss.typeBadgeText}>
                        {property.propertyType ?? 'Property'}
                      </Text>
                    </View>
                    <Text style={s.propertySpecs}>
                      {property.bedrooms ?? '—'}br / {property.bathrooms ?? '—'}ba
                    </Text>
                    <Text style={s.propertyPrice}>
                      {property.price != null
                        ? `$${formatIndianPrice(property.price)}`
                        : 'Price unavailable'}
                    </Text>
                  </View>
                </View>
                {isActive && <Text style={ss.checkIcon}>✓</Text>}
              </View>

              <View style={s.propertyCardActions}>
                <Text style={s.propertySelectHint}>
                  {isActive ? 'Selected for offer' : 'Tap card to select'}
                </Text>
                <TouchableOpacity
                  style={s.viewPropertyButton}
                  activeOpacity={0.75}
                  onPress={(event) => {
                    event.stopPropagation();
                    navigation.navigate('PropertyDetails', {
                      propertyId: property.id,
                      userType: 'agent',
                    });
                  }}
                >
                  <ExternalLink size={14} color="#1e40af" />
                  <Text style={s.viewPropertyButtonText}>View property</Text>
                  <ArrowRight size={14} color="#1e40af" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {properties.length > 0 ? (
        <Text style={s.propertyResultCount}>
          Showing {properties.length} of {totalElements} properties
        </Text>
      ) : null}

      {isFetching && page > 0 ? (
        <ActivityIndicator size="small" color="#1e40af" style={{ marginVertical: 16 }} />
      ) : hasMore ? (
        <ViewMoreFooter
          totalElements={totalElements}
          loadedCount={properties.length}
          onLoadMore={() => setPage((current) => current + 1)}
        />
      ) : null}
    </View>
  );
}
