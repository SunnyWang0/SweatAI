import React, { useState, useEffect } from "react";
import {
  ShoppingCart,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Image from "next/image";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

export interface ShoppingResult {
  title: string;
  price: string;
  link: string;
  thumbnail: string;
  formula: string;
}

interface ShoppingResultsProps {
  results: ShoppingResult[];
}

const ShoppingResults: React.FC<ShoppingResultsProps> = ({ results }) => {
  const [expandedItems, setExpandedItems] = useState<{
    [key: number]: boolean;
  }>(() => Object.fromEntries(results.map((_, index) => [index, false])));

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
    return Array(5)
      .fill(null)
      .map((_, index) => (
        <div
          key={index}
          style={{
            borderColor: "#ddbc69",
            opacity: 0.4 - index * 0.1, // Decrease opacity for each item
          }}
          className="mb-6 p-4 bg-white rounded-lg shadow-md dark:bg-card border"
        >
          <div className="flex justify-between items-start">
            <div className="flex items-start">
              <div className="w-24 h-24 bg-gray-200 rounded-md mr-4"></div>
              <div>
                <div className="w-40 h-4 bg-gray-200 rounded mb-2"></div>
                <div className="w-20 h-6 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      ));
  };

  return (
    <ScrollAreaPrimitive.Root
      className="overflow-hidden"
      style={{ height: `${windowHeight}px` }}
    >
      <ScrollAreaPrimitive.Viewport className="w-full h-full">
        <div className="p-6 bg-gray-50 dark:bg-card font-serif">
          <h3 className="text-xl font-light font-serif mb-4 dark:text-white text-center">
            Shopping Results
          </h3>
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
