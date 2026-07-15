import React, { useState } from 'react';
import { View, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { useRoute } from '@react-navigation/native';

import { useClientProfile } from '../hooks/useClientProfile';
import { useDeleteClient } from '../hooks/useDeleteClient';
import { buildProfileStats } from '../utils/clientProfile.utils';

import { ClientProfileHeader } from '../components/ClientProfileHeader';
import { ProfileMenuList } from '../components/ProfileMenuList';
import { DeleteClientModal } from '../components/DeleteClientModal';

import { colors, spacing } from '../styles/shared.styles';
import { Client } from '../types/client.types';
import { BrokerageFooter } from '@/screens/brokerage/components/BrokerageFooter';
import { AgentFooter } from '../../components/AgentFooter';

export function ClientProfileScreen() {
  const route = useRoute<any>();
  const { clientId, client, offersCount = 0 } = route.params as {
    clientId: string;
    client: Client;
    offersCount: number;
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    clientRequirementsEnhanced,
    clientHistory,
    clientShortlists,
    clientDocuments,
    clientMedia,
    clientNotes,
    clientGroups,
    isLoading: isProfileLoading,
  } = useClientProfile(clientId);

  const { handleDelete, confirmDelete, isPending } = useDeleteClient({
    clientId,
    client,
    onRequestConfirm: () => setShowDeleteConfirm(true),
    onDismissConfirm: () => setShowDeleteConfirm(false),
  });

  const stats = buildProfileStats(clientHistory, clientShortlists.length);

  if (!client || isProfileLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <ClientProfileHeader
        client={client}
        isDeleting={isPending}
        onDelete={handleDelete}
        hasSharedStats={client.hasSharedStats ?? false}
      />

      <ProfileMenuList
        clientId={clientId}
        clientName={`${client.firstName} ${client.lastName}`.trim()}
        totalTours={stats.totalTours}
        shortlistsCount={clientShortlists.length}
        documentsCount={clientDocuments.length}
        mediaCount={clientMedia.length}
        notesCount={clientNotes.length}
        groupsCount={clientGroups.length}
        hasRequirementsEnhanced={!!clientRequirementsEnhanced}
        offersCount={offersCount}
      />

      <DeleteClientModal
        visible={showDeleteConfirm}
        clientName={`${client.firstName} ${client.lastName}`}
        isDeleting={isPending}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </ScrollView>

    <AgentFooter />
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: colors.bgPage },
  content: { padding: spacing.lg },
});
