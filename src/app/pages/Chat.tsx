import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Send,
  Paperclip,
  Mic,
  ChevronDown,
  Bot,
  User,
  Sparkles,
  RotateCcw,
  Copy,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { ChatService } from "../services/chatService";
import VoiceService from "../services/voiceService";
import MvpService from "../services/mvpService";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const MODELS = [
  { id: "campus-rag", label: "Campus RAG", desc: "VIT knowledge base" },
  { id: "llama-3", label: "Llama 3.1", desc: "General purpose" },
  { id: "mistral", label: "Mistral 7B", desc: "Fast & efficient" },
];

const SUGGESTED_PROMPTS = [
  "What's my bunk budget this week?",
  "Summarize today's DSA topic",
  "Best restaurants near VIT?",
  "Help me write an email to professor",
  "What internships are open?",
  "Explain OS scheduling algorithms",
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    role: "assistant",
    content:
      "Hey Rahul! 👋 I'm your campus AI assistant. I'm connected to VIT's knowledge base and can help you with:\n\n• Attendance & bunk analysis\n• Assignment & exam prep\n• Campus info & faculty contacts\n• Internships & placement prep\n• General questions\n\nWhat can I help you with today?",
    timestamp: new Date(),
  },
];

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

const AI_RESPONSES: Record<string, string> = {
  default:
    "That's a great question! Based on your campus data, I can help you with that. Let me analyze the information from VIT's knowledge base...\n\nHere's what I found: Your current academic standing looks good with a CGPA of 8.7. Based on your attendance patterns, you're on track for this semester.",
  bunk: "📊 **Bunk Budget Analysis**\n\nHere's your safe bunk allocation for this week:\n\n• Data Structures — 2 bunks safe ✅\n• Operating Systems — 0 bunks (below 75%) ❌\n• Computer Networks — 3 bunks safe ✅\n• DBMS — 1 bunk safe ✅\n\n⚠️ Priority: Attend all OS classes this week to recover your attendance!",
  dsa: "📚 **Today's DSA Topic: Graph Algorithms**\n\nKey concepts from today's class:\n\n1. **BFS (Breadth-First Search)** — O(V+E) time, uses queue\n2. **DFS (Depth-First Search)** — O(V+E) time, uses stack/recursion\n3. **Dijkstra's Algorithm** — Shortest path for weighted graphs\n\n💡 Quick tip: Remember that BFS gives the shortest path in unweighted graphs, while Dijkstra works for weighted ones.",
  email:
    "Here's a professional email template:\n\n---\nSubject: Request for Doubt Clarification — [Topic]\n\nDear Prof. [Name],\n\nI hope you are doing well. I am [Your Name] from [Section], and I have a doubt regarding [specific topic] covered in the recent lecture.\n\n[State your doubt clearly here]\n\nI would be grateful if you could clarify this at your earliest convenience.\n\nWarm regards,\nRahul Sharma\n21BCE1234\n---",
};

function getAIResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("bunk") || lower.includes("attendance")) return AI_RESPONSES.bunk;
  if (lower.includes("dsa") || lower.includes("data structure")) return AI_RESPONSES.dsa;
  if (lower.includes("email") || lower.includes("professor")) return AI_RESPONSES.email;
  return AI_RESPONSES.default;
}

