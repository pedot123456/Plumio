import React from 'react';
import { Routes, Route } from 'react-router-dom';

import HomeScreen            from '../screens/HomeScreen';
import ShoppingCartScreen    from '../screens/ShoppingCartScreen';
import SecureCartScreen      from '../screens/SecureCartScreen';
import UserProfileScreen     from '../screens/UserProfileScreen';
import ProductDetailsScreen  from '../screens/ProductDetailsScreen';
import CreateListingScreen   from '../screens/CreateListingScreen';
import SecureHandoffScreen   from '../screens/SecureHandoffScreen';
import ChatNegotiationScreen from '../screens/ChatNegotiationScreen';
import ActiveTransactionsScreen from '../screens/ActiveTransactionsScreen';
import ProximitySearchScreen from '../screens/ProximitySearchScreen';
import LoginScreen           from '../screens/LoginScreen';
import SignUpScreen          from '../screens/SignUpScreen';
import ForgotPasswordScreen  from '../screens/ForgotPasswordScreen';
import BrowseCategoriesScreen from '../screens/BrowseCategoriesScreen';
import MyListingsScreen      from '../screens/MyListingsScreen';
import ReportIssueScreen     from '../screens/ReportIssueScreen';

export default function AppNavigator() {
  return (
    <Routes>
      <Route path="/"                element={<HomeScreen />} />
      <Route path="/cart"            element={<ShoppingCartScreen />} />
      <Route path="/cart/secure"     element={<SecureCartScreen />} />
      <Route path="/profile"         element={<UserProfileScreen />} />
      <Route path="/product/:id"     element={<ProductDetailsScreen />} />
      <Route path="/create-listing"  element={<CreateListingScreen />} />
      <Route path="/handoff"         element={<SecureHandoffScreen />} />
      <Route path="/chat/:id"        element={<ChatNegotiationScreen />} />
      <Route path="/transactions"    element={<ActiveTransactionsScreen />} />
      <Route path="/search"          element={<ProximitySearchScreen />} />
      <Route path="/login"           element={<LoginScreen />} />
      <Route path="/signup"          element={<SignUpScreen />} />
      <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
      <Route path="/categories"      element={<BrowseCategoriesScreen />} />
      <Route path="/my-listings"     element={<MyListingsScreen />} />
      <Route path="/report"          element={<ReportIssueScreen />} />
    </Routes>
  );
}
