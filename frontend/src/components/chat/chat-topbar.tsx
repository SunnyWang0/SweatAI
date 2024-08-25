"use client";

import React from "react";

interface ChatTopbarProps {}

export default function ChatTopbar({}: ChatTopbarProps) {
  return (
    <div className="w-full flex items-center justify-between py-6 px-4">
      <div className="flex-grow flex justify-center">
        <h1 className="text-5xl font-light font-serif">Sweat</h1>
      </div>
    </div>
  );
}
