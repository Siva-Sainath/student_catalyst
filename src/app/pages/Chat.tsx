import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  Send,
  Paperclip,
  Mic,
  MicOff,
  ChevronDown,
  Bot,
  User,
  Sparkles,
  RotateCcw,
  Copy,
  ThumbsUp,
  ThumbsDown,
  X,
  AlertCircle,
} from "lucide-react";
import { ChatService } from "../services/chatService";
import VoiceService from "../services/voiceService";
import MvpService from "../services/mvpService";
import { useBackendStatus } from "../hooks/useBackendStatus";
import { MAC_SERVER_URL } from "../config/environment";
import { useVoiceControlContext } from "../context/VoiceControlContext";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const MODELS = [
  { id: "hermes", label: "Hermes", desc: "Agentic · jobs & research", topic: "Career" },
  { id: "code", label: "Hermes Code", desc: "Coding & math · qwen2.5", topic: "Programming" },
  { id: "chat", label: "Fast chat", desc: "Mistral · quick answers", topic: "General" },
];

const SUGGESTED_PROMPTS = [
  "What's my bunk budget this week?",
  "Find me internships",
  "Explain Dijkstra's algorithm",
  "Help me write a resume",
  "What's today's schedule?",
  "Check my attendance",
];

const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    role: "assistant",
    content:
      "Hey! 👋 I'm your College Portal AI Assistant. I'm now fully powered by Hermes and can help you with:\n\n• 📊 Attendance & bunk budget analysis\n• 📝 Assignments & exam prep\n• 💼 Job search & internships\n• 🎓 Placement preparation\n• 💬 General questions & coding help\n\nTry clicking the microphone 🎤 or type your question!",
    timestamp: new Date(),
  },
];

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

const AI_RESPONSES: Record<string, string> = {
  default:
    "I'm your College Portal AI Assistant. I can help you with attendance, assignments, jobs, and more. What would you like to know?",
  bunk: "📊 **Bunk Budget Analysis**\n\nHere's your safe bunk allocation for this week:\n\n• Data Structures — 2 bunks safe ✅\n• Operating Systems — 0 bunks (below 75%) ❌\n• Computer Networks — 3 bunks safe ✅\n• DBMS — 1 bunk safe ✅\n\n⚠️ Priority: Attend all OS classes this week to recover your attendance!",
  dsa: "📚 **DSA Topic: Graph Algorithms**\n\nKey concepts:\n\n1. **BFS (Breadth-First Search)** — O(V+E) time, uses queue\n2. **DFS (Depth-First Search)** — O(V+E) time, uses stack/recursion\n3. **Dijkstra's Algorithm** — Shortest path for weighted graphs\n\n💡 Quick tip: BFS gives shortest path in unweighted graphs, Dijkstra works for weighted ones.",
  email:
    "Here's a professional email template:\n\n---\nSubject: Request for Doubt Clarification — [Topic]\n\nDear Prof. [Name],\n\nI hope you are doing well. I am [Your Name] from [Section], and I have a doubt regarding [specific topic] covered in the recent lecture.\n\n[State your doubt clearly here]\n\nI would be grateful if you could clarify this at your earliest convenience.\n\nWarm regards,\n[Your Name]\n[Your Roll Number]\n---",
  jobs: "💼 **Current Job Openings**\n\nHere are some internships you might be interested in:\n\n• Google - SWE Intern (₹80,000/month)\n• Microsoft - Research Intern (₹75,000/month)\n• Flipkart - Data Science Intern (₹60,000/month)\n\nWould you like me to find more specific opportunities?",
  attendance: "📋 **Your Attendance Summary**\n\n• Data Structures: 85% ✅\n• Operating Systems: 68% ⚠️\n• Computer Networks: 92% ✅\n• DBMS: 78% ✅\n\nOverall: 80.75% - Keep it up!",
};

