import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { AgentTabParamList } from '@/navigation/types';
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';
import Navbar, { NavbarAgent } from '@/screens/agent/components/NavbarAgent';
import { useAuth } from '@/contexts/AuthContext';

import { useAgentDashboard } from './hooks/useAgentDashboard';
import { TourActivityCard } from './components/TourActivityCard';
import { PipelineActivityCard } from './components/PipelineActivityCard';
import { ScheduleCard } from './components/ScheduleCard';
import { PendingRequestsPanel } from './components/PendingRequestsPanel';
import { RequestDetailModal } from './components/RequestDetailModal';
import { layoutStyles } from './styles/shared';
import { AgentFooter } from '../components/AgentFooter';

// ─── QuickAddDropdown (mirrors Navbar implementation) ─────────────────────────
interface QuickAddDropdownProps {
  visible: boolean;
  anchorRight: number;
  anchorTop: number;
  onClose: () => void;
  onNewOffer: () => void;
  onNewTour: () => void;
}

function QuickAddDropdown({
  visible,
  anchorRight,
  anchorTop,
  onClose,
  onNewOffer,
  onNewTour,
}: QuickAddDropdownProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 18,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View
          style={[
            dropdownStyles.container,
            {
              top: anchorTop,
              right: anchorRight,
              opacity: opacityAnim,
              transform: [
                { scale: scaleAnim },
                {
                  translateY: scaleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-8, 0],
                  }),
                },
              ],
              transformOrigin: 'top right',
            },
          ]}
        >
          {/* Caret */}
          <View style={dropdownStyles.caret} />

          {/* New Offer */}
          <TouchableOpacity
            activeOpacity={0.75}
            style={dropdownStyles.item}
            onPress={onNewOffer}
          >
            <View style={dropdownStyles.itemIconWrapper}>
              <Svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#C9980A"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <Polyline points="14 2 14 8 20 8" />
                <Line x1={12} y1={18} x2={12} y2={12} />
                <Line x1={9} y1={15} x2={15} y2={15} />
              </Svg>
            </View>
            <View style={dropdownStyles.itemTextGroup}>
              <Text style={dropdownStyles.itemLabel}>New Offer</Text>
              <Text style={dropdownStyles.itemSub}>Draft a property offer</Text>
            </View>
          </TouchableOpacity>

          <View style={dropdownStyles.divider} />

          {/* New Tour */}
          <TouchableOpacity
            activeOpacity={0.75}
            style={dropdownStyles.item}
            onPress={onNewTour}
          >
            <View style={dropdownStyles.itemIconWrapper}>
              <Svg
                width={16}
                height={16}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1e40af"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <Polyline points="9 22 9 12 15 12 15 22" />
              </Svg>
            </View>
            <View style={dropdownStyles.itemTextGroup}>
              <Text style={dropdownStyles.itemLabel}>New Tour</Text>
              <Text style={dropdownStyles.itemSub}>Schedule a showing tour</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const dropdownStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 210,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 16,
    overflow: 'visible',
  },
  caret: {
    position: 'absolute',
    top: -7,
    right: 43,
    width: 14,
    height: 14,
    backgroundColor: '#ffffff',
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    transform: [{ rotate: '45deg' }],
    zIndex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 11,
    borderRadius: 14,
  },
  itemIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemTextGroup: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    letterSpacing: 0.1,
  },
  itemSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 12,
  },
});

// ─── DashboardHeader ───────────────────────────────────────────────────────────
interface DashboardHeaderProps {
  activeTab: 'Route Planning' | 'Offers' | null;
  onRefreshTab: () => void;
}

