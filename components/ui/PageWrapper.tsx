// components/PageWrapper.tsx
"use client";

import { cn } from "@/lib/utils";

export default function PageWrapper({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col p-4 justify-center min-h-screen bg-gray-100",
        className
      )}
    >
      {children}
    </div>
  );
}
