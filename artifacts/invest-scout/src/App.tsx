import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { CurrencyProvider } from "@/components/app/CurrencyProvider";
import { PersonalFinanceProvider } from "@/components/app/PersonalFinanceProvider";
import { AppShell } from "@/components/app/AppShell";

import LoginPage from "@/app/(auth)/login/page";
import RegisterPage from "@/app/(auth)/register/page";
import AdminLoginPage from "@/app/admin/login/page";
import AdminSignupPage from "@/app/admin/signup/page";

import DashboardPage from "@/app/(app)/dashboard/page";
import FeedPage from "@/app/(app)/feed/page";
import OpportunitiesPage from "@/app/(app)/opportunities/page";
import OpportunityDetailPage from "@/app/(app)/opportunities/[id]/page";
import HeadlinesPage from "@/app/(app)/headlines/page";
import ForumsPage from "@/app/(app)/forums/page";
import ForumDetailPage from "@/app/(app)/forums/[id]/page";
import HubsPage from "@/app/(app)/hubs/page";
import HubDetailPage from "@/app/(app)/hubs/[slug]/page";
import HubPostDetailPage from "@/app/(app)/hubs/[slug]/posts/[postId]/page";
import MessagesPage from "@/app/(app)/messages/page";
import NotificationsPage from "@/app/(app)/notifications/page";
import MyProfilePage from "@/app/(app)/my-profile/page";
import UsersPage from "@/app/(app)/users/page";
import UserDetailPage from "@/app/(app)/users/[id]/page";
import SettingsPage from "@/app/(app)/settings/page";
import InterestsPage from "@/app/(app)/interests/page";
import PortfolioPage from "@/app/(app)/portfolio/page";
import CashflowPage from "@/app/(app)/cashflow/page";
import GoalsPage from "@/app/(app)/goals/page";
import JournalPage from "@/app/(app)/journal/page";
import ToolsPage from "@/app/(app)/tools/page";
import ToolDetailPage from "@/app/(app)/tools/[slug]/page";
import RatiosPage from "@/app/(app)/ratios/page";
import FollowRequestsPage from "@/app/(app)/follow-requests/page";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/feed" />} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/admin/login" component={AdminLoginPage} />
      <Route path="/admin/signup" component={AdminSignupPage} />

      <Route path="/dashboard" component={() => <AppShell><DashboardPage /></AppShell>} />
      <Route path="/feed" component={() => <AppShell><FeedPage /></AppShell>} />
      <Route path="/opportunities" component={() => <AppShell><OpportunitiesPage /></AppShell>} />
      <Route path="/opportunities/:id" component={({ params }) => <AppShell><OpportunityDetailPage params={params} /></AppShell>} />
      <Route path="/headlines" component={() => <AppShell><HeadlinesPage /></AppShell>} />
      <Route path="/forums" component={() => <AppShell><ForumsPage /></AppShell>} />
      <Route path="/forums/:id" component={({ params }) => <AppShell><ForumDetailPage params={params} /></AppShell>} />
      <Route path="/hubs" component={() => <AppShell><HubsPage /></AppShell>} />
      <Route path="/hubs/:slug" component={({ params }) => <AppShell><HubDetailPage params={params} /></AppShell>} />
      <Route path="/hubs/:slug/posts/:postId" component={({ params }) => <AppShell><HubPostDetailPage params={params} /></AppShell>} />
      <Route path="/messages" component={() => <AppShell><MessagesPage /></AppShell>} />
      <Route path="/notifications" component={() => <AppShell><NotificationsPage /></AppShell>} />
      <Route path="/my-profile" component={() => <AppShell><MyProfilePage /></AppShell>} />
      <Route path="/users" component={() => <AppShell><UsersPage /></AppShell>} />
      <Route path="/users/:id" component={({ params }) => <AppShell><UserDetailPage params={params} /></AppShell>} />
      <Route path="/settings" component={() => <AppShell><SettingsPage /></AppShell>} />
      <Route path="/interests" component={() => <AppShell><InterestsPage /></AppShell>} />
      <Route path="/portfolio" component={() => <AppShell><PortfolioPage /></AppShell>} />
      <Route path="/cashflow" component={() => <AppShell><CashflowPage /></AppShell>} />
      <Route path="/goals" component={() => <AppShell><GoalsPage /></AppShell>} />
      <Route path="/journal" component={() => <AppShell><JournalPage /></AppShell>} />
      <Route path="/tools" component={() => <AppShell><ToolsPage /></AppShell>} />
      <Route path="/tools/:slug" component={({ params }) => <AppShell><ToolDetailPage params={params} /></AppShell>} />
      <Route path="/ratios" component={() => <AppShell><RatiosPage /></AppShell>} />
      <Route path="/follow-requests" component={() => <AppShell><FollowRequestsPage /></AppShell>} />
      <Route path="/activity" component={() => <Redirect to="/settings?tab=activity" />} />
      <Route component={() => <div className="flex min-h-screen items-center justify-center"><div className="text-center"><h1 className="text-2xl font-bold">404 — Page not found</h1></div></div>} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <CurrencyProvider>
          <PersonalFinanceProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AppRoutes />
            </WouterRouter>
            <Toaster richColors />
          </PersonalFinanceProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
