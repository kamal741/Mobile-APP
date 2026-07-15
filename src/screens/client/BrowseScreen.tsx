import { View, StyleSheet } from 'react-native';
import { useState } from 'react';
import { PropertySection, EMPTY_PROPERTY_FILTERS } from '../../components/PropertySection';
import { ClientFooter } from './components/ClientFooter';

export function BrowseScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState(EMPTY_PROPERTY_FILTERS);

  return (
    <View style={styles.container}>
      <PropertySection
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <ClientFooter/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});

