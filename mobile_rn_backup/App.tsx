import React from 'react';
import { LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import BreakoutScreen from './src/screens/BreakoutScreen';
import DividendScreen from './src/screens/DividendScreen';
import OptionsScreen from './src/screens/OptionsScreen';

const queryClient = new QueryClient();
const Tab = createBottomTabNavigator();

// Suppress harmless third-party deprecation warnings on Web
LogBox.ignoreLogs([
  'props.pointerEvents is deprecated',
  '"shadow*" style props are deprecated',
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: '#007AFF',
            headerStyle: { backgroundColor: '#1C1C1E' },
            headerTintColor: '#FFF',
            tabBarStyle: { backgroundColor: '#1C1C1E', borderTopColor: '#333' }
          }}
        >
          <Tab.Screen name="Breakout" component={BreakoutScreen} />
          <Tab.Screen name="Dividends" component={DividendScreen} />
          <Tab.Screen name="Options" component={OptionsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  );
}
