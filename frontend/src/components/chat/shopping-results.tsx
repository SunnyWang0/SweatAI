import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { Button } from "@/components/ui/button";

export interface ShoppingResult {
  title: string;
  price: string;
  link: string;
  thumbnail: string;
  formula: string;
}

interface ShoppingResultsProps {
  results: ShoppingResult[];
  isMobile: boolean;
  setResults: React.Dispatch<React.SetStateAction<ShoppingResult[]>>;
}

const ShoppingResults: React.FC<ShoppingResultsProps> = ({
  results,
  isMobile,
  setResults,
}) => {
  console.log("ShoppingResults props:", { results, isMobile });

  const [expandedItems, setExpandedItems] = useState<{
    [key: number]: boolean;
  }>({});
  const [windowHeight, setWindowHeight] = useState(0);

  useEffect(() => {
    const updateHeight = () => {
      setWindowHeight(window.innerHeight);
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  const toggleDetails = (index: number) => {
    setExpandedItems((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const renderPlaceholders = () => {
    const placeholderCount = 5;
    return Array(placeholderCount)
      .fill(null)
      .map((_, index) => (
        <div
          key={index}
          style={{
            borderColor: "#ddbc69",
            opacity: 0.3 - index * (0.25 / placeholderCount),
          }}
          className={`mb-4 p-3 bg-white rounded-lg shadow-md dark:bg-card border ${
            isMobile ? "text-sm" : "text-base"
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="flex items-start">
              <div
                className={`${
                  isMobile ? "w-16 h-16" : "w-24 h-24"
                } bg-gray-200 rounded-md mr-3`}
              ></div>
              <div>
                <div
                  className={`w-32 h-4 bg-gray-200 rounded mb-2 ${
                    isMobile ? "w-24" : "w-32"
                  }`}
                ></div>
                <div
                  className={`w-16 h-6 bg-gray-200 rounded ${
                    isMobile ? "w-12 h-5" : "w-16 h-6"
                  }`}
                ></div>
              </div>
            </div>
          </div>
        </div>
      ));
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <ScrollAreaPrimitive.Root
      className="overflow-hidden h-full"
      style={{ height: `${windowHeight}px` }}
    >
      <ScrollAreaPrimitive.Viewport className="w-full h-full">
        <div
          className={`p-4 bg-gray-50 dark:bg-card font-serif ${
            isMobile ? "text-sm" : "text-base"
          }`}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-light font-serif dark:text-white">
              Shopping Results
            </h3>
            <Button
              onClick={clearResults}
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </div>
          {results && results.length > 0
            ? results.map((item, index) => (
                <div
                  key={index}
                  style={{ borderColor: "#ddbc69" }}
                  className="mb-6 p-4 bg-white rounded-lg shadow-md dark:bg-card border"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start">
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mr-4"
                      >
                        <div className="w-24 h-24">
                          <Image
                            src={item.thumbnail}
                            alt={item.title}
                            width={96}
                            height={96}
                            className="object-cover w-full h-full rounded-md"
                          />
                        </div>
                      </a>
                      <div>
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <h4 className="text-sm font-medium mb-2 dark:text-white">
                            {item.title}
                          </h4>
                        </a>
                        <p
                          style={{ color: "#ddbc69" }}
                          className="text-xl font-bold mb-2 dark:text-green-400"
                        >
                          {item.price}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => toggleDetails(index)}
                      className="flex items-center text-sm mb-2 dark:text-white focus:outline-none"
                    >
                      {expandedItems[index] ? (
                        <ChevronUp className="mr-2" />
                      ) : (
                        <ChevronDown className="mr-2" />
                      )}
                      Details
                    </button>
                    {expandedItems[index] && (
                      <div
                        style={{ borderColor: "#665523" }}
                        className="text-[12px] p-3 rounded-md overflow-x-auto whitespace-pre-wrap dark:bg-accent border dark:text-white"
                      >
                        <Markdown remarkPlugins={[remarkGfm]}>
                          {item.formula}
                        </Markdown>
                      </div>
                    )}
                  </div>
                </div>
              ))
            : renderPlaceholders()}
        </div>
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar
        className="flex select-none touch-none p-0.5 bg-slate-200 transition-colors duration-150 ease-out hover:bg-slate-300 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5"
        orientation="vertical"
      >
        <ScrollAreaPrimitive.Thumb className="flex-1 bg-gray-400 rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
      </ScrollAreaPrimitive.Scrollbar>
    </ScrollAreaPrimitive.Root>
  );
};

export default ShoppingResults;
