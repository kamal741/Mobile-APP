import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
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
import { Property } from '../../types/tour.types';
import { createTourStyles as s } from '../../screens/createTour.styles';
import { sharedStyles as ss } from '../../styles/shared.styles';
import { StepHeader } from './StepHeader';
import { formatPrice } from '../../utils/tourValidation.utils';
import { ViewMoreFooter } from '../../../BrowseProperty/components/ViewMoreFooter';

interface Props {
  selectedCount:     number;
  searchQuery:       string;
  onSearchChange:    (text: string) => void;
  isPropertySelected: (id: string) => boolean;
  onToggleProperty:   (property: Property) => void;
}

export function SelectPropertiesStep({
  selectedCount,
  searchQuery,
  onSearchChange,
  isPropertySelected,
  onToggleProperty,
}: Props) {
  const navigation = useNavigation<any>();
  const [filters, setFilters] = useState<PropertyFilters>(EMPTY_PROPERTY_FILTERS);
  const [properties, setProperties] = useState<Property[]>([]);
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

  const mapProperty = (property: PropertySearchItem): Property => ({
    id: String(property.id),
    address: property.address,
    city: property.city,
    province: property.province,
    price: property.price,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    propertyType: property.propertyType,
    imageUrl: property.imageUrl ?? undefined,
  });

  const hasMore = page + 1 < totalPages;
  const displayedProperties = useMemo(() => {
    if (sortByPrice === 'none') return properties;
    const sorted = [...properties].sort((a, b) => a.price - b.price);
    return sortByPrice === 'priceDesc' ? sorted.reverse() : sorted;
  }, [properties, sortByPrice]);

  return (
    <View>
      <StepHeader
        icon="🏠"
        title="Select Properties"
        subtitle="Choose properties for the tour"
      />


      <PropertySection
        searchQuery={searchQuery}
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
          const mapped = items.map(mapProperty);
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
        <>
          <View style={{ height: 12 }} />
          {displayedProperties.map((property) => {
            const selected = isPropertySelected(property.id);
            return (
              <TouchableOpacity
                key={property.id}
                style={[ss.selectCard, selected && ss.selectCardActive]}
                onPress={() => onToggleProperty(property)}
              >
                <View style={ss.selectCardContent}>
                  <View style={ss.selectCardInfo}>
                    <Text style={ss.selectCardTitle} numberOfLines={1}>
                      {property.address}
                    </Text>
                    <Text style={ss.selectCardSubtitle}>
                      {property.city}, {property.province}
                    </Text>
                    <View style={s.propertyMeta}>
                      <View style={ss.typeBadge}>
                        <Text style={ss.typeBadgeText}>{property.propertyType}</Text>
                      </View>
                      <Text style={s.propertySpecs}>
                        {property.bedrooms}br / {property.bathrooms}ba
                      </Text>
                      <Text style={s.propertyPrice}>{formatPrice(property.price)}</Text>
                    </View>
                  </View>
                  {selected && <Text style={ss.checkIcon}>✓</Text>}
                </View>

                <View style={s.propertyCardActions}>
                  <Text style={s.propertySelectHint}>
                    {selected ? 'Selected for tour' : 'Tap card to select'}
                  </Text>
                  <TouchableOpacity
                    style={s.viewPropertyButton}
                    activeOpacity={0.75}
                    onPress={(event) => {
                      event.stopPropagation();
                      navigation.navigate('PropertyDetails', {
                        propertyId: Number(property.id),
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
          })}
        </>
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

      {selectedCount > 0 && (
        <View style={s.selectedSummary}>
          <Text style={s.selectedSummaryText}>
            {selectedCount} {selectedCount === 1 ? 'property' : 'properties'} selected
          </Text>
        </View>
      )}
    </View>
  );
}
