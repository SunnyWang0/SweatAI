"use client";

import { ChatLayout } from "../../components/chat/chat-layout";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogContent,
} from "../../components/ui/dialog";
import UsernameForm from "../../components/username-form";
import { ChatRequestOptions } from "ai";
import { Message, useChat } from "ai/react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    stop,
    setMessages,
    setInput,
  } = useChat({
    api: "/api/chat",
    onResponse: (response) => {
      if (response) {
        setLoadingSubmit(false);
      }
    },
    onError: (error) => {
      setLoadingSubmit(false);
      toast.error("An error occurred. Please try again.");
    },
  });
  const [chatId, setChatId] = React.useState<string>("");
  const [open, setOpen] = React.useState(false);
  const [loadingSubmit, setLoadingSubmit] = React.useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [shoppingResults, setShoppingResults] = useState([]);

  useEffect(() => {
    if (messages.length < 1) {
      console.log("Generating chat id");
      const id = uuidv4();
      setChatId(id);
    }
  }, [messages]);

  React.useEffect(() => {
    if (!isLoading && !error && chatId && messages.length > 0) {
      localStorage.setItem(`chat_${chatId}`, JSON.stringify(messages));
      window.dispatchEvent(new Event("storage"));
    }
  }, [chatId, isLoading, error, messages]);

  useEffect(() => {
    if (!localStorage.getItem("ollama_user")) {
      setOpen(true);
    }
  }, []);

  const addMessage = (message: Message) => {
    const newMessages = [...messages, message];
    setMessages(newMessages);
    window.dispatchEvent(new Event("storage"));
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoadingSubmit(true);
  
    const userMessage: Message = { role: "user", content: input, id: chatId };
    addMessage(userMessage);
    setInput("");
  
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });
  
      if (!response.ok) {
        throw new Error("Failed to fetch response");
      }
  
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
  
      if (!reader) {
        throw new Error("No reader available");
      }
  
      let assistantMessage: Message = { role: "assistant", content: "", id: chatId };
      addMessage(assistantMessage);
  
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        const chunk = decoder.decode(value);
        assistantMessage.content += chunk;
        setMessages([...messages, userMessage, { ...assistantMessage }]);
      }

  
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoadingSubmit(false);
    }
  };

  const onOpenChange = (isOpen: boolean) => {
    const username = localStorage.getItem("ollama_user")
    if (username) return setOpen(isOpen)

    localStorage.setItem("ollama_user", "Anonymous")
    window.dispatchEvent(new Event("storage"))
    setOpen(isOpen)
  }

  return (
    <main className="flex h-[calc(100dvh)] flex-col items-center ">
      <Dialog open={open} onOpenChange={onOpenChange}>
        <ChatLayout
          chatId=""
          messages={messages}
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={onSubmit}
          isLoading={isLoading}
          loadingSubmit={loadingSubmit}
          error={error}
          stop={stop}
          navCollapsedSize={10}
          defaultLayout={[30, 160]}
          formRef={formRef}
          setMessages={setMessages}
          setInput={setInput} 
          onFileUpload={function (event: React.ChangeEvent<HTMLInputElement>): void {
            throw new Error("Function not implemented.");
          } } pdfFile={null}          // shoppingResults={shoppingResults}
        />
        <DialogContent className="flex flex-col space-y-4">
          <DialogHeader className="space-y-2">
            <DialogTitle>Welcome to Ollama!</DialogTitle>
            <DialogDescription>
              Enter your name to get started. This is just to personalize your
              experience.
            </DialogDescription>
            <UsernameForm setOpen={setOpen} />
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </main>
  );
}