"use client";

import React from "react";
import { Message } from "ai/react";

interface ChatTopbarProps {
  chatId?: string;
  messages: Message[];
}

export default function ChatTopbar({ chatId, messages }: ChatTopbarProps) {
  return (
    <div className="w-full flex items-center justify-between py-10 px-4">
      <div className="flex-grow flex justify-center">
        <h1 className="text-5xl font-light font-serif">Sweat</h1>
      </div>
    </div>
  );
}