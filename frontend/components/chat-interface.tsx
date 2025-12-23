"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { X, Send, MessageCircle } from "lucide-react";
import ChatChart from "./chat-chart";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  hasChart?: boolean;
  chartConfig?: any;
}

interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCountry?: string | null;
}

const CHATBOT_API_URL =
  process.env.NEXT_PUBLIC_CHATBOT_API_URL || "http://localhost:5050";

export default function ChatInterface({
  isOpen,
  onClose,
  selectedCountry,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm your research assistant. I can help you explore research data with visual charts.\n\nTry asking:\n• 'Show me the top 10 subfields'\n• 'Compare US and China'\n• 'How has research changed from 2020 to 2023?'\n• 'What is the distribution of topics?'",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Send message to chatbot API
      const response = await fetch(`${CHATBOT_API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.text,
          country: selectedCountry || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from chatbot");
      }

      const data = await response.json();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: data.response || "I'm processing your query...",
        isUser: false,
        timestamp: new Date(),
        hasChart: data.has_chart || false,
        chartConfig: data.chart_config || null,
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble connecting to the chatbot. Please make sure the chatbot API is running on port 5050.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <Card className="fixed left-4 top-1/2 -translate-y-1/2 w-[500px] h-[700px] max-h-[85vh] flex flex-col shadow-2xl border-2 z-50 bg-[#1A1A2E]/95 backdrop-blur-sm border-[#00FFC0]/30">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#00FFC0]/20">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-[#00FFC0]" />
            <h2 className="font-semibold text-lg text-[#00FFC0]">
              Research Chatbot
            </h2>
          </div>
          <div className="flex items-center gap-2 ml-7">
            <div className="h-2 w-2 rounded-full bg-[#00FFC0] animate-pulse"></div>
            <span className="text-xs text-[#00FFC0]">Online</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setMessages([
                {
                  id: "1",
                  text: "Hello! I'm your research assistant. I can help you explore research data with visual charts.\n\nTry asking:\n• 'Show me the top 10 subfields'\n• 'Compare US and China'\n• 'How has research changed from 2020 to 2023?'\n• 'What is the distribution of topics?'",
                  isUser: false,
                  timestamp: new Date(),
                },
              ]);
            }}
            className="h-8 border-[#00FFC0]/50 text-white hover:bg-[#00FFC0]/10 hover:border-[#00FFC0]"
          >
            Reset
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-white hover:bg-[#00FFC0]/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.isUser ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.isUser
                  ? "bg-[#00FFC0] text-white"
                  : "bg-[#2C3E50] text-white"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.text}</p>
              {message.hasChart && message.chartConfig && (
                <div className="mt-3 p-3 bg-[#1A1A2E] rounded border border-[#00FFC0]/20">
                  {message.chartConfig.title && (
                    <p className="font-semibold text-sm mb-2 text-[#00FFC0]">
                      {message.chartConfig.title}
                    </p>
                  )}
                  {message.chartConfig.data && (
                    <ChatChart
                      type={message.chartConfig.type || "bar"}
                      data={message.chartConfig.data}
                      title={message.chartConfig.title}
                    />
                  )}
                  {message.chartConfig.description && (
                    <p className="text-xs text-[#A0A0A0] mt-2">
                      {message.chartConfig.description}
                    </p>
                  )}
                </div>
              )}
              <p className="text-xs text-[#A0A0A0] mt-1">
                {message.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#2C3E50] text-white rounded-lg px-4 py-2">
              <p className="text-sm">Thinking...</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#00FFC0]/20">
        <div className="flex gap-2 items-center">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about research data..."
            disabled={isLoading}
            className="flex-1 bg-[#2C3E50] border-[#00FFC0]/50 text-white placeholder:text-[#A0A0A0] focus:border-[#00FFC0] focus:ring-[#00FFC0]/20"
          />
          <Button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="bg-[#00FFC0] text-white hover:bg-[#00FFC0]/90 disabled:opacity-50 disabled:cursor-not-allowed px-6"
          >
            Send
          </Button>
        </div>
        {selectedCountry && (
          <p className="text-xs text-[#A0A0A0] mt-2">
            Filtering by: {selectedCountry}
          </p>
        )}
      </div>
    </Card>
  );
}
