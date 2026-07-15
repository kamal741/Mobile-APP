import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Svg, { Circle, Path, Line } from 'react-native-svg';
import { scheduleStyles } from '../styles/schedule';
import { SCHEDULE_TABS, type ScheduleTab } from '../types';

// ─── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  activeTab: ScheduleTab;
  onTabPress: (tab: ScheduleTab) => void;
}

// ─── Tab Icons ─────────────────────────────────────────────────────────────────
function RoutePlanningIcon({ active }: { active: boolean }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
      stroke={active ? 'black' : '#94a3b8'} strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={6} cy={19} r={3} />
      <Path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
      <Circle cx={18} cy={5} r={3} />
    </Svg>
  );
}

function PendingOffersIcon({ active }: { active: boolean }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
      stroke={active ? 'black' : '#94a3b8'} strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round">
      <Line x1={12} x2={12} y1={2} y2={22} />
      <Path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </Svg>
  );
}

// function FollowUpCallsIcon({ active }: { active: boolean }) {
//   return (
//     <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
//       stroke={active ? 'black' : '#94a3b8'} strokeWidth={2}
//       strokeLinecap="round" strokeLinejoin="round">
//       <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
//     </Svg>
//   );
// }

const TAB_ICONS: Record<ScheduleTab, (active: boolean) => React.ReactNode> = {
  'Route Planning': (a) => <RoutePlanningIcon active={a} />,
  'Offers': (a) => <PendingOffersIcon active={a} />,
};

// ─── ScheduleTabBar ────────────────────────────────────────────────────────────
export function ScheduleTabBar({ activeTab, onTabPress }: Props) {
  return (
    <>
      <View style={scheduleStyles.tabScroll}>
        <View style={scheduleStyles.tabScrollContent}>
          {SCHEDULE_TABS.map((tab) => {
            const active = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={scheduleStyles.tabItem}
                onPress={() => onTabPress(tab)}
              >
                <View style={scheduleStyles.tabContent}>
                  {TAB_ICONS[tab](active)}
                  <Text
                    numberOfLines={2}
                    style={[
                      scheduleStyles.tabLabel,
                      active && scheduleStyles.tabLabelActive,
                    ]}
                  >
                    {tab}
                  </Text>
                </View>
                {active && <View style={scheduleStyles.tabUnderline} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={scheduleStyles.tabDivider} />
    </>
  );
}