export function Chat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [voiceFeedback, setVoiceFeedback] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);
    
    // Initialize session
    MvpService.ensureSession().catch(() => {
      console.warn("Failed to initialize demo session");
    });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = async (text?: string) => {
    const content = text || input.trim();
    if (!content) return;
    
    setInput("");
    setError(null);
    setIsLoading(true);

    const userMsg: Message = {
      id: Date.now(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    let responseText = "";
    try {
      for await (const token of ChatService.streamHomeworkHelp(content, "General")) {
        responseText += token;
      }
      if (!responseText.trim()) responseText = getAIResponse(content);
    } catch (err) {
      console.error("Chat error:", err);
      responseText = getAIResponse(content);
      setError("Could not connect to AI. Using fallback response.");
    } finally {
      setIsLoading(false);
    }
    
    const aiMsg: Message = {
      id: Date.now() + 1,
      role: "assistant",
      content: responseText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, aiMsg]);
    setIsTyping(false);
  };

  const runVoiceCommand = async (text?: string) => {
    const voiceText = text || input.trim();
    if (!voiceText) return;
    
    setIsLoading(true);
    setError(null);
    setVoiceFeedback("Processing voice command...");
    
    try {
      const parsed = await VoiceService.executeCommand(voiceText);
      
      // Show feedback for the action
      if (parsed.action !== "unknown" && parsed.action !== "chat") {
        setVoiceFeedback(parsed.response);
      }
      
      const aiMsg: Message = {
        id: Date.now() + 10,
        role: "assistant",
        content: `Voice action: ${parsed.action}\n${parsed.response}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setInput("");

      if (parsed.action && parsed.action !== "unknown" && parsed.action !== "chat") {
        setTimeout(() => {
          setVoiceFeedback(null);
          let path = `/${parsed.action}`;
          // Map action names to actual routes
          const routeMap: Record<string, string> = {
            "home": "/",
            "jobs": "/jobs",
            "attendance": "/attendance",
            "schedule": "/schedule",
            "finance": "/finance",
            "assignments": "/assignments",
            "travel": "/travel",
            "placement": "/placement",
            "more": "/more",
          };
          navigate(routeMap[parsed.action] || path);
        }, 1500);
      } else {
        setVoiceFeedback(null);
      }
    } catch (err) {
      console.error("Voice command error:", err);
      setError("Failed to execute voice command. Please try again.");
      setVoiceFeedback(null);
      // Still show the voice text as a regular message
      if (voiceText) {
        sendMessage(voiceText);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser. Please type your command.");
      return;
    }
    
    if (isRecording) {
      return; // Already recording
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
      setError(null);
    };

    recognition.onerror = (event: any) => {
      setIsRecording(false);
      setError(`Speech recognition error: ${event.error || 'Unknown error'}`);
      console.error("Speech recognition error:", event.error);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.onresult = async (event: any) => {
      const speechToText = event.results[0][0].transcript;
      setInput(speechToText);
      setIsRecording(false);
      
      // Small delay to show the transcribed text
      setTimeout(() => {
        runVoiceCommand(speechToText);
      }, 300);
    };
    
    try {
      recognition.start();
    } catch (err) {
      setIsRecording(false);
      setError("Failed to start speech recognition. Please check microphone permissions.");
      console.error("Failed to start speech recognition:", err);
    }
  };

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const showSuggestions = messages.length <= 1;

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: "#050e1d" }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between shrink-0"
        style={{ background: "#070f20", borderBottom: "1px solid #1e3561" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #1d4ed8, #6d28d9)" }}
          >
            <Bot size={18} style={{ color: "#fff" }} />
          </div>
          <div>
            <p className="text-sm" style={{ color: "#e8f0fe" }}>
              Campus AI
            </p>
            <div className="flex items-center gap-1">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#22c55e" }}
              />
              <p className="text-[10px]" style={{ color: "#22c55e" }}>
                Online · Local RAG
              </p>
            </div>
          </div>
        </div>

        {/* Model selector */}
        <div className="relative">
          <button
            onClick={() => setShowModelMenu(!showModelMenu)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg"
            style={{ background: "#0d1f3c", border: "1px solid #1e3561" }}
          >
            <Sparkles size={11} style={{ color: "#3b82f6" }} />
            <span className="text-[11px]" style={{ color: "#e8f0fe" }}>
              {selectedModel.label}
            </span>
            <ChevronDown size={10} style={{ color: "#6b8cad" }} />
          </button>

          {showModelMenu && (
            <div
              className="absolute right-0 top-8 rounded-xl overflow-hidden z-50 w-44"
              style={{
                background: "#0a1628",
                border: "1px solid #1e3561",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              }}
            >
              {MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model);
                    setShowModelMenu(false);
                  }}
                  className="w-full flex items-start gap-2 px-3 py-2.5 text-left"
                  style={{
                    background:
                      selectedModel.id === model.id
                        ? "rgba(59,130,246,0.15)"
                        : "transparent",
                  }}
                >
                  <div className="flex-1">
                    <p className="text-xs" style={{ color: "#e8f0fe" }}>
                      {model.label}
                    </p>
                    <p className="text-[10px]" style={{ color: "#6b8cad" }}>
                      {model.desc}
                    </p>
                  </div>
                  {selectedModel.id === model.id && (
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1"
                      style={{ background: "#3b82f6" }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Voice feedback */}
        {voiceFeedback && (
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "#101e2e", border: "1px solid #2563eb" }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "#2563eb" }}>
              <Mic size={14} style={{ color: "#fff" }} />
            </div>
            <p className="text-sm" style={{ color: "#93c5fd" }}>{voiceFeedback}</p>
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "#1e1b12", border: "1px solid #4a3c1a" }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "#f59e0b" }}>
              <span className="text-xs" style={{ color: "#fff" }}>!</span>
            </div>
            <p className="text-sm" style={{ color: "#fbbf24" }}>{error}</p>
            <button onClick={() => setError(null)} className="text-xs" style={{ color: "#92400e" }}>
              Dismiss
            </button>
          </div>
        )}
        
        {/* Loading indicator */}
        {isLoading && messages.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: "#3b82f6",
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
              <span className="text-sm" style={{ color: "#6b8cad" }}>Initializing...</span>
            </div>
          </div>
        )}
        
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {/* Avatar */}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1"
              style={{
                background:
                  msg.role === "assistant"
                    ? "linear-gradient(135deg, #1d4ed8, #6d28d9)"
                    : "#1e3a6e",
              }}
            >
              {msg.role === "assistant" ? (
                <Bot size={13} style={{ color: "#fff" }} />
              ) : (
                <User size={13} style={{ color: "#60a5fa" }} />
              )}
            </div>

            <div
              className={`max-w-[78%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}
            >
              <div
                className="px-3 py-2.5 rounded-2xl"
                style={{
                  background:
                    msg.role === "user"
                      ? "linear-gradient(135deg, #1d4ed8, #1e40af)"
                      : "#0d1f3c",
                  border:
                    msg.role === "user" ? "none" : "1px solid #1e3561",
                  borderTopRightRadius: msg.role === "user" ? 4 : 16,
                  borderTopLeftRadius: msg.role === "assistant" ? 4 : 16,
                }}
              >
                {msg.content.split("\n").map((line, i) => {
                  const bold = line.replace(/\*\*(.*?)\*\*/g, "$1");
                  return (
                    <p
                      key={i}
                      className="text-sm"
                      style={{
                        color: msg.role === "user" ? "#fff" : "#d1e0ff",
                        marginBottom: i < msg.content.split("\n").length - 1 ? 2 : 0,
                      }}
                    >
                      {bold || "\u00A0"}
                    </p>
                  );
                })}
              </div>

              {/* Actions for assistant */}
              {msg.role === "assistant" && (
                <div className="flex items-center gap-2 pl-1">
                  <p className="text-[10px]" style={{ color: "#4a6585" }}>
                    {formatTime(msg.timestamp)}
                  </p>
                  <button onClick={() => handleCopy(msg.id, msg.content)}>
                    <Copy
                      size={11}
                      style={{ color: copiedId === msg.id ? "#22c55e" : "#4a6585" }}
                    />
                  </button>
                  <button>
                    <ThumbsUp size={11} style={{ color: "#4a6585" }} />
                  </button>
                  <button>
                    <ThumbsDown size={11} style={{ color: "#4a6585" }} />
                  </button>
                  <button>
                    <RotateCcw size={11} style={{ color: "#4a6585" }} />
                  </button>
                </div>
              )}
              {msg.role === "user" && (
                <p className="text-[10px] pr-1" style={{ color: "#4a6585" }}>
                  {formatTime(msg.timestamp)}
                </p>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-2 items-start">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #1d4ed8, #6d28d9)" }}
            >
              <Bot size={13} style={{ color: "#fff" }} />
            </div>
            <div
              className="px-3 py-3 rounded-2xl flex items-center gap-1"
              style={{ background: "#0d1f3c", border: "1px solid #1e3561", borderTopLeftRadius: 4 }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: "#3b82f6",
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Suggested prompts */}
        {showSuggestions && (
          <div>
            <p className="text-xs mb-2" style={{ color: "#4a6585" }}>
              Try asking...
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="px-3 py-1.5 rounded-full text-xs transition-all active:scale-95"
                  style={{
                    background: "#0d1f3c",
                    border: "1px solid #1e3561",
                    color: "#8ba3c7",
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div
        className="px-4 py-3 shrink-0"
        style={{ background: "#070f20", borderTop: "1px solid #1e3561" }}
      >
        <div
          className="flex items-end gap-2 rounded-2xl px-3 py-2"
          style={{ background: "#0d1f3c", border: "1px solid #1e3561" }}
        >
          <button className="p-1">
            <Paperclip size={18} style={{ color: "#4a6585" }} />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Message Campus AI..."
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-sm py-1"
            style={{ color: "#e8f0fe", maxHeight: 100 }}
          />
          <button 
            className="p-1 relative" 
            onClick={startSpeechRecognition}
            disabled={isLoading || isRecording}
            title={!speechSupported ? "Speech recognition not supported" : isLoading ? "Please wait..." : "Click to speak"}
          >
            {isRecording && (
              <span className="absolute inset-0 rounded-full animate-ping bg-red-500 opacity-40" />
            )}
            <Mic size={18} style={{ 
              color: isRecording ? "#ef4444" : !speechSupported ? "#374151" : isLoading ? "#6b7280" : "#4a6585" 
            }} />
          </button>
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-95"
            style={{
              background: input.trim() && !isLoading ? "#3b82f6" : "#1e3561",
            }}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={14} style={{ color: input.trim() && !isLoading ? "#fff" : "#4a6585" }} />
            )}
          </button>
        </div>
        <p className="text-center text-[9px] mt-1.5" style={{ color: "#2a4060" }}>
          Campus AI · {selectedModel.label} · Responses may be inaccurate
        </p>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
