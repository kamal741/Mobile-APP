import { useMutation } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { apiRequest } from '../../../../lib/api';
import { API_GLOBAL_PATHS } from '../../../../lib/apiGlobalPaths';
import { queryClient } from '../../../../lib/queryClient';
import { buildCreateTourRequestBody, invalidateTourListCaches } from '../../../../lib/tourApi';
import { Client, SelectedProperty } from '../types/tour.types';
import { isValidTime, isValidDate } from '../utils/tourValidation.utils';
import { DEFAULT_START_TIME } from '../constants/tour.constants';

interface UseTourMutationParams {
  selectedClient:     Client | null;
  selectedProperties: SelectedProperty[];
  scheduledDate:      string;
  startTime:          string;
  notes:              string;
  showAlert: (
    title: string,
    message: string,
    buttons?: { text: string; onPress?: () => void; style?: string }[],
  ) => void;
}

export function useCreateTourMutation({
  selectedClient,
  selectedProperties,
  scheduledDate,
  startTime,
  notes,
  showAlert,
}: UseTourMutationParams) {
  const navigation = useNavigation<any>();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedClient) throw new Error('No client selected');

      const time        = isValidTime(startTime) ? startTime : DEFAULT_START_TIME;
      const dateTimeStr = `${scheduledDate}T${time.length === 5 ? `${time}:00` : time}`;
      const start       = new Date(dateTimeStr);
      const sched       = new Date(`${scheduledDate}T12:00:00`);
      const estMins     =
        selectedProperties.reduce((sum, p) => sum + (p.estimatedDuration || 0), 0) || null;

      const body = buildCreateTourRequestBody({
        clientProfileId:          Number(selectedClient.id),
        groupId:                  null,
        scheduledDate:            sched,
        startTime:                start,
        endTime:                  null,
        timezone:                 Intl.DateTimeFormat().resolvedOptions().timeZone,
        notes:                    notes || null,
        estimatedDurationMinutes: estMins,
        masterPropertyIds:        selectedProperties
          .map((p) => Number(p.id))
          .filter((n) => !Number.isNaN(n)),
      });

      return apiRequest('POST', API_GLOBAL_PATHS.agentTours, body);
    },

    onSuccess: (response: any) => {
      invalidateTourListCaches();
      queryClient.invalidateQueries({ queryKey: [API_GLOBAL_PATHS.agentStats] });

      const name  = selectedClient
        ? `${selectedClient.firstName} ${selectedClient.lastName}`
        : 'the client';
      const tourId = response?.id ?? response?.data?.id;

      showAlert('Tour Created!', `Tour has been successfully scheduled for ${name}.`, [
        {
          text: 'OK',
          onPress: () => {
            if (tourId) {
              navigation.replace('TourDetails', { tourId: String(tourId) });
            } else {
              navigation.goBack();
            }
          },
        },
      ]);
    },

    onError: (error: any) => {
      const status = error?.response?.status;
      console.log('Tour creation error:', JSON.stringify(error?.response?.data));

      if (status === 409) {
        const duplicateId = error?.response?.data?.duplicateTourId;
        const buttons: any[] = [{ text: 'Cancel', style: 'cancel' }];

        if (duplicateId) {
          buttons.push({
            text: 'View Existing Tour',
            onPress: () => {
              navigation.goBack();
              navigation.navigate('TourDetail' as any, { tourId: duplicateId });
            },
          });
        }

        showAlert(
          'Tour Already Exists',
          'A tour with the same client, date, and properties already exists.',
          buttons,
        );
      } else {
        const msg =
          error?.response?.data?.message ||
          error?.message ||
          'Failed to create tour. Please try again.';
        showAlert('Tour Creation Failed', msg);
      }
    },
  });

  const handleCreate = (canSubmit: boolean) => {
    if (!canSubmit || !selectedClient || selectedProperties.length === 0 || !isValidDate(scheduledDate)) {
      showAlert('Missing Information', 'Please complete all required fields with valid values.');
      return;
    }
    mutation.mutate();
  };

  return { mutation, handleCreate };
}
