import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Users, Home, ClipboardList, DollarSign } from 'lucide-react-native';
import { ClientStatCard } from './ClientStatCard';
import { ClientStats } from '../hooks/useClientStats';
import { colors, spacing } from '../styles/shared.styles';

interface Props {
  stats: ClientStats;
  isSmallScreen?: boolean;
}

export function ClientStatsRow({ stats, isSmallScreen }: Readonly<Props>) {
  const cards = [
    {
      icon: <Users size={25} color={colors.brandLight} />,
      label: 'Total Clients',
      value: stats.totalClients,
    },
    {
      icon: <Home size={25} color={colors.success} />,
      label: 'Buyers',
      value: stats.buyerCount,
    },
    {
      icon: <ClipboardList size={25} color={colors.purple} />,
      label: 'Renters',
      value: stats.renterCount,
    },
    {
      icon: <DollarSign size={25} color={colors.success} />,
      label: 'Total Offers',
      value: stats.totalOffersCount,
    },
  ];

  return (
    <View style={[styles.row, isSmallScreen && styles.rowWrap]}>
      {cards.map((card) => (
        <ClientStatCard
          key={card.label}
          icon={card.icon}
          label={card.label}
          value={card.value}
          isSmallScreen={isSmallScreen}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    gap: spacing.sm + 2,
    backgroundColor: colors.bgPage,
  },

  rowWrap: {
    flexWrap: 'wrap',
  },
});








// import React from 'react';
// import { View, StyleSheet } from 'react-native';
// import { Users, Home, ClipboardList, DollarSign } from 'lucide-react-native';
// import { ClientStatCard } from './ClientStatCard';
// import { ClientStats } from '../hooks/useClientStats';
// import { colors, spacing } from '../styles/shared.styles';

// interface Props {
//   stats: ClientStats;
//   isSmallScreen?: boolean;
// }

// export function ClientStatsRow({ stats, isSmallScreen }: Readonly<Props>) {
//   const cards = [
//     { icon: <Users size={25} color={colors.brandLight} />,  label: 'Total Clients',  value: stats.totalClients },
//     { icon: <Home  size={25} color={colors.success} />,     label: 'Buyers',         value: stats.buyerCount },
//     { icon: <ClipboardList size={25} color={colors.purple} />, label: 'Renters',     value: stats.renterCount },
//     { icon: <DollarSign size={25} color={colors.success} />, label: 'Total Offers',  value: stats.totalOffersCount },
//   ];

//   return (
//     <View style={[styles.row, isSmallScreen && styles.rowWrap]}>
//       {cards.map((card) => (
//         <ClientStatCard
//           key={card.label}
//           icon={card.icon}
//           label={card.label}
//           value={card.value}
//           isSmallScreen={isSmallScreen}
//         />
//       ))}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   row: {
//     flexDirection: 'row',
//     paddingHorizontal: spacing.md,
//     paddingVertical: 14,
//     gap: spacing.sm + 2,
//     backgroundColor: colors.bgPage,
//   },
//   rowWrap: {
//     flexWrap: 'wrap',
//   },
// });
