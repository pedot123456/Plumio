import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppNavigator from './navigation/AppNavigator';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </BrowserRouter>
  );
}
