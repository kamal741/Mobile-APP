import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Client } from '../../types/tour.types';
import { sharedStyles as ss } from '../../styles/shared.styles';
import { StepHeader } from './StepHeader';

interface Props {
  clients:        Client[];
  clientsLoading: boolean;
  selectedClient: Client | null;
  clientSearch:   string;
  onSearchChange: (text: string) => void;
  onSelectClient: (client: Client) => void;
}

export function SelectClientStep({
  clients,
  clientsLoading,
  selectedClient,
  clientSearch,
  onSearchChange,
  onSelectClient,
}: Props) {
  const filtered = clients.filter(
    (c) =>
      clientSearch === '' ||
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(clientSearch.toLowerCase()),
  );

  return (
    <View>
      <StepHeader icon="👥" title="Select client" subtitle="Choose who this tour is for" />

      <TextInput
        style={ss.searchInput}
        placeholder="Search clients..."
        value={clientSearch}
        onChangeText={onSearchChange}
        placeholderTextColor="#94a3b8"
      />

      <Text style={ss.sectionLabel}>Individual Clients</Text>

      {clientsLoading ? (
        <ActivityIndicator size="small" color="#1e40af" style={{ marginVertical: 20 }} />
      ) : filtered.length === 0 ? (
        <Text style={ss.emptyText}>No clients found</Text>
      ) : (
        filtered.map((client) => {
          const isActive = selectedClient?.id === client.id;
          return (
            <TouchableOpacity
              key={client.id}
              style={[ss.selectCard, isActive && ss.selectCardActive]}
              onPress={() => onSelectClient(client)}
              activeOpacity={0.7}
            >
              <View style={ss.selectCardContent}>
                <View style={ss.selectCardInfo}>
                  <Text style={ss.selectCardTitle}>
                    {client.firstName} {client.lastName}
                  </Text>
                  <Text style={ss.selectCardSubtitle}>{client.email}</Text>
                  <View style={ss.typeBadge}>
                    <Text style={ss.typeBadgeText}>{client.clientType || 'buyer'}</Text>
                  </View>
                </View>
                {isActive && <Text style={ss.checkIcon}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}
