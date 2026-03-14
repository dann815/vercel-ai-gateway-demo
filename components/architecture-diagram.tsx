"use client";

import { useEffect, useRef } from "react";
import mermaid from "mermaid";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";

export function ArchitectureDiagram({
  diagram,
  title,
  description,
  backHref,
}: {
  diagram: string;
  title: string;
  description: React.ReactNode;
  backHref: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!containerRef.current) return;

    mermaid.initialize({
      startOnLoad: false,
      theme: resolvedTheme === "dark" ? "dark" : "default",
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: "basis",
      },
      themeVariables:
        resolvedTheme === "dark"
          ? {
              primaryColor: "#1e293b",
              primaryTextColor: "#e2e8f0",
              lineColor: "#475569",
              secondaryColor: "#0f172a",
            }
          : {},
    });

    const id = `mermaid-${Date.now()}`;
    containerRef.current.innerHTML = "";

    mermaid.render(id, diagram).then(({ svg }) => {
      if (containerRef.current) {
        containerRef.current.innerHTML = svg;
      }
    });
  }, [resolvedTheme, diagram]);

  return (
    <div className="h-screen overflow-y-auto">
      <div className="fixed top-3 left-3 md:top-4 md:left-4 z-10 flex gap-2 animate-fade-in">
        <Button
          asChild
          variant="outline"
          size="icon"
          className="h-9 w-9 shadow-border-small hover:shadow-border-medium bg-background/80 backdrop-blur-sm border-0 hover:bg-background hover:scale-[1.02] transition-all duration-150 ease"
        >
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <ThemeToggle />
      </div>

      <div className="flex flex-col items-center px-4 md:px-8 pt-20 pb-8 animate-fade-in">
        <div className="w-full max-w-5xl space-y-8">
          <h1 className="text-2xl md:text-4xl font-light tracking-tight text-foreground text-center animate-slide-up">
            <span className="font-mono font-semibold tracking-tight bg-foreground text-background px-4 py-2 rounded-2xl shadow-border-medium text-xl md:text-3xl">
              {title}
            </span>
          </h1>
          <div
            ref={containerRef}
            className="w-full flex justify-center animate-fade-in [&_svg]:max-w-full"
            style={{ animationDelay: "150ms" }}
          />
          <div
            className="text-center text-sm text-muted-foreground space-y-2 animate-fade-in"
            style={{ animationDelay: "200ms" }}
          >
            {description}
          </div>
        </div>
      </div>
    </div>
  );
}
