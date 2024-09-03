"use client";

import React, { useEffect, useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { Message } from "ai/react";
import Chat, { ChatProps } from "./chat";
import { RightPanel } from "../rightPanel";
import FeedbackModal from "./feedback-modal";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ShoppingResult } from "./shopping-results";

interface ChatLayoutProps {
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  shoppingResults?: ShoppingResult[];
  resetChat: () => void;
  isCollapsed: boolean;
  setShoppingResults: React.Dispatch<React.SetStateAction<ShoppingResult[]>>;
}

type MergedProps = ChatLayoutProps & ChatProps;

export function ChatLayout({
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
  setShoppingResults,
}: MergedProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMobileRightPanelOpen, setIsMobileRightPanelOpen] = useState(false);

  useEffect(() => {
    const checkScreenWidth = () => {
      setIsMobile(window.innerWidth <= 1023);
    };

    checkScreenWidth();
    window.addEventListener("resize", checkScreenWidth);

    return () => {
      window.removeEventListener("resize", checkScreenWidth);
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(new Event("resize"));
  }, [isCollapsed]);

  // New effect to open the mobile right panel when shoppingResults change
  useEffect(() => {
    if (isMobile && shoppingResults && shoppingResults.length > 0) {
      setIsMobileRightPanelOpen(true);
    }
  }, [isMobile, shoppingResults]);

  if (isMobile) {
    return (
      <div className="h-screen flex flex-col relative">
        <div className="flex-grow overflow-hidden">
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
            isMobile={true}
            setInput={setInput}
            shoppingResults={shoppingResults}
            resetChat={resetChat}
            setMessages={setMessages}
          />
        </div>
        {isMobileRightPanelOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsMobileRightPanelOpen(false)}
          />
        )}
        <div
          className={`fixed top-0 right-0 h-full w-[85%] bg-white shadow-lg transition-transform duration-300 ease-in-out z-50 ${
            isMobileRightPanelOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <RightPanel
            isCollapsed={false}
            isMobile={true}
            shoppingResults={shoppingResults || []}
            setShoppingResults={setShoppingResults}
          />
        </div>
        <button
          onClick={() => setIsMobileRightPanelOpen(!isMobileRightPanelOpen)}
          className="fixed top-1/2 transform -translate-y-1/2 bg-accent text-white p-1 rounded-l-md transition-all duration-300 ease-in-out"
          style={{
            right: isMobileRightPanelOpen ? "calc(85% - 1px)" : "0",
            zIndex: 60,
            width: "25px", // Adjust this value to make it skinnier
          }}
        >
          {isMobileRightPanelOpen ? (
            <ChevronRight size={20} />
          ) : (
            <ChevronLeft size={20} />
          )}
        </button>
      </div>
    );
  }

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
          isMobile={false}
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
          isMobile={false}
          shoppingResults={shoppingResults || []}
          setShoppingResults={setShoppingResults}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