function DashboardHeader({ activeTab, onRefreshTab }: DashboardHeaderProps) {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const topInset = useSafeAreaInsets().top;

  const plusButtonRef = useRef<TouchableOpacity>(null);
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [dropdownAnchor, setDropdownAnchor] = useState({ top: 0, right: 0 });
  const plusRotateAnim = useRef(new Animated.Value(0)).current;

  const handlePlusPress = () => {
    plusButtonRef.current?.measure((_fx, _fy, _w, height, _px, py) => {
      setDropdownAnchor({
        top: py + height + topInset + 6,
        right: 18,
      });
      setQuickAddVisible(true);
      Animated.spring(plusRotateAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 18,
      }).start();
    });
  };

  const handleQuickAddClose = () => {
    setQuickAddVisible(false);
    Animated.spring(plusRotateAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 200,
      friction: 18,
    }).start();
  };

  const handleNewOffer = () => {
    handleQuickAddClose();
    navigation.navigate('CreateOffer');
  };

  const handleNewTour = () => {
    handleQuickAddClose();
    navigation.navigate('CreateTour');
  };

  const plusRotate = plusRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const showRefresh =
    activeTab === 'Route Planning' || activeTab === 'Offers';

  return (
    <>
      <View style={headerStyles.bar}>
        <Text style={headerStyles.title}>Today's Schedule</Text>

        <View style={headerStyles.actions}>
          {/* Refresh icon — only for Route Planning / Offers tabs */}
          {showRefresh && (
            <TouchableOpacity
              onPress={onRefreshTab}
              style={headerStyles.iconBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Refresh tab"
              accessibilityRole="button"
            >
              <Svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#334155"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <Path d="M21 3v5h-5" />
                <Path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <Path d="M8 16H3v5" />
              </Svg>
            </TouchableOpacity>
          )}

          {/* Plus / Quick-Add */}
          <TouchableOpacity
            ref={plusButtonRef}
            onPress={handlePlusPress}
            style={[
              headerStyles.iconBtn,
              quickAddVisible && headerStyles.iconBtnActive,
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Quick add"
            accessibilityRole="button"
          >
            <Animated.View style={{ transform: [{ rotate: plusRotate }] }}>
              <Svg
                width={18}
                height={18}
                viewBox="0 0 24 24"
                fill="none"
                stroke={quickAddVisible ? '#C9980A' : '#334155'}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Line x1={12} y1={5} x2={12} y2={19} />
                <Line x1={5} y1={12} x2={19} y2={12} />
              </Svg>
            </Animated.View>
          </TouchableOpacity>
        </View>
      </View>

      <QuickAddDropdown
        visible={quickAddVisible}
        anchorTop={dropdownAnchor.top}
        anchorRight={dropdownAnchor.right}
        onClose={handleQuickAddClose}
        onNewOffer={handleNewOffer}
        onNewTour={handleNewTour}
      />
    </>
  );
}

const headerStyles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: {
    backgroundColor: 'rgba(201, 152, 10, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201, 152, 10, 0.35)',
  },
});

