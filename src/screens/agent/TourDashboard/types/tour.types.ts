export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  clientType: string;
}

export interface PageDto<T> {
  content: T[];
}

export interface Property {
  id: string;
  address: string;
  city: string;
  province: string;
  postalCode?: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  price: number;
  imageUrl?: string;
}

export interface SelectedProperty extends Property {
  scheduledTime: string;
  estimatedDuration: number;
}

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: string;
}

export interface AlertModalState {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
}
