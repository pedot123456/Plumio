import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppNavigator from './navigation/AppNavigator';
import SplashScreen from './screens/SplashScreen';

// Reads loading state from AuthContext — must live inside <AuthProvider>
function AppContent() {
  const { loading } = useAuth();
  if (loading) return <SplashScreen />;
  return <AppNavigator />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
