"use client";

import Link from "next/link";
import { Fragment } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbsProps {
  path: string;
}

export function Breadcrumbs({ path }: BreadcrumbsProps) {
  const segments = path ? path.split("/") : [];

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 break-words">
        <li>
          <Link
            href="/files"
            className="block transition hover:text-foreground text-muted-foreground"
          >
            Home
          </Link>
        </li>

        {segments.map((segment, index) => {
          const href = `/files/${segments.slice(0, index + 1).join("/")}`;
          const isLast = index === segments.length - 1;

          return (
            <Fragment key={index}>
              <li>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </li>
              <li>
                <Link
                  href={href}
                  className={cn(
                    "block transition hover:text-foreground",
                    isLast ? "font-semibold text-foreground" : "text-muted-foreground"
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {decodeURIComponent(segment)}
                </Link>
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
