import React, { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuthStore } from '../store/useAuthStore'
import LoginScreen from '../screens/auth/LoginScreen'
import HomeScreen from '../screens/main/HomeScreen'
import { colors, typography } from '../constants/theme'
import type { RootStackParamList } from '../types'

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function AppNavigator() {
  const { isAuthenticated, isInitialLoading, initAuth } = useAuthStore()

  useEffect(() => {
    initAuth()
  }, [initAuth])

  if (isInitialLoading) {
    return (
      <View style={styles.splash}>
        <View style={styles.splashLogo}>
          <Text style={styles.splashLogoText}>S</Text>
        </View>
        <Text style={styles.splashTitle}>Stockify Mobile</Text>
        <Text style={styles.splashSubtitle}>Memuat konfigurasi petugas...</Text>
        <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 24 }} />
      </View>
    )
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="Home" component={HomeScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#FF4D15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashLogo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  splashLogoText: {
    fontSize: 32,
    fontWeight: typography.weights.black,
    color: '#FFFFFF',
  },
  splashTitle: {
    fontSize: 22,
    fontWeight: typography.weights.black,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  splashSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
  },
})
