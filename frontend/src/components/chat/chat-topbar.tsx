"use client";

import React, { useState } from "react";
import FeedbackModal from "./feedback-modal";

interface ChatTopbarProps {}

export default function ChatTopbar({}: ChatTopbarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRedirect = () => {
    window.location.href = "https://sweat.chat";
  };

  return (
    <div className="w-full font-serif flex items-center justify-between py-6 px-4 sticky top-0 z-10">
      <button
        className="px-4 py-2 bg-accent text-[#ddbc69] bg-zing-800 border border-[#ddbc69] rounded-md"
        onClick={() => setIsModalOpen(true)}
      >
        Feedback
      </button>
      <div className="flex-grow flex justify-center">
        <h1
          className="text-5xl font-light font-serif cursor-pointer"
          onClick={handleRedirect}
        >
          Sweat
        </h1>
      </div>
      <FeedbackModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
