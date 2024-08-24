import React, { useState } from "react";
import {
  ShoppingCart,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeDisplayBlock from "../code-display-block";
import Image from "next/image";

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
  }>({});

  const addToCart = (itemName: string) => {
    console.log(`Added ${itemName} to cart`);
    // Implement actual cart functionality here
  };

  const toggleDetails = (index: number) => {
    setExpandedItems((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  if (!results || results.length === 0) {
    return null;
  }

  const parseFormula = (formula: string) => {
    return formula.trim();
  };

  return (
    <div className="mt-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
      <h3 className="text-lg font-semibold mb-4 dark:text-white">
        Shopping Results
      </h3>
      {results.map((item, index) => (
        <div
          key={index}
          className="mb-6 p-4 bg-white rounded-lg shadow-md dark:bg-gray-700"
        >
          <div className="flex justify-between items-start">
            <div className="text-sm flex items-start">
              <Image
                src={item.thumbnail}
                alt={item.title}
                width={96}
                height={96}
                className="object-cover mr-4 rounded-md"
              />
              <div>
                <h4 className="text-md font-medium mb-2 dark:text-white">
                  {item.title}
                </h4>
                <p className="text-lg font-bold text-green-600 mb-2 dark:text-green-400">
                  {item.price}
                </p>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => addToCart(item.title)}
                className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors flex items-center justify-center dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                <ShoppingCart className="w-4 h-4" />
              </button>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 border border-gray-300 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center dark:border-gray-600 dark:hover:bg-gray-600 dark:text-white"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
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
              <div className="text-[12px] bg-gray-100 p-3 rounded-md overflow-x-auto whitespace-pre-wrap dark:bg-gray-600 dark:text-white">
                <Markdown remarkPlugins={[remarkGfm]}>{item.formula}</Markdown>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ShoppingResults;
