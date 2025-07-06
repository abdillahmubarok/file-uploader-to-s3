"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Upload, Files } from "lucide-react";

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6 border-b">
        <div className="container mx-auto flex h-16 items-center px-4">
            <Link href="/" className="mr-6 flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg>
                <span className="font-bold hidden sm:inline-block">Pakde Dosen</span>
            </Link>
            <div className="flex items-center gap-4">
                <Link
                    href="/"
                    className={cn(
                    "transition-colors hover:text-primary text-sm font-medium",
                    pathname === "/" ? "text-primary" : "text-muted-foreground"
                    )}
                >
                    Uploader
                </Link>
                <Link
                    href="/files"
                    className={cn(
                    "transition-colors hover:text-primary text-sm font-medium",
                    pathname.startsWith("/files") ? "text-primary" : "text-muted-foreground"
                    )}
                >
                    Files
                </Link>
            </div>
      </div>
    </nav>
  );
}
