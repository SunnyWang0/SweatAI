"use client";

import React, { useState } from "react";
import FeedbackModal from "./feedback-modal";

interface ChatTopbarProps {}

export default function ChatTopbar({}: ChatTopbarProps) {
  const handleRedirect = () => {
    window.location.href = "https://sweat.chat";
  };

  return (
    <div className="w-full font-serif flex items-center justify-between py-6 px-4 sticky top-0 z-10">
      <div className="flex-grow flex justify-center">
        <h1
          className="text-5xl font-light font-serif cursor-pointer"
          onClick={handleRedirect}
        >
          Sweat
        </h1>
      </div>
    </div>
  );
}
