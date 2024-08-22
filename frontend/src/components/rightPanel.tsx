"use client";

import { cn } from "../lib/utils";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import React from "react";

interface RightPanelProps {
  isCollapsed: boolean;
  isMobile: boolean;
}

export function RightPanel({ isCollapsed, isMobile }: RightPanelProps) {
  return (
    <div
      data-collapsed={isCollapsed}
      className="relative justify-between group lg:bg-accent/20 lg:dark:bg-card/35 flex flex-col h-full gap-4 p-2 data-[collapsed=true]:p-2"
    >
      <div className="flex flex-col justify-between p-2 pt-8 max-h-fit overflow-y-auto">
        <h2 className="text-base font-normal mb-4 text-center">Search Results</h2>
        
        <div className="flex flex-col gap-2">
          <ScrollArea className="h-[calc(100vh-200px)]">
            {/* Search results will be displayed here */}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}