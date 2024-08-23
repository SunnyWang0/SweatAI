"use client";

import React, { useEffect, useState} from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { Sidebar } from "../sidebar";
import { Message, useChat } from "ai/react";
import Chat, { ChatProps } from "./chat";
import ChatList from "./chat-list";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import { RightPanel } from "../rightPanel";

export interface ShoppingResult {
  title: string;
  price: string;
  link: string;
  thumbnail: string;
  formula: string;
}

interface ChatLayoutProps {
  defaultLayout: number[] | undefined;
  defaultCollapsed?: boolean;
  navCollapsedSize: number;
  setMessages: (messages: Message[]) => void;
  shoppingResults?: ShoppingResult[];
  resetChat: () => void;
}

type MergedProps = ChatLayoutProps & ChatProps;

export function ChatLayout({
  defaultLayout = [30, 160],
  defaultCollapsed = false,
  navCollapsedSize,
  messages,
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  error,
  stop,
  loadingSubmit,
  formRef,
  setMessages,
  setInput,
  shoppingResults,
  resetChat,
}: MergedProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenWidth = () => {
      setIsMobile(window.innerWidth <= 1023);
    };

    // Initial check
    checkScreenWidth();

    // Event listener for screen width changes
    window.addEventListener("resize", checkScreenWidth);

    // Cleanup the event listener on component unmount
    return () => {
      window.removeEventListener("resize", checkScreenWidth);
    };
  }, []);

  return (
    <ResizablePanelGroup
      direction="horizontal"
      onLayout={(sizes: number[]) => {
        document.cookie = `react-resizable-panels:layout=${JSON.stringify(
          sizes
        )}`;
      }}
      className="h-screen items-stretch"
    >
      <ResizablePanel
        className="h-full w-full flex flex-col"
        defaultSize={70}
      >
        <div className="flex-grow flex justify-center">
          <Chat
            messages={messages}
            input={input}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            isLoading={isLoading}
            loadingSubmit={loadingSubmit}
            error={error}
            stop={stop}
            formRef={formRef}
            isMobile={isMobile}
            setInput={setInput}
            shoppingResults={shoppingResults}
            resetChat={resetChat}
            setMessages={setMessages}
          />
        </div>
      </ResizablePanel>
      <ResizableHandle className={cn("hidden md:flex")} withHandle />
      <ResizablePanel
        defaultSize={10}
        minSize={isMobile ? 0 : 12}
        maxSize={isMobile ? 0 : 30}
        className={cn("hidden md:block")}
      >
        <RightPanel isCollapsed={false} isMobile={isMobile} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}