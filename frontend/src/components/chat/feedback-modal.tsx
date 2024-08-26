import React, { useState } from "react";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/submit-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback }),
      });

      if (!response.ok) throw new Error("Failed to send feedback");

      setFeedback("");
      onClose();
      alert("Feedback sent successfully!");
    } catch (error) {
      console.error("Error sending feedback:", error);
      alert("Error sending feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className=" font-serif fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center"
      onClick={onClose} // Close when clicking the overlay
    >
      <div
        className="bg-card p-4 rounded-xl w-[600px] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the modal itself
      >
        <h2 className="text-3xl mb-6 text-white text-center">
          Provide Feedback
        </h2>
        <form onSubmit={handleSubmit}>
          <textarea
            className="w-full border border-[#ddbc69] h-64 p-3 border rounded-lg mb-6 bg-accent text-white"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Enter your feedback here..."
            required
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="mr-3 px-6 py-3 bg-accent text-white rounded-full"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-accent text-[#ddbc69] rounded-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Sending..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
