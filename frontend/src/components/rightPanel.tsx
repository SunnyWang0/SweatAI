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
      className={cn(
        "bg-gray-50 dark:bg-card h-full flex flex-col",
        isCollapsed && "w-0",
        !isCollapsed && isMobile && "w-full"
      )}
    >
      <ScrollArea className="flex-grow">
        <div className="h-full">
          <ShoppingResults results={shoppingResults} />
        </div>
      </ScrollArea>
    </div>
  );
}
