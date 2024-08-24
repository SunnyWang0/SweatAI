"use client";

import { cn } from "../lib/utils";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import React from "react";
import shoppingResults, { ShoppingResult } from "./chat/shopping-results";
import ShoppingResults from "./chat/shopping-results";

interface RightPanelProps {
  isCollapsed: boolean;
  isMobile: boolean;
  shoppingResults: ShoppingResult[];
}

export function RightPanel({
  isCollapsed,
  isMobile,
  shoppingResults,
}: RightPanelProps) {
  return (
    <div
      data-collapsed={isCollapsed}
      className="relative justify-between group lg:bg-accent/20 lg:dark:bg-card/35 flex flex-col h-full gap-4 p-2 data-[collapsed=true]:p-2"
    >
      <div className="flex flex-col justify-between p-2 pt-8 h-full overflow-y-auto">
        <h2 className="text-base font-normal mb-4 text-center">
          Search Results
        </h2>
        <ScrollArea className="flex-1">
          <ShoppingResults results={shoppingResults} />
        </ScrollArea>
      </div>
    </div>
  );
}