function getAIResponse(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("bunk") || lower.includes("attendance")) return AI_RESPONSES.attendance;
  if (lower.includes("dsa") || lower.includes("data structure")) return AI_RESPONSES.dsa;
  if (lower.includes("email") || lower.includes("professor")) return AI_RESPONSES.email;
  if (lower.includes("job") || lower.includes("internship")) return AI_RESPONSES.jobs;
  return AI_RESPONSES.default;
}

export function Chat() {
  const navigate = useNavigate();
  const location = useLocation();
  const backend = useBackendStatus();
  const voice = useVoiceControlContext();
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
      await MvpService.ensureSession();
      const topic = (selectedModel as { topic?: string }).topic || "General";
      for await (const token of ChatService.streamHomeworkHelp(content, topic)) {
        responseText += token;
      }
      if (!responseText.trim()) {
        throw new Error("Empty response from server");
      }
    } catch (err) {
      console.error("Chat error:", err);
      responseText = getAIResponse(content);
      setError(
        backend.ok === false
          ? `Cannot reach backend at ${MAC_SERVER_URL}. Run: cd mac-backend && ./run.sh`
          : "Using offline fallback — check Ollama is running (ollama serve)"
      );
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

  const voiceBoot = useRef(false);
  useEffect(() => {
    const msg = (location.state as { voiceMessage?: string } | null)?.voiceMessage;
    if (msg && !voiceBoot.current) {
      voiceBoot.current = true;
      void sendMessage(msg);
    }
  }, [location.state]);

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const showSuggestions = messages.length <= 1;

  return (
    <div className="flex flex-col h-full bg-primary">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between shrink-0 bg-secondary border-b border-primary">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-primary">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm text-primary">
              Campus AI
            </p>
            <div className="flex items-center gap-1">
              <div
                className={`w-1.5 h-1.5 rounded-full ${backend.ok === false ? "bg-red-500" : backend.ok ? "bg-success-500" : "bg-amber-500"}`}
              />
              <p className={`text-[10px] ${backend.ok === false ? "text-red-400" : "text-success-500"}`}>
                {backend.ok === false
                  ? `Offline · ${backend.url}`
                  : backend.ok
                    ? `Connected · ${backend.detail}`
                    : "Connecting…"}
              </p>
            </div>
          </div>
        </div>

        {/* Model selector */}
        <div className="relative">
          <button
            onClick={() => setShowModelMenu(!showModelMenu)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-tertiary border border-primary"
          >
            <Sparkles size={11} className="text-primary" />
            <span className="text-[11px] text-primary">
              {selectedModel.label}
            </span>
            <ChevronDown size={10} className="text-secondary" />
          </button>

          {showModelMenu && (
            <div className="absolute right-0 top-8 rounded-xl overflow-hidden z-50 w-44 bg-secondary border border-primary shadow-lg">
              {MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model);
                    setShowModelMenu(false);
                  }}
                  className={`w-full flex items-start gap-2 px-3 py-2.5 text-left ${selectedModel.id === model.id ? 'bg-primary/10' : 'hover:bg-hover'}`}
                >
                  <div className="flex-1">
                    <p className="text-xs text-primary">
                      {model.label}
                    </p>
                    <p className="text-[10px] text-secondary">
                      {model.desc}
                    </p>
                  </div>
                  {selectedModel.id === model.id && (
                    <div className="w-1.5 h-1.5 rounded-full mt-1 bg-primary" />
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
        {voice.listening && voice.status && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/30 border border-primary-600">
            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-primary-600">
              <Mic size={14} className="text-white" />
            </div>
            <p className="text-sm text-primary-400">{voice.status}</p>
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-warning-900/20 border border-warning-500">
            <AlertCircle size={16} className="text-warning" />
            <p className="text-sm text-warning-400">{error}</p>
            <button onClick={() => setError(null)} className="text-xs text-warning-400">
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
                  className="w-2 h-2 rounded-full bg-primary"
                  style={{
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
              <span className="text-sm text-secondary">Initializing...</span>
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
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === "assistant" ? "bg-gradient-primary" : "bg-primary-900"}`}
            >
              {msg.role === "assistant" ? (
                <Bot size={13} className="text-white" />
              ) : (
                <User size={13} className="text-primary-400" />
              )}
            </div>

            <div
              className={`max-w-[78%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}
            >
              <div
                className={`px-3 py-2.5 rounded-2xl ${msg.role === "user" ? "bg-gradient-primary border-none" : "bg-tertiary border border-primary"}`}
                style={{
                  borderTopRightRadius: msg.role === "user" ? 4 : 16,
                  borderTopLeftRadius: msg.role === "assistant" ? 4 : 16,
                }}
              >
                {msg.content.split("\n").map((line, i) => {
                  const bold = line.replace(/\*\*(.*?)\*\*/g, "$1");
                  return (
                    <p
                      key={i}
                      className={`text-sm ${msg.role === "user" ? "text-white" : "text-primary-300"}`}
                      style={{
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
                  <p className="text-[10px] text-secondary">
                    {formatTime(msg.timestamp)}
                  </p>
                  <button onClick={() => handleCopy(msg.id, msg.content)}>
                    <Copy
                      size={11}
                      className={copiedId === msg.id ? "text-success-500" : "text-secondary"}
                    />
                  </button>
                  <button>
                    <ThumbsUp size={11} className="text-secondary" />
                  </button>
                  <button>
                    <ThumbsDown size={11} className="text-secondary" />
                  </button>
                  <button>
                    <RotateCcw size={11} className="text-secondary" />
                  </button>
                </div>
              )}
              {msg.role === "user" && (
                <p className="text-[10px] pr-1 text-secondary">
                  {formatTime(msg.timestamp)}
                </p>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-2 items-start">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 bg-gradient-primary">
              <Bot size={13} className="text-white" />
            </div>
            <div className="px-3 py-3 rounded-2xl flex items-center gap-1 bg-tertiary border border-primary" style={{ borderTopLeftRadius: 4 }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-primary"
                  style={{
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
            <p className="text-xs mb-2 text-secondary">
              Try asking...
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="px-3 py-1.5 rounded-full text-xs transition-all active:scale-95 bg-tertiary border border-primary text-secondary"
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
      <div className="px-4 py-3 shrink-0 bg-secondary border-t border-primary">
        <div className="flex items-end gap-2 rounded-2xl px-3 py-2 bg-tertiary border border-primary">
          <button className="p-1">
            <Paperclip size={18} className="text-secondary" />
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
            className="flex-1 bg-transparent resize-none outline-none text-sm py-1 text-primary"
            style={{ maxHeight: 100 }}
          />
          <button 
            className="p-1 relative"
            onClick={voice.toggleListen}
            disabled={isLoading}
            title={!voice.supported ? "Speech recognition requires a secure context (e.g. localhost or HTTPS)." : voice.listening ? "Stop listening" : "Voice command (same as floating mic)"}
          >
            {voice.listening && (
              <span className="absolute inset-0 rounded-full animate-ping bg-blue-500 opacity-40" />
            )}
            {voice.listening ? (
              <MicOff size={18} className="text-danger" />
            ) : !voice.supported ? (
              <Mic size={18} className="text-muted" />
            ) : (
              <Mic size={18} className={isLoading ? "text-muted" : "text-primary"} />
            )}
          </button>
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-95"
            style={{
              background: input.trim() && !isLoading ? "var(--primary-600)" : "var(--border-primary)",
            }}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={14} className={input.trim() && !isLoading ? "text-white" : "text-secondary"} />
            )}
          </button>
        </div>
        <p className="text-center text-[9px] mt-1.5 text-muted">
          Campus AI · {selectedModel.label} · Powered by Hermes
        </p>
      </div>
    </div>
  );
}
