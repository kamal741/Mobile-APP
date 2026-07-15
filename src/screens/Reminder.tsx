import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import TimePickerClock from '@/components/TimePickerClock';
import { scheduleNotificationForDate } from '@/lib/notifications/tourReminder';
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme';

type Ampm = 'AM' | 'PM';

function to24Hour(hour12: number, ampm: Ampm): number {
  if (ampm === 'AM') {
    return hour12 === 12 ? 0 : hour12;
  }
  return hour12 === 12 ? 12 : hour12 + 12;
}

function formatTime(date: Date): string {
  let h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function Reminder() {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [tourLabel, setTourLabel] = useState<string | null>(null);
  const [reminderLabel, setReminderLabel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleConfirm = async (h: number, m: number, ampm: Ampm) => {
    setPickerVisible(false);
    setErrorMessage(null);

    const hour24 = to24Hour(h, ampm);

    const tourDate = new Date();
    tourDate.setHours(hour24, m, 0, 0);

    if (tourDate.getTime() <= Date.now()) {
      tourDate.setDate(tourDate.getDate() + 1);
    }

    const reminderDate = new Date(tourDate.getTime() - 30 * 60 * 1000);

    const result = await scheduleNotificationForDate(
      reminderDate,
      `Your tour at ${formatTime(tourDate)} starts in 30 minutes`
    );

    if (!result?.success) {
      setTourLabel(null);
      setReminderLabel(null);
      setErrorMessage(
        'Tour time is too soon — pick a time at least 30 minutes from now so the reminder has time to fire.'
      );
      return;
    }

    setTourLabel(formatTime(tourDate));
    setReminderLabel(formatTime(reminderDate));
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Tour Reminder Test</Text>

      <TouchableOpacity style={styles.button} onPress={() => setPickerVisible(true)}>
        <Text style={styles.buttonText}>Pick tour time</Text>
      </TouchableOpacity>

      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

      {tourLabel && reminderLabel && (
        <View style={styles.confirmationBox}>
          <Text style={styles.confirmation}>Tour scheduled for {tourLabel}</Text>
          <Text style={styles.confirmation}>Reminder will fire at {reminderLabel}</Text>
        </View>
      )}

      <TimePickerClock
        visible={pickerVisible}
        initialHour={5}
        initialMinute={0}
        initialAmpm="PM"
        title="SELECT TOUR TIME"
        onCancel={() => setPickerVisible(false)}
        onConfirm={handleConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.surface,
    padding: spacing['5xl'],
  },
  heading: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extraBold,
    color: colors.text.primary,
    marginBottom: spacing['4xl'],
  },
  button: {
    backgroundColor: colors.primary.default,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing['4xl'],
    borderRadius: radius.btnSm,
  },
  buttonText: {
    color: colors.text.inverse,
    fontWeight: fontWeight.extraBold,
    fontSize: fontSize.base,
  },
  confirmationBox: {
    marginTop: spacing['4xl'],
    alignItems: 'center',
    gap: spacing.sm,
  },
  confirmation: {
    color: colors.text.secondary,
    fontSize: fontSize.base,
  },
  error: {
    marginTop: spacing['4xl'],
    color: '#dc2626',
    fontSize: fontSize.base,
    textAlign: 'center',
  },
});




// import React, { useState } from 'react';
// import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
// import { SafeAreaView } from 'react-native-safe-area-context';
// import TimePickerClock from '@/components/TimePickerClock'; // adjust path to wherever you place it
// import { scheduleNotificationAt } from '@/lib/notifications/tourReminder';
// import { colors, spacing, fontSize, fontWeight, radius } from '@/theme';

// type Ampm = 'AM' | 'PM';

// function to24Hour(hour12: number, ampm: Ampm): number {
//   if (ampm === 'AM') {
//     return hour12 === 12 ? 0 : hour12;
//   }
//   return hour12 === 12 ? 12 : hour12 + 12;
// }

// export default function Reminder() {
//   const [pickerVisible, setPickerVisible] = useState(false);
//   const [scheduledLabel, setScheduledLabel] = useState<string | null>(null);

//   const handleConfirm = async (h: number, m: number, ampm: Ampm) => {
//     setPickerVisible(false);

//     const hour24 = to24Hour(h, ampm);
//     await scheduleNotificationAt(hour24, m);

//     setScheduledLabel(
//       `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`
//     );
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       <Text style={styles.heading}>Tour Reminder Test</Text>

//       <TouchableOpacity style={styles.button} onPress={() => setPickerVisible(true)}>
//         <Text style={styles.buttonText}>Pick a time</Text>
//       </TouchableOpacity>

//       {scheduledLabel && (
//         <Text style={styles.confirmation}>
//           Reminder scheduled for {scheduledLabel}
//         </Text>
//       )}

//       <TimePickerClock
//         visible={pickerVisible}
//         initialHour={5}
//         initialMinute={0}
//         initialAmpm="PM"
//         title="SELECT REMINDER TIME"
//         onCancel={() => setPickerVisible(false)}
//         onConfirm={handleConfirm}
//       />
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: colors.background.surface,
//     padding: spacing['5xl'],
//   },
//   heading: {
//     fontSize: fontSize.lg,
//     fontWeight: fontWeight.extraBold,
//     color: colors.text.primary,
//     marginBottom: spacing['4xl'],
//   },
//   button: {
//     backgroundColor: colors.primary.default,
//     paddingVertical: spacing.md,
//     paddingHorizontal: spacing['4xl'],
//     borderRadius: radius.btnSm,
//   },
//   buttonText: {
//     color: colors.text.inverse,
//     fontWeight: fontWeight.extraBold,
//     fontSize: fontSize.base,
//   },
//   confirmation: {
//     marginTop: spacing['4xl'],
//     color: colors.text.secondary,
//     fontSize: fontSize.base,
//   },
// });