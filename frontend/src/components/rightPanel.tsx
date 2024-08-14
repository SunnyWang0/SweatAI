"use client";

import { Trash2 } from "lucide-react";
import { cn } from "../lib/utils";
import { Button, buttonVariants } from "../components/ui/button";
import { useState } from "react";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";

interface CartItem {
  id: number;
  name: string;
}

interface RightPanelProps {
  isCollapsed: boolean;
  isMobile: boolean;
}

export function RightPanel({ isCollapsed, isMobile }: RightPanelProps) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");

  const addItem = () => {
    if (newItemName.trim()) {
      const newItem: CartItem = {
        id: Date.now(),
        name: newItemName.trim(),
      };
      setCartItems((prevItems) => [...prevItems, newItem]);
      setNewItemName("");
      setIsAddingItem(false);
    }
  };

  const removeItem = (id: number) => {
    setCartItems((prevItems) => prevItems.filter(item => item.id !== id));
  };

  return (
    <div
      data-collapsed={isCollapsed}
      className="relative justify-between group lg:bg-accent/20 lg:dark:bg-card/35 flex flex-col h-full gap-4 p-2 data-[collapsed=true]:p-2"
    >
      <div className="flex flex-col justify-between p-2 pt-8 max-h-fit overflow-y-auto">
        <h2 className="text-base font-semibold mb-4 text-center">Shopping Cart</h2>
        
        <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddingItem(true)} className="mb-4">Add Item</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Item</DialogTitle>
              <DialogDescription>
                Enter a name for the new item.
              </DialogDescription>
            </DialogHeader>
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Item name"
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsAddingItem(false)}>Cancel</Button>
              <Button onClick={addItem}>Add</Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="flex flex-col gap-2">
          <ScrollArea className="h-[calc(100vh-200px)]">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "flex justify-between w-full h-14 text-xs font-normal items-center"
                )}
              >
                <span>{item.name}</span>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:text-red-500"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Remove item?</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to remove this item from your cart?
                      </DialogDescription>
                      <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => {}}>Cancel</Button>
                        <Button
                          variant="destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
              </div>
            ))}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}