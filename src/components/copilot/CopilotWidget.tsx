'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Bot, X, Send, MessageSquare, Loader2, Sparkles } from "lucide-react";
import { usePathname, useRouter } from 'next/navigation';
import { useProject } from '@/contexts/ProjectContext';
import { cn } from "@/lib/utils";

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export function CopilotWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Hi! I am your AI Copilot. How can I help you today?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const pathname = usePathname();
    const router = useRouter();
    const { currentProject } = useProject();

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = { role: 'user' as const, content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const context = {
                pathname,
                projectId: currentProject?.id,
                projectName: currentProject?.name,
            };

            const res = await fetch('/api/copilot/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage], // Send history
                    context
                })
            });

            const data = await res.json();

            if (data.error) throw new Error(data.error);

            // Handle Action
            if (data.action && data.action.type === 'NAVIGATE') {
                router.push(data.action.payload);
            }

            setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);

        } catch (error) {
            console.error('Copilot Error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
            {isOpen && (
                <Card className="w-[350px] h-[500px] shadow-2xl animate-in slide-in-from-bottom-5 duration-300 flex flex-col overflow-hidden border-2 border-primary/20">
                    <CardHeader className="bg-primary/5 p-4 flex flex-row items-center justify-between sticky top-0 bg-background/95 backdrop-blur z-10 border-b">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Bot className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-sm font-bold">AI Copilot</CardTitle>
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-amber-400" />
                                    Active Context: {pathname}
                                </p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </CardHeader>

                    <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
                        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((m, i) => (
                                <div key={i} className={cn("flex w-full", m.role === 'user' ? "justify-end" : "justify-start")}>
                                    <div className={cn(
                                        "max-w-[80%] rounded-lg p-3 text-sm",
                                        m.role === 'user'
                                            ? "bg-primary text-primary-foreground rounded-br-none"
                                            : "bg-muted text-muted-foreground rounded-bl-none"
                                    )}>
                                        {m.content}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-muted rounded-lg p-3 rounded-bl-none flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-foreground/30 rounded-full animate-bounce" />
                                        <span className="w-1.5 h-1.5 bg-foreground/30 rounded-full animate-bounce delay-100" />
                                        <span className="w-1.5 h-1.5 bg-foreground/30 rounded-full animate-bounce delay-200" />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-3 border-t bg-background">
                            <form
                                className="flex gap-2"
                                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                            >
                                <Input
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    placeholder="Ask anything..."
                                    className="flex-1"
                                />
                                <Button type="submit" size="icon" disabled={isLoading}>
                                    <Send className="w-4 h-4" />
                                </Button>
                            </form>
                        </div>
                    </CardContent>
                </Card>
            )}

            {!isOpen && (
                <Button
                    onClick={() => setIsOpen(true)}
                    className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all duration-300 hover:scale-105"
                >
                    <Bot className="w-8 h-8" />
                </Button>
            )}
        </div>
    );
}
