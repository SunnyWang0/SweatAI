"use client";

import React from "react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import { Sidebar } from "../sidebar";
import { Message } from "ai/react";

interface ChatTopbarProps {
  chatId?: string;
  messages: Message[];
}

export default function ChatTopbar({
  chatId,
  messages,
}: ChatTopbarProps) {
  return (
    <div className="w-full flex px-4 py-6 items-center justify-between lg:justify-center">
      <Sheet>
        <SheetTrigger>
          <HamburgerMenuIcon className="lg:hidden w-5 h-5" />
        </SheetTrigger>
        <SheetContent side="left">
          <Sidebar
            chatId={chatId || ""}
            isCollapsed={false}
            isMobile={true}
            messages={messages}
          />
        </SheetContent>
      </Sheet>

      <h1 className="text-2xl font-bold">Cosmo Assistant</h1>
    </div>
  );
}