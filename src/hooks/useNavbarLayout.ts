import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const NAVBAR_HEIGHT = 56;

export function useNavbarLayout() {
  const { top: topInset, bottom: bottomInset } = useSafeAreaInsets();

  return {
    topInset,
    bottomInset,
    navbarStyle: {
      height: NAVBAR_HEIGHT + topInset,
      paddingTop: topInset,
    },
  };
}
