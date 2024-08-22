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
    <div className="w-full flex items-center justify-between py-10 px-4">
      <div className="lg:hidden">
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
      <h1 className="text-2xl font-bold flex-grow text-center">Sweat</h1>
      <div className="w-5 h-5"></div> {/* Placeholder for right side */}
    </div>
  );
}