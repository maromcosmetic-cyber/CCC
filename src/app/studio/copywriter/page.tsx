"use client";

import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { Card } from "@/components/ui/card";
import { Send, Copy, PenTool, Bot, User as UserIcon, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { cn } from "@/lib/utils";

type Message = {
    role: 'user' | 'assistant';
    content: string;
};

export default function CopywriterPage() {
    const { currentProject } = useProject();
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Hello! I am the CCC Copyright Engine. What would you like to write today?' }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [documentContent, setDocumentContent] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
        const target = e.currentTarget;
        if (target.selectionStart !== target.selectionEnd) {
            setSelectionRange({ start: target.selectionStart, end: target.selectionEnd });
        } else {
            setSelectionRange(null);
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim() || !currentProject) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        // Determine Mode: 
        // 1. Edit Selection: If selection exists, replace it.
        // 2. Draft Mode: If document is empty, stream directly to editor.
        // 3. Chat Mode: Default, stream to chat bubble.

        const isEditing = !!selectionRange;
        const isDrafting = !selectionRange && !documentContent.trim();

        const targetSelection = selectionRange ? {
            start: selectionRange.start,
            end: selectionRange.end,
            text: documentContent.substring(selectionRange.start, selectionRange.end)
        } : null;

        // Clear selection UI immediately
        if (isEditing) setSelectionRange(null);

        try {
            const response = await fetch('/api/copywriter/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
                    projectId: currentProject.id,
                    document: documentContent,
                    selection: targetSelection
                })
            });

            if (!response.ok) throw new Error('Failed to fetch response');
            if (!response.body) return;

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let accumulatedResponse = "";

            // If NOT writing to editor, show placeholder in chat
            if (!isEditing && !isDrafting) {
                setMessages(prev => [...prev, { role: 'assistant', content: "" }]);
            }

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                accumulatedResponse += chunk;

                if (isEditing && targetSelection) {
                    // Direct Editor Stream (Replace Mode)
                    setDocumentContent(prev => {
                        const prefix = prev.substring(0, targetSelection.start);
                        const suffix = prev.substring(targetSelection.end);
                        return prefix + accumulatedResponse + suffix;
                    });
                } else if (isDrafting) {
                    // Direct Editor Stream (Draft/Append Mode)
                    // Since doc is empty, just set it
                    setDocumentContent(accumulatedResponse);
                } else {
                    // Chat Stream
                    setMessages(prev => {
                        const newMessages = [...prev];
                        newMessages[newMessages.length - 1] = { role: 'assistant', content: accumulatedResponse };
                        return newMessages;
                    });
                }
            }

        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsLoading(false);
            setSelectionRange(null);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(documentContent);
    };

    return (
        <Shell>
            <div className="flex flex-col h-[calc(100vh-140px)] gap-4 animate-in fade-in duration-500">
                <header className="flex items-center justify-between pb-4 border-b">
                    <div>
                        <h1 className="text-2xl font-display font-black tracking-tight">CCC Copyright Engine</h1>
                        <p className="text-sm text-muted-foreground">Collaborative writing with brand intelligence</p>
                    </div>
                </header>

                <div className="flex flex-1 gap-6 overflow-hidden">
                    {/* Chat Panel (Left) */}
                    <Card className="flex flex-col w-1/3 min-w-[320px] bg-white border-0 shadow-sm overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                            {messages.map((m, i) => (
                                <div key={i} className={cn(
                                    "flex gap-3 max-w-[90%]",
                                    m.role === 'user' ? "ml-auto flex-row-reverse" : ""
                                )}>
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                        m.role === 'assistant' ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"
                                    )}>
                                        {m.role === 'assistant' ? <Bot className="w-4 h-4" /> : <UserIcon className="w-4 h-4" />}
                                    </div>
                                    <div className={cn(
                                        "p-3 rounded-lg text-sm shadow-sm",
                                        m.role === 'user' ? "bg-blue-600 text-white" : "bg-white text-slate-800 border"
                                    )}>
                                        <div className="whitespace-pre-wrap">{m.content}</div>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                                    </div>
                                    <div className="p-3 rounded-lg bg-white border text-sm text-slate-500">
                                        Thinking...
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-4 bg-white border-t">
                            {selectionRange && (
                                <div className="mb-2 px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-md border border-purple-100 flex items-center justify-between animate-in slide-in-from-bottom-2">
                                    <span>✨ Editing selected text</span>
                                    <button onClick={() => setSelectionRange(null)} className="hover:text-purple-900">×</button>
                                </div>
                            )}
                            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2 items-end">
                                <Textarea
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder={selectionRange ? "Instructions for the selected text..." : "Ask for headlines, emails, or ideas... (Shift+Enter for new line)"}
                                    className="flex-1 min-h-[80px] resize-none"
                                    disabled={isLoading}
                                />
                                <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="mb-1">
                                    <Send className="w-4 h-4" />
                                </Button>
                            </form>
                        </div>
                    </Card>

                    {/* Editor Panel (Right) */}
                    <Card className="flex flex-col flex-1 bg-white border-0 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between p-3 border-b bg-slate-50">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <PenTool className="w-4 h-4 text-blue-600" />
                                <span>Live Document</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={copyToClipboard} className="h-8 text-slate-500 hover:text-blue-600">
                                <Copy className="w-4 h-4 mr-2" />
                                Copy
                            </Button>
                        </div>
                        <div className="flex-1 p-0">
                            <Textarea
                                value={documentContent}
                                onChange={(e) => setDocumentContent(e.target.value)}
                                onSelect={handleSelect}
                                placeholder="Draft content goes here... Ask the chat to write something or type here directly."
                                className="w-full h-full resize-none border-0 p-6 text-base leading-relaxed focus-visible:ring-0 shadow-none font-serif"
                            />
                        </div>
                        <div className="p-2 border-t bg-slate-50 text-xs text-center text-muted-foreground">
                            Use the chat to generate content, then refine it here.
                        </div>
                    </Card>
                </div>
            </div>
        </Shell>
    );
}
