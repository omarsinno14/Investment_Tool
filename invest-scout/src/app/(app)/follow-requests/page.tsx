export default function FollowRequestsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Follow requests have moved</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage follow requests directly from your Notifications tab for faster approvals.
        </p>
        <div className="mt-4">
          <a href="/notifications" className="text-sm font-medium text-primary underline">
            Go to Notifications
          </a>
        </div>
      </div>
    </div>
  );
}
