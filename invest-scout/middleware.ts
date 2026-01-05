import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  // IMPORTANT: exclude /api so it doesn't redirect and return HTML
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
