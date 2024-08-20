import React from "react";
import ChatTopbar from "./chat-topbar";
import ChatList from "./chat-list";
import ChatBottombar from "./chat-bottombar";
import { Message } from "ai/react";
import { ChatRequestOptions } from "ai";

interface ShoppingResult {
  title: string;
  price: string;
  link: string;
  thumbnail: string;
  formula: string;
}

export interface ChatProps {
  chatId?: string;
  messages: Message[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (
    e: React.FormEvent<HTMLFormElement>,
    chatRequestOptions?: ChatRequestOptions
  ) => void;
  isLoading: boolean;
  loadingSubmit?: boolean;
  error: undefined | Error;
  stop: () => void;
  formRef: React.RefObject<HTMLFormElement>;
  isMobile?: boolean;
  setInput?: React.Dispatch<React.SetStateAction<string>>;
  shoppingResults?: ShoppingResult[];
}

export default function Chat({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  error,
  stop,
  chatId,
  loadingSubmit,
  formRef,
  isMobile,
  setInput,
  shoppingResults,
}: ChatProps) {
  console.log("Chat component shoppingResults:", shoppingResults);
  return (
    <div className="flex flex-col justify-between w-10/12 h-full ">
      <ChatTopbar
        chatId={chatId}
        messages={messages}
      />

      <ChatList
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
        shoppingResults={shoppingResults}
      />

      <ChatBottombar
        messages={messages}
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
        error={error}
        stop={stop}
        formRef={formRef}
        setInput={setInput}
      />
    </div>
  );
}