import { useQuery, useMutation } from '@tanstack/react-query';

import { api, apiRequest } from '../../../../lib/api';
import { queryClient } from '../../../../lib/queryClient';
import { API_GLOBAL_PATHS } from '../../../../lib/apiGlobalPaths';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../../navigation/types';


import type {
  StatsResponse,
  Tour,
  ShowingRequest,
  Property,
  RequestDetail,
  PageDto,
} from '../types';
import { isToday } from '../utils';

// ─── useAgentDashboard ─────────────────────────────────────────────────────────

export function useAgentDashboard(selectedRequestId: string | null) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const statsTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: stats, isLoading, refetch } = useQuery<StatsResponse>({
    queryKey: [API_GLOBAL_PATHS.agentStats, statsTimezone],
    queryFn: () =>
      api
        .get(API_GLOBAL_PATHS.agentStats, { params: { timezone: statsTimezone } })
        .then((r) => r.data as StatsResponse),
  });

  // ← added refetch alias as refetchTours
  const { data: recentTours, refetch: refetchTours } = useQuery<Tour[]>({
    queryKey: [API_GLOBAL_PATHS.agentTours],
    queryFn: () =>
      api.get(API_GLOBAL_PATHS.agentTours).then((r) => r.data as Tour[]),
  });

  const { data: pendingRequests } = useQuery<ShowingRequest[]>({
    queryKey: [API_GLOBAL_PATHS.agentShowingRequests],
    queryFn: () =>
      api
        .get(API_GLOBAL_PATHS.agentShowingRequests)
        .then((r) => r.data as ShowingRequest[]),
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: [API_GLOBAL_PATHS.catalogPropertiesSearch],
    queryFn: () =>
      api.get(API_GLOBAL_PATHS.catalogPropertiesSearch).then((r) => r.data as Property[]),
  });

  const {
    data: activeClientsCount = 0,
    isLoading: isClientCountLoading,
    refetch: refetchClientCount,
  } = useQuery<number>({
    queryKey: ['agent-active-clients-count'],
    queryFn: async () => {
      const response = await api.get<PageDto<unknown>>(
        `${API_GLOBAL_PATHS.agentClients}?page=0&size=1`,
      );
      return response.data.totalElements ?? 0;
    },
  });

  const { data: requestDetail, isLoading: requestDetailLoading } =
    useQuery<RequestDetail>({
      queryKey: [
        API_GLOBAL_PATHS.agentShowingRequests,
        'detail',
        selectedRequestId,
      ],
      queryFn: () =>
        api
          .get(`${API_GLOBAL_PATHS.agentShowingRequests}/${selectedRequestId}`)
          .then((r) => r.data as RequestDetail),
      enabled: !!selectedRequestId,
    });

  // ── Mutation ───────────────────────────────────────────────────────────────
  const updateRequestStatus = useMutation({
    mutationFn: ({
      requestId,
      status,
      preferredDate,
      preferredTime,
    }: {
      requestId: string;
      status: string;
      preferredDate?: string;
      preferredTime?: string;
    }) =>
      apiRequest(
        'PATCH',
        `${API_GLOBAL_PATHS.agentShowingRequests}/${requestId}/status`,
        {
          status,
          ...(preferredDate ? { preferredDate } : {}),
          ...(preferredTime ? { preferredTime } : {}),
        },
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [API_GLOBAL_PATHS.agentShowingRequests],
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: [API_GLOBAL_PATHS.agentTours],
          refetchType: 'all',
        }),
        queryClient.invalidateQueries({
          queryKey: [API_GLOBAL_PATHS.agentStats],
          refetchType: 'all',
        }),
      ]);
    },
  });

  // ── Derived data ───────────────────────────────────────────────────────────
  const routePlanningCandidates =
    recentTours?.filter(
      (t) =>
        t.status === 'requested' ||
        t.status === 'scheduled' ||
        t.status === 'in_progress',
    ) ?? [];

  const routePlanningTours = routePlanningCandidates.filter((t) =>
    isToday(t.scheduledDate),
  );

  const pendingOnly =
    pendingRequests?.filter((r) => r.status === 'pending') ?? [];

  const offersPipeline =
    typeof stats?.offersPipeline === 'object' ? stats.offersPipeline : null;

  const pendingOffersCount = offersPipeline?.pending ?? 0;

  const handleRefresh = () => {
    refetch();
    refetchClientCount();
  };

  return {
    // State
    stats,
    isLoading,
    isClientCountLoading,
    activeClientsCount,
    routePlanningTours,
    pendingOnly,
    offersPipeline,
    pendingOffersCount,
    requestDetail,
    requestDetailLoading,
    properties,
    // Actions
    updateRequestStatus,
    handleRefresh,
    refetchTours,   // ← newly exposed for Route Planning tab refresh
    navigation,
  };
}