// ─── AgentDashboardScreen ──────────────────────────────────────────────────────
export function AgentDashboardScreen() {
  const { width } = useWindowDimensions();
  const isNarrow = width < 700;
  const route = useRoute<RouteProp<AgentTabParamList, 'Dashboard'>>();
  const navigation = useNavigation<BottomTabNavigationProp<AgentTabParamList, 'Dashboard'>>();
  const { user } = useAuth();

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [openedFromNotification, setOpenedFromNotification] = useState(false);

  // ── Redirect to MyProfile if agent has no work address ───────────────────────
  useFocusEffect(
    useCallback(() => {
      if (user?.role === 'agent' && !user.hasWorkAddress) {
        navigation.navigate('MyProfile' as any);
      }
    }, [user?.role, user?.hasWorkAddress, navigation]),
  );

  // ── Open request detail if navigated from notification ───────────────────────
  useFocusEffect(
    useCallback(() => {
      const showingRequestId = route.params?.showingRequestId;
      if (!showingRequestId) {
        return;
      }
      setOpenedFromNotification(true);
      setSelectedRequestId(showingRequestId);
      navigation.setParams({ showingRequestId: undefined });
    }, [navigation, route.params?.showingRequestId]),
  );
  const [activeScheduleTab, setActiveScheduleTab] = useState<
    'Route Planning' | 'Offers'
  >('Route Planning');

  const tabRefreshRef = useRef<(() => void) | null>(null);

  // ── Scroll-to-PendingRequestsPanel ──────────────────────────────────────────
  const scrollViewRef = useRef<ScrollView>(null);
  const pendingPanelRef = useRef<View>(null);

  const handleScrollToPendingRequests = () => {
    if (!pendingPanelRef.current || !scrollViewRef.current) return;
    pendingPanelRef.current.measureLayout(
      // @ts-ignore — getInnerViewNode is not in the public TS types but is stable
      scrollViewRef.current.getInnerViewNode(),
      (_left, top) => {
        scrollViewRef.current?.scrollTo({ y: top, animated: true });
      },
      () => {},
    );
  };
  // ────────────────────────────────────────────────────────────────────────────

  const {
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
    updateRequestStatus,
    handleRefresh,
    refetchTours,   // ← destructure newly exposed refetchTours
  } = useAgentDashboard(selectedRequestId);

  const selectedRequestListData = pendingOnly.find(
    (r) => r.id === selectedRequestId,
  );

  useEffect(() => {
    if (!selectedRequestId || requestDetailLoading || !requestDetail) {
      return;
    }
    if (requestDetail.status === 'approved') {
      setSelectedRequestId(null);
      setOpenedFromNotification(false);
      navigation.navigate('Tours');
    }
  }, [navigation, requestDetail, requestDetailLoading, selectedRequestId]);

  const requestModalVisible =
    !!selectedRequestId &&
    requestDetail?.status !== 'approved' &&
    (!openedFromNotification || !requestDetailLoading);

  const handleTabRefresh = () => {
    if (activeScheduleTab === 'Route Planning') {
      // ← call refetchTours directly → hits /api/agent/v1/agent/tours
      void refetchTours();
    } else {
      // Offers (and any other tab) delegates to tab's own registered refresh
      tabRefreshRef.current?.();
    }
  };

  return (
    <>
      {/* <NavbarAgent title="Dashboard" /> */}

      <ScrollView
        ref={scrollViewRef}
        style={layoutStyles.container}
        contentContainerStyle={layoutStyles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading || isClientCountLoading}
            onRefresh={handleRefresh}
          />
        }
      >
        {/* ── Top Row: Tour Activity + Pipeline ── */}
        <View style={[layoutStyles.topRow, isNarrow && layoutStyles.colStack]}>
          <TourActivityCard
            stats={stats}
            isNarrow={isNarrow}
            onPressPendingRequests={handleScrollToPendingRequests}
          />
          <PipelineActivityCard
            offersPipeline={offersPipeline}
            activeClientsCount={activeClientsCount}
            isNarrow={isNarrow}
          />
        </View>

        {/* ── Bottom Row: Schedule + Pending Requests ── */}
        <View
          style={[layoutStyles.bottomRow, isNarrow && layoutStyles.colStack]}
        >
          <ScheduleCard
            isNarrow={isNarrow}
            routePlanningTours={routePlanningTours}
            pendingOffersCount={pendingOffersCount}
            onTabChange={setActiveScheduleTab}
            onRegisterRefresh={(fn) => { tabRefreshRef.current = fn; }}
            headerSlot={
              <DashboardHeader
                activeTab={
                  activeScheduleTab === 'Follow-up Calls'
                    ? null
                    : activeScheduleTab
                }
                onRefreshTab={handleTabRefresh}
              />
            }
          />

          <PendingRequestsPanel
              ref={pendingPanelRef}
              isNarrow={isNarrow}
              pendingOnly={pendingOnly}
              onSelectRequest={(id) => {
                setOpenedFromNotification(false);
                setSelectedRequestId(id);
              }}
              updateRequestStatus={updateRequestStatus}
            />
        </View>

        {/* ── Request Detail Modal ── */}
        <RequestDetailModal
          visible={requestModalVisible}
          requestDetail={requestDetail}
          requestDetailLoading={requestDetailLoading}
          selectedRequestListData={selectedRequestListData}
          updateRequestStatus={updateRequestStatus}
          onClose={() => {
            setOpenedFromNotification(false);
            setSelectedRequestId(null);
          }}
        />
      </ScrollView>
      <AgentFooter active="dashboard" />
    </>
  );
}
