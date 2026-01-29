
"use client";

import { useState, useEffect } from "react";
import { Send, Bot, User, Sparkles, Paperclip, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProject } from "@/contexts/ProjectContext";

// Client-only time display to avoid hydration errors
function TimeDisplay({ timestamp }: { timestamp: Date }) {
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
    }, []);
    
    if (!mounted) {
        return <span className="text-[10px] text-muted-foreground mt-1 px-1 opacity-70">--:--</span>;
    }
    
    return (
        <span className="text-[10px] text-muted-foreground mt-1 px-1 opacity-70">
            {timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
        </span>
    );
}

type Message = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    attachments?: string[];
};

export default function DesignChatTool() {
    const { currentProject } = useProject();
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: "Hello! I'm your AI Design Assistant. I have access to all your project assets, products, and design tools. What would you like to create today?",
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;

        const newUserMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, newUserMessage]);
        setInputValue("");
        setIsTyping(true);

        // Simulate AI response
        setTimeout(() => {
            const botResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I'm analyzing your request. I can help design that for you. Would you like me to use the latest product images from your catalog?",
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botResponse]);
            setIsTyping(false);
        }, 1500);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-200px)] max-h-[800px] w-full max-w-5xl mx-auto gap-4">
            <div className="flex items-center gap-3 pb-2 border-b">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                    <Bot className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-foreground">AI Design Partner</h2>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
                        Online & Ready to Create
                    </p>
                </div>
            </div>

            <Card className="flex-1 overflow-hidden flex flex-col glass-card border-none shadow-sm bg-white/50 dark:bg-black/20">
                <CardContent className="flex-1 p-0 flex flex-col h-full">
                    <ScrollArea className="flex-1 p-6">
                        <div className="space-y-6">
                            {messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                                >
                                    <Avatar className={`w-10 h-10 border-2 ${msg.role === 'assistant' ? 'border-purple-200' : 'border-gray-200'}`}>
                                        <AvatarFallback className={msg.role === 'assistant' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}>
                                            {msg.role === 'assistant' ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div
                                            className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${msg.role === 'user'
                                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                                    : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                                }`}
                                        >
                                            {msg.content}
                                        </div>
                                        <TimeDisplay timestamp={msg.timestamp} />
                                    </div>
                                </div>
                            ))}

                            {isTyping && (
                                <div className="flex gap-4">
                                    <Avatar className="w-10 h-10 border-2 border-purple-200">
                                        <AvatarFallback className="bg-purple-100 text-purple-700">
                                            <Bot className="w-5 h-5" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                                        <span className="text-xs text-muted-foreground">Thinking...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    <div className="p-4 bg-white/80 backdrop-blur-sm border-t">
                        <div className="relative flex items-center gap-2 bg-gray-50 p-2 rounded-xl border focus-within:ring-2 focus-within:ring-purple-200 transition-all shadow-inner">
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-purple-600 hover:bg-purple-50">
                                <Paperclip className="w-5 h-5" />
                            </Button>
                            <Input
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Describe what you want to create..."
                                className="flex-1 border-none bg-transparent shadow-none focus-visible:ring-0 text-base py-6 placeholder:text-gray-400"
                            />
                            <Button
                                onClick={handleSendMessage}
                                size="icon"
                                className="bg-purple-600 hover:bg-purple-700 text-white shadow-md w-10 h-10 rounded-lg transition-transform active:scale-95"
                                disabled={!inputValue.trim() || isTyping}
                            >
                                <Send className="w-5 h-5" />
                            </Button>
                        </div>
                        <div className="flex justify-center mt-2 gap-4">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-500" /> Powered by Gemini
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
