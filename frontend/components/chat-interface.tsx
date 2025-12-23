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
  process.env.NEXT_PUBLIC_CHATBOT_API_URL || "http://localhost:5000";

export default function ChatInterface({
  isOpen,
  onClose,
  selectedCountry,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Initialize messages on client only to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    setMessages([
      {
        id: "1",
        text: "Hello! I'm your research assistant. I can help you explore research data with visual charts. Select a question below to get started:",
        isUser: false,
        timestamp: new Date(),
      },
    ]);
  }, []);

  // Suggested questions based on selected country
  const getSuggestedQuestions = () => {
    const countryText = selectedCountry ? ` in ${selectedCountry}` : "";
    return [
      `Show me the top 10 subfields${countryText}`,
      `Compare US and China${countryText ? ` for ${selectedCountry}` : ""}`,
      `What is the distribution of subfields${countryText}?`,
      `Show me research trends${countryText}`,
      `Rank countries by research output`,
      `Compare ecology in US and CA`,
      `Compare ecology subfield of US with ecology subfield of CA`,
      `Compare ecology and physics${countryText}`,
      `What are the top topics${countryText}?`,
    ];
  };

  const handleSuggestedQuestion = async (question: string) => {
    if (isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}-${Math.random()}`,
      text: question,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(`${CHATBOT_API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: question,
          country: selectedCountry || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from chatbot");
      }

      const data = await response.json();

      const botMessage: Message = {
        id: `bot-${Date.now()}-${Math.random()}`,
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
        id: `error-${Date.now()}-${Math.random()}`,
        text: "Sorry, I'm having trouble connecting to the chatbot. Please make sure the chatbot API is running on port 5000.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
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
      id: `user-${Date.now()}-${Math.random()}`,
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
        id: `bot-${Date.now()}-${Math.random()}`,
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
        id: `error-${Date.now()}-${Math.random()}`,
        text: "Sorry, I'm having trouble connecting to the chatbot. Please make sure the chatbot API is running on port 5000.",
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

  if (!isOpen || !isMounted) return null;

  return (
    <Card className="fixed left-4 top-1/2 -translate-y-1/2 w-[650px] h-[850px] max-h-[90vh] flex flex-col shadow-2xl border-2 z-50 bg-[#1A1A2E]/95 backdrop-blur-sm border-[#4fc3ae]/30">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#4fc3ae]/20">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-[#4fc3ae]" />
            <h2 className="font-semibold text-lg text-[#4fc3ae]">
              Research Chatbot
            </h2>
          </div>
          <div className="flex items-center gap-2 ml-7">
            <div className="h-2 w-2 rounded-full bg-[#4fc3ae] animate-pulse"></div>
            <span className="text-xs text-[#4fc3ae]">Online</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Reset all chat state
              setMessages([
                {
                  id: "1",
                  text: "Hello! I'm your research assistant. I can help you explore research data with visual charts. Select a question below to get started:",
                  isUser: false,
                  timestamp: new Date(),
                },
              ]);
              setInputValue("");
              setIsLoading(false);
              // Scroll to top
              if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
              }
            }}
            disabled={isLoading}
            className="h-8 bg-[#1A1A2E] border-[#4fc3ae] text-[#4fc3ae] hover:bg-[#1A1A2E] hover:border-[#4fc3ae] hover:text-[#4fc3ae] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg cursor-pointer"
          >
            Reset
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-white hover:bg-[#4fc3ae]/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((message, index) => (
          <div key={message.id}>
            <div
              className={`flex ${
                message.isUser ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.isUser
                    ? "bg-[#4fc3ae] text-white"
                    : "bg-[#2C3E50] text-white"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                {message.hasChart && message.chartConfig && (
                  <div className="mt-3 p-3 bg-[#1A1A2E] rounded border border-[#4fc3ae]/20">
                    {message.chartConfig.title && (
                      <p className="font-semibold text-sm mb-2 text-[#4fc3ae]">
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

            {/* Show suggested questions after the first (hello) message */}
            {index === 0 &&
              !message.isUser &&
              message.id === "1" &&
              !isLoading && (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-1 gap-2">
                    {getSuggestedQuestions().map((question, qIndex) => (
                      <Button
                        key={qIndex}
                        variant="outline"
                        onClick={() => handleSuggestedQuestion(question)}
                        disabled={isLoading}
                        className="w-full justify-start text-left h-auto py-2.5 px-4 bg-[#1A1A2E] border-[#4fc3ae] text-[#4fc3ae] hover:bg-[#1A1A2E] hover:border-[#4fc3ae] hover:text-[#4fc3ae] text-sm font-normal transition-all rounded-lg cursor-pointer"
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
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
      <div className="p-4 border-t border-[#4fc3ae]/20">
        <div className="flex gap-2 items-center">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about research data..."
            disabled={isLoading}
            className="flex-1 bg-[#2C3E50] border-[#4fc3ae]/50 text-white placeholder:text-[#A0A0A0] focus:border-[#4fc3ae] focus:ring-[#4fc3ae]/20"
          />
          <Button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="bg-[#4fc3ae] text-white hover:bg-[#4fc3ae]/90 disabled:opacity-50 disabled:cursor-not-allowed px-6"
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
