"use client";

import type React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  Cpu,
  Clock,
  Server,
  MoreVertical,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface WebSocketMessage {
  type: "heartbeat" | "log" | "final_output" | "connection_status";
  content: string;
  timestamp: string;
  metadata?: any;
}

interface ChatMessage {
  id: string;
  type: "user" | "ai" | "log";
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  metadata?: any; // Added metadata field to store additional message data
}

type ConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error"
  | "reconnecting"
  | "timeout"
  | "server_error";

interface ErrorState {
  type:
    | "connection"
    | "timeout"
    | "server"
    | "rate_limit"
    | "parse"
    | "network"
    | "unknown";
  message: string;
  retryable: boolean;
  timestamp: string;
}

export default function MakeMyPCPage() {
  const [query, setQuery] = useState("");
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState("");
  const [error, setError] = useState<ErrorState | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastHeartbeat, setLastHeartbeat] = useState<number>(Date.now());
  const [queryTimeout, setQueryTimeout] = useState<NodeJS.Timeout | null>(null);
  const maxRetries = 5;
  const maxMessages = 100;
  const queryTimeoutMs = 30000;
  const heartbeatTimeoutMs = 60000;

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatCheckRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const createError = useCallback(
    (
      type: ErrorState["type"],
      message: string,
      retryable = true
    ): ErrorState => ({
      type,
      message,
      retryable,
      timestamp: new Date().toISOString(),
    }),
    []
  );

  const clearAllTimeouts = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (heartbeatCheckRef.current) clearTimeout(heartbeatCheckRef.current);
    if (queryTimeout) clearTimeout(queryTimeout);
    if (healthCheckIntervalRef.current)
      clearInterval(healthCheckIntervalRef.current);
  }, [queryTimeout]);

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => {
      const newMessages = [...prev, message];
      if (newMessages.length > maxMessages) {
        return newMessages.slice(-maxMessages);
      }
      return newMessages;
    });
  }, []);

  const startHeartbeatMonitoring = useCallback(() => {
    if (heartbeatCheckRef.current) clearTimeout(heartbeatCheckRef.current);

    heartbeatCheckRef.current = setTimeout(() => {
      const timeSinceLastHeartbeat = Date.now() - lastHeartbeat;
      if (
        timeSinceLastHeartbeat > heartbeatTimeoutMs &&
        connectionState === "connected"
      ) {
        setError(
          createError(
            "connection",
            "Connection appears to be stale. Reconnecting...",
            true
          )
        );
        setConnectionState("timeout");
        connectWebSocket();
      }
    }, heartbeatTimeoutMs);
  }, [lastHeartbeat, connectionState, createError]);

  const performHealthCheck = useCallback(async () => {
    try {
      const response = await fetch(
        "https://makemypc-backend.onrender.com/health",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(5000), // 5 second timeout
        }
      );

      if (!response.ok) {
        console.warn(
          "[v0] Health check failed:",
          response.status,
          response.statusText
        );
        if (connectionState === "connected") {
          setError(
            createError(
              "server",
              "Backend service may be experiencing issues",
              true
            )
          );
        }
      } else {
        console.log("[v0] Health check passed");
        // Clear any server errors if health check passes
        if (error?.type === "server") {
          setError(null);
        }
      }
    } catch (error) {
      console.warn("[v0] Health check error:", error);
      if (connectionState === "connected") {
        setError(
          createError("network", "Backend service health check failed", true)
        );
      }
    }
  }, [connectionState, error, createError]);

  const startHealthCheckMonitoring = useCallback(() => {
    if (healthCheckIntervalRef.current)
      clearInterval(healthCheckIntervalRef.current);

    // Perform initial health check
    performHealthCheck();

    // Set up interval to check every 10 minutes (600,000 ms)
    healthCheckIntervalRef.current = setInterval(() => {
      performHealthCheck();
    }, 600000);
  }, [performHealthCheck]);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    clearAllTimeouts();
    setConnectionState("connecting");
    setError(null);

    if (typeof WebSocket === "undefined") {
      setError(
        createError(
          "connection",
          "WebSocket is not supported in this browser",
          false
        )
      );
      setConnectionState("error");
      return;
    }

    try {
      const ws = new WebSocket("wss://makemypc-backend.onrender.com/ws");

      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          setError(
            createError(
              "timeout",
              "Connection timeout. Server may be overloaded.",
              true
            )
          );
          setConnectionState("timeout");
        }
      }, 10000);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        setConnectionState("connected");
        setRetryCount(0);
        setError(null);
        setLastHeartbeat(Date.now());
        startHeartbeatMonitoring();
        startHealthCheckMonitoring();
        console.log("[v0] WebSocket connected successfully");
      };

      ws.onmessage = (event) => {
        try {
          let message: WebSocketMessage;
          try {
            message = JSON.parse(event.data);
          } catch (parseError) {
            console.error("[v0] JSON parse error:", parseError);
            setError(
              createError(
                "parse",
                "Received invalid response from server",
                true
              )
            );
            return;
          }

          if (!message.type || typeof message.content !== "string") {
            setError(
              createError(
                "parse",
                "Received malformed message from server",
                true
              )
            );
            return;
          }

          switch (message.type) {
            case "connection_status":
              console.log("[v0] Connection status:", message.content);
              break;

            case "heartbeat":
              setLastHeartbeat(Date.now());
              startHeartbeatMonitoring();
              break;

            case "log":
              addMessage({
                id: Date.now().toString() + Math.random(),
                type: "log",
                content: message.content,
                timestamp: message.timestamp || new Date().toISOString(),
                metadata: message.metadata, // Pass metadata for enhanced display
              });
              break;

            case "final_output":
              if (queryTimeout) {
                clearTimeout(queryTimeout);
                setQueryTimeout(null);
              }

              addMessage({
                id: Date.now().toString() + Math.random(),
                type: "ai",
                content: message.content,
                timestamp: message.timestamp || new Date().toISOString(),
              });
              setCurrentStreamingMessage("");
              setIsLoading(false);
              break;

            default:
              console.warn("[v0] Unknown message type:", message.type);
          }
        } catch (error) {
          console.error("[v0] Error processing WebSocket message:", error);
          setError(
            createError("parse", "Failed to process server response", true)
          );
        }
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        clearAllTimeouts();
        setIsLoading(false);

        console.log("[v0] WebSocket closed:", event.code, event.reason);

        if (event.code === 1000) {
          setConnectionState("disconnected");
          return;
        }

        if (event.code === 1008 || event.code === 1003) {
          setError(
            createError(
              "server",
              "Server rejected connection. Please try again later.",
              false
            )
          );
          setConnectionState("server_error");
          return;
        }

        if (event.code === 1013) {
          setError(
            createError(
              "rate_limit",
              "Server is currently overloaded. Retrying...",
              true
            )
          );
          setConnectionState("server_error");
        } else {
          setConnectionState("disconnected");
        }

        if (retryCount < maxRetries) {
          const delay = Math.min(Math.pow(2, retryCount) * 1000, 30000);
          setConnectionState("reconnecting");
          setError(
            createError(
              "connection",
              `Reconnecting in ${Math.ceil(delay / 1000)} seconds... (${
                retryCount + 1
              }/${maxRetries})`,
              true
            )
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            setRetryCount((prev) => prev + 1);
            connectWebSocket();
          }, delay);
        } else {
          setError(
            createError(
              "connection",
              "Connection failed after multiple attempts. Please check your internet connection and try again.",
              true
            )
          );
          setConnectionState("error");
        }
      };

      ws.onerror = (event) => {
        clearTimeout(connectionTimeout);
        console.error("[v0] WebSocket error:", event);
        setConnectionState("error");
        setIsLoading(false);

        if (ws.readyState === WebSocket.CONNECTING) {
          setError(
            createError(
              "network",
              "Unable to connect to server. Please check your internet connection.",
              true
            )
          );
        } else {
          setError(
            createError(
              "connection",
              "Connection error occurred. Please try again.",
              true
            )
          );
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("[v0] Failed to create WebSocket:", error);
      setConnectionState("error");
      setError(
        createError("connection", "Failed to initialize connection", true)
      );
    }
  }, [
    retryCount,
    clearAllTimeouts,
    createError,
    addMessage,
    startHeartbeatMonitoring,
    queryTimeout,
    startHealthCheckMonitoring,
  ]);

  const sendQuery = useCallback(() => {
    if (!query.trim()) {
      setError(createError("unknown", "Please enter a query", false));
      return;
    }

    if (query.trim().length > 500) {
      setError(
        createError(
          "unknown",
          "Query is too long. Please keep it under 500 characters.",
          false
        )
      );
      return;
    }

    if (connectionState !== "connected") {
      setError(
        createError(
          "connection",
          "Not connected to server. Please wait for connection.",
          true
        )
      );
      return;
    }

    if (isLoading) {
      setError(
        createError(
          "unknown",
          "Please wait for the current query to complete",
          false
        )
      );
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: query.trim(),
      timestamp: new Date().toISOString(),
    };

    addMessage(userMessage);
    setIsLoading(true);
    setError(null);
    setCurrentStreamingMessage("");

    const timeout = setTimeout(() => {
      setIsLoading(false);
      setError(
        createError(
          "timeout",
          "Query timed out. The server may be busy. Please try again.",
          true
        )
      );
    }, queryTimeoutMs);
    setQueryTimeout(timeout);

    try {
      const queryData = { query: query.trim() };
      wsRef.current?.send(JSON.stringify(queryData));
      setQuery("");
      console.log("[v0] Query sent:", queryData);
    } catch (error) {
      clearTimeout(timeout);
      setQueryTimeout(null);
      console.error("[v0] Failed to send query:", error);
      setError(
        createError("network", "Failed to send query. Please try again.", true)
      );
      setIsLoading(false);
    }
  }, [query, connectionState, isLoading, addMessage, createError]);

  const handleReconnect = useCallback(() => {
    clearAllTimeouts();
    setRetryCount(0);
    setError(null);
    setIsLoading(false);
    connectWebSocket();
  }, [clearAllTimeouts, connectWebSocket]);

  const getConnectionIcon = () => {
    switch (connectionState) {
      case "connecting":
        return <Activity className="h-3 w-3 animate-spin text-amber-500" />;
      case "connected":
        return <Wifi className="h-3 w-3 text-green-500" />;
      case "reconnecting":
        return <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />;
      case "timeout":
        return <Clock className="h-3 w-3 text-orange-500" />;
      case "server_error":
        return <Server className="h-3 w-3 text-red-500" />;
      case "error":
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return <WifiOff className="h-3 w-3 text-gray-400" />;
    }
  };

  const getErrorDisplay = () => {
    if (!error) return null;

    const errorColors = {
      connection: "red",
      timeout: "orange",
      server: "red",
      rate_limit: "yellow",
      parse: "red",
      network: "red",
      unknown: "gray",
    };

    const color = errorColors[error.type] || "red";

    return (
      <div className="px-6 py-2">
        <div
          className={`bg-${color}-50 border border-${color}-200 rounded-lg p-3`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className={`h-4 w-4 text-${color}-500`} />
              <p className={`text-sm text-${color}-700`}>{error.message}</p>
            </div>
            {error.retryable && (
              <Button
                onClick={handleReconnect}
                size="sm"
                variant="outline"
                className="h-6 px-2 text-xs bg-transparent"
              >
                Retry
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const exampleQueries = [
    "Budget Gaming PC",
    "High-End Workstation",
    "Office Computer",
    "Content Creation Setup",
  ];

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
      wsRef.current?.close();
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentStreamingMessage]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendQuery();
    }
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
    inputRef.current?.focus();
  };

  return (
    <div className="h-screen bg-[#0B141A] flex flex-col">
      <header className="bg-gradient-to-r from-[#075E54] to-[#128C7E] px-4 py-4 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10">
              <Cpu className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-white font-semibold text-lg tracking-tight">
                MakeMyPC Assistant
              </h1>
              <div className="flex items-center space-x-2">
                {getConnectionIcon()}
                <span className="text-white/90 text-xs font-medium capitalize">
                  {connectionState.replace("_", " ")}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <MoreVertical className="h-5 w-5 text-white/90" />
            {(connectionState === "error" ||
              connectionState === "timeout" ||
              connectionState === "server_error") && (
              <Button
                onClick={handleReconnect}
                size="sm"
                variant="ghost"
                className="h-8 px-3 text-xs text-white hover:bg-white/20 rounded-full font-medium"
              >
                Retry
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col relative bg-[#0B141A]">
        {/* WhatsApp chat background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23ffffff' fillOpacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <ScrollArea className="flex-1 relative z-10">
          <div className="py-6 px-4 space-y-3 min-h-full max-w-4xl mx-auto">
            {messages.length === 0 && !isLoading && (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-[#075E54] to-[#128C7E] rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <Cpu className="h-10 w-10 text-white" />
                </div>
                <div className="bg-[#1F2937] rounded-2xl p-6 mx-4 shadow-2xl border border-gray-700/50 backdrop-blur-sm">
                  <h2 className="text-xl font-semibold text-white mb-3">
                    🔧 Build Your Perfect PC
                  </h2>
                  <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                    Describe your needs and I'll create a custom build
                    recommendation for you
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    {exampleQueries.map((example) => (
                      <button
                        key={example}
                        onClick={() => handleExampleClick(example)}
                        disabled={connectionState !== "connected"}
                        className="px-4 py-3 text-sm font-medium text-[#075E54] bg-gradient-to-r from-[#DCF8C6] to-[#E8F5E8] rounded-xl hover:from-[#C8F2C8] hover:to-[#DCF8C6] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.type === "user" ? "justify-end" : "justify-start"
                } mb-2`}
              >
                <div
                  className={`max-w-[85%] relative ${
                    message.type === "user"
                      ? "bg-gradient-to-r from-[#DCF8C6] to-[#E8F5E8] rounded-2xl rounded-br-md px-4 py-3 shadow-lg"
                      : message.type === "log"
                      ? "bg-[#1F2937] rounded-2xl px-4 py-3 shadow-lg mx-8 border border-gray-700/50"
                      : "bg-[#1F2937] rounded-2xl rounded-bl-md px-4 py-3 shadow-lg border border-gray-700/50"
                  }`}
                >
                  {message.type === "user" && (
                    <div className="absolute -right-1 bottom-2 w-4 h-4 bg-gradient-to-r from-[#DCF8C6] to-[#E8F5E8] transform rotate-45 rounded-br-sm"></div>
                  )}
                  {message.type === "ai" && (
                    <div className="absolute -left-1 bottom-2 w-4 h-4 bg-[#1F2937] transform rotate-45 rounded-bl-sm border-l border-b border-gray-700/50"></div>
                  )}

                  {message.type === "log" ? (
                    <div className="space-y-2">
                      {message.metadata?.input ? (
                        <>
                          <p className="text-sm text-gray-200 font-medium">
                            🔍 {message.metadata.input}
                          </p>
                          {message.metadata?.tool && (
                            <p className="text-xs text-gray-400 font-mono bg-gray-800/50 px-3 py-1 rounded-full inline-block border border-gray-600/30">
                              {message.metadata.tool}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-gray-300">
                          {message.content}
                        </p>
                      )}
                    </div>
                  ) : message.type === "ai" ? (
                    <div className="prose prose-sm max-w-none text-gray-200 prose-headings:text-white prose-strong:text-white prose-code:text-green-400 prose-code:bg-gray-800/50 prose-code:px-1 prose-code:rounded">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-800 font-medium">
                      {message.content}
                    </p>
                  )}

                  <div
                    className={`text-xs mt-2 ${
                      message.type === "user"
                        ? "text-green-700/80 text-right font-medium"
                        : "text-gray-400"
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start mb-2">
                <div className="bg-[#1F2937] rounded-2xl rounded-bl-md px-4 py-3 shadow-lg relative border border-gray-700/50">
                  <div className="absolute -left-1 bottom-2 w-4 h-4 bg-[#1F2937] transform rotate-45 rounded-bl-sm border-l border-b border-gray-700/50"></div>
                  <div className="flex items-center space-x-3">
                    <Activity className="h-4 w-4 animate-spin text-[#075E54]" />
                    <span className="text-sm text-gray-200 font-medium">
                      Analyzing your request...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {error && (
          <div className="px-4 py-3">
            <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-4 mx-4 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <p className="text-sm text-red-200 font-medium">
                    {error.message}
                  </p>
                </div>
                {error.retryable && (
                  <Button
                    onClick={handleReconnect}
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 text-xs bg-red-500/20 border-red-400/50 text-red-200 hover:bg-red-500/30 rounded-full font-medium"
                  >
                    Retry
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bg-[#1F2937] px-4 py-4 border-t border-gray-700/50 backdrop-blur-sm">
          <div className="flex items-end space-x-3 max-w-4xl mx-auto">
            <div className="flex-1 bg-[#374151] rounded-full px-5 py-3 shadow-lg border border-gray-600/30">
              <Input
                ref={inputRef}
                placeholder="Type a message..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="border-0 p-0 h-6 focus:ring-0 focus:outline-none bg-transparent text-sm placeholder:text-gray-400 text-white font-medium"
                disabled={connectionState !== "connected" || isLoading}
                maxLength={500}
              />
            </div>
            <Button
              onClick={sendQuery}
              disabled={
                connectionState !== "connected" || isLoading || !query.trim()
              }
              className="h-12 w-12 bg-gradient-to-r from-[#075E54] to-[#128C7E] hover:from-[#128C7E] hover:to-[#25D366] text-white rounded-full p-0 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
            >
              {isLoading ? (
                <Activity className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>

          {query.length > 400 && (
            <div className="text-xs text-gray-400 mt-2 text-right font-medium">
              {query.length}/500
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
