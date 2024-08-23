"use client";

import { ChatLayout } from "@/components/chat/chat-layout";
import UsernameForm from "@/components/username-form";
import { ChatRequestOptions } from "ai";
import { Message, useChat } from "ai/react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { ShoppingResult } from '@/components/chat/shopping-results';

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
      toast.error("Ha ocurrido un error. Por favor, inténtalo de nuevo.");
    },
  });
  const [chatId, setChatId] = React.useState<string>("");
  const [open, setOpen] = React.useState(false);
  const [loadingSubmit, setLoadingSubmit] = React.useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [shoppingResults, setShoppingResults] = useState<ShoppingResult[]>([]);

  const resetChat = () => {
    setMessages([]);
    setShoppingResults([]);
    setChatId(uuidv4());
    localStorage.removeItem(`chat_${chatId}`);
  };

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

      let newShoppingResults: ShoppingResult[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.type === 'assistant_response') {
              assistantMessage.content += data.content;
              setMessages([...messages, userMessage, { ...assistantMessage }]);
            } else if (data.type === 'shopping_result') {
              newShoppingResults.push(data.content);
            }
          } catch (error) {
            console.error("Error parsing JSON:", error);
          }
        }
      }

      if (newShoppingResults.length > 0) {
        setShoppingResults(newShoppingResults);
      }

    } catch (error) {
      toast.error("Ha ocurrido un error. Por favor, inténtalo de nuevo.");
    } finally {
      setLoadingSubmit(false);
    }
  };

  const onOpenChange = (isOpen: boolean) => {
    const username = localStorage.getItem("ollama_user");
    if (username) return setOpen(isOpen);

    localStorage.setItem("ollama_user", "Anonymous");
    window.dispatchEvent(new Event("storage"));
    setOpen(isOpen);
  };

  const parseShoppingResults = (data: string): ShoppingResult[] => {
    const results: ShoppingResult[] = [];
    const regex = /Product Information:[\s\S]*?Title:\s*([\s\S]*?)(?:Price:|$)[\s\S]*?Price:\s*([\s\S]*?)(?:Link:|$)[\s\S]*?Link:\s*([\s\S]*?)(?:Thumbnail:|$)[\s\S]*?Thumbnail:\s*([\s\S]*?)(?:Formula:|$)[\s\S]*?Formula:\s*([\s\S]*?)(?=Product Information:|$)/gi;
    let match;

    while ((match = regex.exec(data)) !== null) {
      results.push({
        title: match[1]?.trim() || '',
        price: match[2]?.trim() || '',
        link: match[3]?.trim() || '',
        thumbnail: match[4]?.trim() || '',
        formula: match[5]?.trim().replace(/•/g, '\n•').trim() || ''
      });
    }

    return results;
  };

  return (
    <main className="flex h-[calc(100dvh)] flex-col items-center ">
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
        shoppingResults={shoppingResults}
        resetChat={resetChat}
      />
    </main>
  );
}