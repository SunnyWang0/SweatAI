"use client";

import { ChatLayout } from "../components/chat/chat-layout";
import { Message, useChat } from "ai/react";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { ShoppingResult } from "../components/chat/shopping-results";
import FeedbackModal from "../components/chat/feedback-modal";

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
  const [shoppingResults, setShoppingResults] = useState<ShoppingResult[]>([]);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  const resetChat = () => {
    setMessages([]);
    setInput(""); // Add this line to clear the input
    setChatId(uuidv4());
    localStorage.removeItem(`chat_${chatId}`);
  };

  useEffect(() => {
    if (messages.length < 1) {
      //console.log("Generating chat id");
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

      let assistantMessage: Message = {
        role: "assistant",
        content: "",
        id: chatId,
      };
      let newShoppingResults: ShoppingResult[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          const data = JSON.parse(line);
          if (data.type === "assistant_response") {
            assistantMessage.content += data.content;
            setMessages([...messages, userMessage, { ...assistantMessage }]);
          } else if (data.type === "shopping_result") {
            newShoppingResults.push(data.content);
          }
        }
      }

      if (newShoppingResults.length > 0) {
        setShoppingResults((prevResults) => [
          ...newShoppingResults,
          ...prevResults,
        ]);
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
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
    const productRegex =
      /Product Information:([\s\S]*?)(?=Product Information:|$)/gi;
    const fieldRegex =
      /(Title|Price|Link|Thumbnail|Formula):\s*([\s\S]*?)(?=(?:Title|Price|Link|Thumbnail|Formula):|$)/gi;

    let productMatch;
    while ((productMatch = productRegex.exec(data)) !== null) {
      const productInfo = productMatch[1];
      const product: Partial<ShoppingResult> = {};

      let fieldMatch;
      while ((fieldMatch = fieldRegex.exec(productInfo)) !== null) {
        const [, field, value] = fieldMatch;
        product[field.toLowerCase() as keyof ShoppingResult] = value.trim();
      }

      if (Object.keys(product).length > 0) {
        results.push(product as ShoppingResult);
      }
    }

    return results;
  };

  // Add useEffect to watch for changes in shoppingResults
  useEffect(() => {
    // This effect will run whenever shoppingResults changes
  }, [shoppingResults]);

  return (
    <main className="flex h-[calc(100dvh)] flex-col items-center relative">
      <div className="fixed left-0 top-1/4 -translate-y-1/2 z-50">
        <button
          className="bg-zinc-800 text-white py-1 px-4 rounded-b-md
                     transform -rotate-90 origin-top-left
                     hover:translate-x-1 transition-transform"
          onClick={() => setIsFeedbackModalOpen(true)}
        >
          Feedback
        </button>
      </div>
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
      />
      <ChatLayout
        messages={messages}
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={onSubmit}
        isLoading={isLoading}
        loadingSubmit={loadingSubmit}
        error={error}
        stop={stop}
        isCollapsed={shoppingResults.length === 0}
        formRef={formRef}
        setMessages={
          setMessages as React.Dispatch<React.SetStateAction<Message[]>>
        }
        setInput={setInput}
        shoppingResults={shoppingResults}
        setShoppingResults={setShoppingResults}
        resetChat={resetChat}
      />
    </main>
  );
}
