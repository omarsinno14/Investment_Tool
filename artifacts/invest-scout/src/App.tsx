import { lazy, Suspense, type ComponentType } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { CurrencyProvider } from "@/components/app/CurrencyProvider";
import { PersonalFinanceProvider } from "@/components/app/PersonalFinanceProvider";
import { AppShell } from "@/components/app/AppShell";




const LoginPage = lazy(() => import("@/app/(auth)/login/page"));
const RegisterPage = lazy(() => import("@/app/(auth)/register/page"));
const ForgotPasswordPage = lazy(() => import("@/app/(auth)/forgot-password/page"));
const ResetPasswordPage = lazy(() => import("@/app/(auth)/reset-password/page"));
const BillingPage = lazy(() => import("@/app/(app)/billing/page"));
const AdminLoginPage = lazy(() => import("@/app/admin/login/page"));
const AdminSignupPage = lazy(() => import("@/app/admin/signup/page"));
const AdminPage = lazy(() => import("@/app/admin/page"));
const SupportPage = lazy(() => import("@/app/(app)/support/page"));
const DashboardPage = lazy(() => import("@/app/(app)/dashboard/page"));
const FeedPage = lazy(() => import("@/app/(app)/feed/page"));
const OpportunitiesPage = lazy(() => import("@/app/(app)/opportunities/page"));
const OpportunityDetailPage = lazy(() => import("@/app/(app)/opportunities/[id]/page"));
const SearchPage = lazy(() => import("@/app/(app)/search/page"));
const HeadlinesPage = lazy(() => import("@/app/(app)/headlines/page"));
const ForumsPage = lazy(() => import("@/app/(app)/forums/page"));
const ForumDetailPage = lazy(() => import("@/app/(app)/forums/[id]/page"));
const HubsPage = lazy(() => import("@/app/(app)/hubs/page"));
const HubDetailPage = lazy(() => import("@/app/(app)/hubs/[slug]/page"));
const HubPostDetailPage = lazy(() => import("@/app/(app)/hubs/[slug]/posts/[postId]/page"));
const MessagesPage = lazy(() => import("@/app/(app)/messages/page"));
const NotificationsPage = lazy(() => import("@/app/(app)/notifications/page"));
const MyProfilePage = lazy(() => import("@/app/(app)/my-profile/page"));
const UsersPage = lazy(() => import("@/app/(app)/users/page"));
const UserDetailPage = lazy(() => import("@/app/(app)/users/[id]/page"));
const SettingsPage = lazy(() => import("@/app/(app)/settings/page"));
const InterestsPage = lazy(() => import("@/app/(app)/interests/page"));
const PortfolioPage = lazy(() => import("@/app/(app)/portfolio/page"));
const CashflowPage = lazy(() => import("@/app/(app)/cashflow/page"));
const GoalsPage = lazy(() => import("@/app/(app)/goals/page"));
const JournalPage = lazy(() => import("@/app/(app)/journal/page"));
const ToolsPage = lazy(() => import("@/app/(app)/tools/page"));
const ToolDetailPage = lazy(() => import("@/app/(app)/tools/[slug]/page"));
const RatiosPage = lazy(() => import("@/app/(app)/ratios/page"));
const FollowRequestsPage = lazy(() => import("@/app/(app)/follow-requests/page"));
const TermsPage = lazy(() => import("@/app/legal/terms/page"));
const PrivacyPage = lazy(() => import("@/app/legal/privacy/page"));
const RiskDisclosurePage = lazy(() => import("@/app/legal/risk-disclosure/page"));
const AdvertiserTermsPage = lazy(() => import("@/app/legal/advertiser-terms/page"));
const SubscriptionTermsPage = lazy(() => import("@/app/legal/subscription-terms/page"));
const CommunityGuidelinesPage = lazy(() => import("@/app/legal/community-guidelines/page"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function PageFallback() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      <div className="h-40 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}

function FullPageFallback() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-pulse text-sm text-muted-foreground">Loading...</div>
    </div>
  );
}

const shellRoutes: Array<[string, ComponentType]> = [
  ["/admin", AdminPage],
  ["/dashboard", DashboardPage],
  ["/feed", FeedPage],
  ["/opportunities", OpportunitiesPage],
  ["/opportunities/:id", OpportunityDetailPage],
  ["/search", SearchPage],
  ["/headlines", HeadlinesPage],
  ["/forums", ForumsPage],
  ["/forums/:id", ForumDetailPage],
  ["/hubs", HubsPage],
  ["/hubs/:slug", HubDetailPage],
  ["/hubs/:slug/posts/:postId", HubPostDetailPage],
  ["/messages", MessagesPage],
  ["/notifications", NotificationsPage],
  ["/my-profile", MyProfilePage],
  ["/users", UsersPage],
  ["/users/:id", UserDetailPage],
  ["/settings", SettingsPage],
  ["/billing", BillingPage],
  ["/support", SupportPage],
  ["/interests", InterestsPage],
  ["/portfolio", PortfolioPage],
  ["/cashflow", CashflowPage],
  ["/goals", GoalsPage],
  ["/journal", JournalPage],
  ["/tools", ToolsPage],
  ["/tools/:slug", ToolDetailPage],
  ["/ratios", RatiosPage],
  ["/follow-requests", FollowRequestsPage],
];

/**
 * Signed-in pages share one AppShell that stays mounted across navigation, so
 * the sidebar, auth check, badges and heartbeat are not torn down and refetched
 * on every page change. Pages are code-split and load on first visit.
 */
function ShellRoutes() {
  return (
    <AppShell>
      <Suspense fallback={<PageFallback />}>
        <Switch>
          {shellRoutes.map(([path, Page]) => (
            <Route key={path} path={path}>
              {/* Remount when params change (e.g. /users/a -> /users/b) so page state resets. */}
              {(params) => <Page key={JSON.stringify(params)} />}
            </Route>
          ))}
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </AppShell>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <h1 className="text-2xl font-bold">404 — Page not found</h1>
    </div>
  );
}

function AppRoutes() {
  return (
    <Suspense fallback={<FullPageFallback />}>
      <Switch>
        <Route path="/" component={() => <Redirect to="/feed" />} />
        <Route path="/login" component={LoginPage} />
        <Route path="/register" component={RegisterPage} />
        <Route path="/forgot-password" component={ForgotPasswordPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/admin/login" component={AdminLoginPage} />
        <Route path="/admin/signup" component={AdminSignupPage} />
        <Route path="/legal/terms" component={TermsPage} />
        <Route path="/legal/privacy" component={PrivacyPage} />
        <Route path="/legal/risk-disclosure" component={RiskDisclosurePage} />
        <Route path="/legal/advertiser-terms" component={AdvertiserTermsPage} />
        <Route path="/legal/subscription-terms" component={SubscriptionTermsPage} />
        <Route path="/legal/community-guidelines" component={CommunityGuidelinesPage} />
        <Route path="/activity" component={() => <Redirect to="/settings?tab=activity" />} />
        <Route component={ShellRoutes} />
      </Switch>
    </Suspense>
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
