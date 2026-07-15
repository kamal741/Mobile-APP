import { View, Text, StyleSheet } from 'react-native';
import { CartScreen } from './client/CartScreen';
import { ClientFooter } from './client/components/ClientFooter';

export function TourCartScreen() {
  return <>
  <CartScreen />
<ClientFooter active="tourcart" />
  </>
  ;
}

const styles = StyleSheet.create({});
