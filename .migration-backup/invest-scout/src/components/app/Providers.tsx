"use client";

import { ThemeProvider } from "next-themes";
import { CurrencyProvider } from "@/components/app/CurrencyProvider";
import { PersonalFinanceProvider } from "@/components/app/PersonalFinanceProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <CurrencyProvider>
        <PersonalFinanceProvider>{children}</PersonalFinanceProvider>
      </CurrencyProvider>
    </ThemeProvider>
  );
}
