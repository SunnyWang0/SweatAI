"use client";

import { cn } from "../lib/utils";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import React from "react";
import ShoppingResults, { ShoppingResult } from "./chat/shopping-results";

interface RightPanelProps {
  isCollapsed: boolean;
  isMobile: boolean;
  shoppingResults: ShoppingResult[];
  setShoppingResults: React.Dispatch<React.SetStateAction<ShoppingResult[]>>;
}

export function RightPanel({
  isMobile,
  shoppingResults,
  setShoppingResults,
}: RightPanelProps) {
  return (
    <div className={cn("bg-gray-50 dark:bg-card h-full", isMobile && "w-full")}>
      <ScrollArea className="flex-grow">
        <div className="h-full">
          <ShoppingResults
            results={shoppingResults}
            isMobile={isMobile}
            setResults={setShoppingResults}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
