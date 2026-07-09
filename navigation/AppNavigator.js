import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from '../components/MainLayout';

import HomeScreen            from '../screens/HomeScreen';
import ShoppingCartScreen    from '../screens/ShoppingCartScreen';
import SecureCartScreen      from '../screens/SecureCartScreen';
import UserProfileScreen     from '../screens/UserProfileScreen';
import ProductDetailsScreen  from '../screens/ProductDetailsScreen';
import CreateListingScreen   from '../screens/CreateListingScreen';
import SecureHandoffScreen   from '../screens/SecureHandoffScreen';
import EscrowStatusScreen    from '../screens/EscrowStatusScreen';
import HandoffConfirmScreen  from '../screens/HandoffConfirmScreen';
import ChatNegotiationScreen from '../screens/ChatNegotiationScreen';
import ActiveTransactionsScreen from '../screens/ActiveTransactionsScreen';
import ProximitySearchScreen from '../screens/ProximitySearchScreen';
import LoginScreen           from '../screens/LoginScreen';
import SignUpScreen          from '../screens/SignUpScreen';
import ForgotPasswordScreen  from '../screens/ForgotPasswordScreen';
import BrowseCategoriesScreen from '../screens/BrowseCategoriesScreen';
import MyListingsScreen      from '../screens/MyListingsScreen';
import ReportIssueScreen     from '../screens/ReportIssueScreen';
import WalletScreen          from '../screens/WalletScreen';
import LikesScreen           from '../screens/LikesScreen';
import SettingsScreen        from '../screens/SettingsScreen';
import RecentlyViewedScreen  from '../screens/RecentlyViewedScreen';
import {
  CoinsScreen,
  PayLaterScreen,
  BuyAgainScreen,
  HelpScreen,
  SupportChatScreen,
} from '../screens/PlaceholderScreens';

export default function AppNavigator() {
  return (
    <Routes>
      {/* All routes pass through MainLayout.
          Screens with their own complex headers are listed in MainLayout's
          SELF_HEADED set — the layout renders <Outlet /> only for those. */}
      <Route element={<MainLayout />}>
        <Route path="/"                element={<HomeScreen />} />
        <Route path="/cart"            element={<ShoppingCartScreen />} />
        <Route path="/cart/secure"     element={<SecureCartScreen />} />
        <Route path="/profile"         element={<UserProfileScreen />} />
        <Route path="/product/:id"     element={<ProductDetailsScreen />} />
        <Route path="/create-listing"  element={<CreateListingScreen />} />
        <Route path="/escrow/:txId"            element={<EscrowStatusScreen />} />
        <Route path="/handoff/confirm/:txId"   element={<HandoffConfirmScreen />} />
        <Route path="/handoff/:txId"           element={<SecureHandoffScreen />} />
        <Route path="/handoff"                 element={<SecureHandoffScreen />} />
        <Route path="/chat/:id"        element={<ChatNegotiationScreen />} />
        <Route path="/transactions"    element={<ActiveTransactionsScreen />} />
        <Route path="/search"          element={<ProximitySearchScreen />} />
        <Route path="/login"           element={<LoginScreen />} />
        <Route path="/signup"          element={<SignUpScreen />} />
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
        <Route path="/categories"      element={<BrowseCategoriesScreen />} />
        <Route path="/my-listings"     element={<MyListingsScreen />} />
        <Route path="/report"          element={<ReportIssueScreen />} />

        {/* Profile sub-screens — global nav header provided by MainLayout */}
        <Route path="/wallet"          element={<WalletScreen />} />
        <Route path="/coins"           element={<CoinsScreen />} />
        <Route path="/paylater"        element={<PayLaterScreen />} />
        <Route path="/likes"           element={<LikesScreen />} />
        <Route path="/viewed"          element={<RecentlyViewedScreen />} />
        <Route path="/buy-again"       element={<BuyAgainScreen />} />
        <Route path="/settings"        element={<SettingsScreen />} />
        <Route path="/help"            element={<HelpScreen />} />
        <Route path="/support-chat"    element={<SupportChatScreen />} />
      </Route>
    </Routes>
  );
}
