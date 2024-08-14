"use client";

import React from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import { Sidebar } from "../sidebar";
import { Message } from "ai/react";

interface ChatTopbarProps {
  chatId?: string;
  messages: Message[];
}

export default function ChatTopbar({ chatId, messages }: ChatTopbarProps) {
  return (
    <div className="w-full flex items-center justify-center py-6 relative">
      <div className="absolute left-4 lg:hidden">
        <Sheet>
          <SheetTrigger>
            <HamburgerMenuIcon className="w-5 h-5" />
          </SheetTrigger>
          <SheetContent side="left">
            <Sidebar
              chatId={chatId || ""}
              isCollapsed={false}
              isMobile={true}
              messages={messages}
              setMessages={function (messages: Message[]): void {
                throw new Error("Function not implemented.");
              }}
            />
          </SheetContent>
        </Sheet>
      </div>
      <h1 className="text-2xl font-bold">Cosmo</h1>
      <div className="absolute right-0 mt-2">
      </div>
    </div>
  );
}
