"use client";

import React, { useEffect, useState, Dispatch, SetStateAction } from "react";
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
import FeedbackModal from "./feedback-modal";

export interface ShoppingResult {
  title: string;
  price: string;
  link: string;
  thumbnail: string;
  formula: string;
}

interface ChatLayoutProps {
  defaultCollapsed?: boolean;
  navCollapsedSize: number;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  shoppingResults?: ShoppingResult[];
  resetChat: () => void;
  isCollapsed: boolean;
}

type MergedProps = ChatLayoutProps & ChatProps;

export function ChatLayout({
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
  isCollapsed,
}: MergedProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const defaultLayout = [70, 30];

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

  useEffect(() => {
    window.dispatchEvent(new Event("resize"));
  }, [isCollapsed]);

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
        className="h-full w-full flex justify-center"
        defaultSize={80}
        minSize={50}
      >
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
        <FeedbackModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </ResizablePanel>
      <ResizableHandle className={cn("hidden md:flex")} withHandle />
      <ResizablePanel
        defaultSize={20}
        minSize={20}
        maxSize={35}
        className={cn("hidden md:block")}
      >
        <RightPanel
          isCollapsed={false}
          isMobile={isMobile}
          shoppingResults={shoppingResults || []}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
