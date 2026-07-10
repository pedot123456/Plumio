import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppNavigator from './navigation/AppNavigator';
import SplashScreen from './screens/SplashScreen';

// Reads loading state from AuthContext — must live inside <AuthProvider>.
// Enforces a 2-second minimum splash duration so fast auth sessions don't cause
// a jarring flash before the app renders.
function AppContent() {
  const { loading } = useAuth();
  const [minTimeElapsed, setMinTimeElapsed] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (loading || !minTimeElapsed) return <SplashScreen />;
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
