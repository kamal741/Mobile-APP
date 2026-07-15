import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { TOUR_CART_STORAGE_KEY } from '../lib/persistedStorageKeys';

interface CartProperty {
  id: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: string | null;
  squareFootage?: number;
  imageUrl?: string | undefined;
}

interface TourCartContextType {
  cartItems: CartProperty[];
  addToCart: (property: CartProperty) => void;
  removeFromCart: (propertyId: string) => void;
  clearCart: () => Promise<void>;
  isInCart: (propertyId: string) => boolean;
  cartCount: number;
}

const TourCartContext = createContext<TourCartContextType | undefined>(undefined);

export function TourCartProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [cartItems, setCartItems] = useState<CartProperty[]>([]);
  const wasAuthenticatedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    void loadCart();
  }, [authLoading]);

  useEffect(() => {
    if (authLoading) return;
    if (wasAuthenticatedRef.current && !isAuthenticated) {
      setCartItems([]);
    }
    wasAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated, authLoading]);

  const loadCart = async () => {
    try {
      const stored = await AsyncStorage.getItem(TOUR_CART_STORAGE_KEY);
      if (stored) {
        setCartItems(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    }
  };

  const saveCart = async (items: CartProperty[]) => {
    try {
      await AsyncStorage.setItem(TOUR_CART_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  const addToCart = (property: CartProperty) => {
    setCartItems((prev) => {
      if (prev.some((item) => item.id === property.id)) {
        return prev;
      }
      const newItems = [...prev, property];
      saveCart(newItems);
      return newItems;
    });
  };

  const removeFromCart = (propertyId: string) => {
    setCartItems((prev) => {
      const newItems = prev.filter((item) => item.id !== propertyId);
      saveCart(newItems);
      return newItems;
    });
  };

  const clearCart = async () => {
    setCartItems([]);
    try {
      await AsyncStorage.removeItem(TOUR_CART_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const isInCart = (propertyId: string) => {
    return cartItems.some((item) => item.id === propertyId);
  };

  return (
    <TourCartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        clearCart,
        isInCart,
        cartCount: cartItems.length,
      }}
    >
      {children}
    </TourCartContext.Provider>
  );
}

export function useTourCart() {
  const context = useContext(TourCartContext);
  if (context === undefined) {
    throw new Error('useTourCart must be used within a TourCartProvider');
  }
  return context;
}
