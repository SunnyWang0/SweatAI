import React from "react";
import ChatList from "./chat-list";
import ChatTopbar from "./chat-topbar";
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
  resetChat: () => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export default function Chat({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  error,
  stop,
  loadingSubmit,
  formRef,
  isMobile,
  setInput,
  shoppingResults,
  resetChat,
  setMessages,
}: ChatProps) {
  return (
    <div className="flex flex-col justify-between w-full sm:w-10/12 h-full relative">
      <div className="absolute top-0 left-0 right-0 h-24 z-100"></div>
      <ChatTopbar />
      <div className="flex-grow overflow-hidden -mt-24 pt-24">
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
          resetChat={resetChat}
          setMessages={setMessages}
        />
      </div>
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
        resetChat={resetChat}
        setMessages={setMessages}
      />
    </div>
  );
}
