import React from 'react';

interface ShoppingResult {
  title: string;
  price: string;
  link: string;
  formula: string;
}

interface ShoppingResultsProps {
  results: ShoppingResult[];
}

const ShoppingResults: React.FC<ShoppingResultsProps> = ({ results }) => {
  if (!results || results.length === 0) return null;

  return (
    <div className="mt-4 p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-2">Shopping Results</h3>
      {results.map((item, index) => (
        <div key={index} className="mb-4 p-3 bg-white rounded shadow">
          <h4 className="font-medium">{item.title}</h4>
          <p className="text-sm text-gray-600">{item.price}</p>
          <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">View Product</a>
          <div className="mt-2">
            <h5 className="font-medium">Formula:</h5>
            <pre className="text-xs bg-gray-100 p-2 rounded">{item.formula}</pre>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ShoppingResults;