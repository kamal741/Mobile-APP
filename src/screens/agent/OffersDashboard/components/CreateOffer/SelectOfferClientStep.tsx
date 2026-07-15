import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import type { OfferClient } from '../../types/createOffer.types';
import { OFFER_STRINGS } from '../../constants/createOffer.constants';
import { sharedOfferStyles as ss } from '../../styles/shared.styles';
import { C } from '../../styles/shared.styles';
import { OfferStepHeader } from './OfferStepHeader';
import { OFFER_STEP_LABELS } from '../../constants/createOffer.constants';

interface Props {
  clients:        OfferClient[];
  clientsLoading: boolean;
  selectedClient: OfferClient | null;
  clientSearch:   string;
  onSearchChange: (t: string) => void;
  onSelectClient: (c: OfferClient) => void;
}

export function SelectOfferClientStep({
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

  const { icon, title, subtitle } = OFFER_STEP_LABELS[1];

  return (
    <View>
      <OfferStepHeader icon={icon} title={title} subtitle={subtitle} />

      <TextInput
        style={ss.searchInput}
        placeholder={OFFER_STRINGS.SEARCH_CLIENT}
        value={clientSearch}
        onChangeText={onSearchChange}
        placeholderTextColor={C.textMuted}
      />

      {clientsLoading ? (
        <ActivityIndicator size="small" color={C.primary} style={{ marginVertical: 20 }} />
      ) : filtered.length === 0 ? (
        <Text style={ss.emptyText}>{OFFER_STRINGS.NO_CLIENTS}</Text>
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
                  <Text style={ss.selectCardSub}>{client.email}</Text>
                  {client.phone ? (
                    <Text style={ss.selectCardSub}>{client.phone}</Text>
                  ) : null}
                  <View style={ss.typeBadge}>
                    <Text style={ss.typeBadgeText}>{client.clientType ?? 'buyer'}</Text>
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
