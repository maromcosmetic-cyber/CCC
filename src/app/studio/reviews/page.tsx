
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MessageSquare, Reply, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ConnectGooglePrompt } from "@/components/marketing/ConnectGooglePrompt";
import { ConnectFacebookPrompt } from "@/components/marketing/ConnectFacebookPrompt";

// Subcomponent for Review List to avoid duplication
const ReviewsList = ({
    provider,
    reviews,
    loading,
    status,
    onConnect,
    onReply
}: {
    provider: 'google' | 'facebook';
    reviews: any[];
    loading: boolean;
    status: 'connected' | 'disconnected';
    onConnect: () => void;
    onReply: (id: string, text: string) => Promise<void>;
}) => {
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");

    const handlePostReply = async (id: string) => {
        await onReply(id, replyText);
        setReplyingTo(null);
        setReplyText("");
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    if (status === 'disconnected') {
        return provider === 'google' ? <ConnectGooglePrompt onConnect={onConnect} /> : <ConnectFacebookPrompt onConnect={onConnect} />;
    }

    if (reviews.length === 0) return <div className="p-8 text-center text-muted-foreground">No reviews yet.</div>;

    return (
        <div className="grid gap-4 mt-4">
            {reviews.map((review) => (
                <Card key={review.id}>
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <Avatar>
                                    <AvatarFallback>{review.author[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle className="text-base">{review.author}</CardTitle>
                                    <div className="flex items-center gap-1 mt-1">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Star key={i} className={`h-4 w-4 ${i < review.starRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                                        ))}
                                        <span className="text-xs text-muted-foreground ml-2">
                                            {formatDistanceToNow(new Date(review.createTime), { addSuffix: true })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-muted-foreground">
                                {provider === 'google' ? (
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" alt="Google" className="h-6 w-6" />
                                ) : (
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg" alt="Facebook" className="h-6 w-6" />
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm">{review.comment}</p>

                        {review.reply && (
                            <div className="mt-4 bg-muted/50 p-4 rounded-lg border-l-4 border-blue-500">
                                <p className="text-xs font-bold text-blue-600 mb-1">Your Reply</p>
                                <p className="text-sm text-muted-foreground">{review.reply.comment}</p>
                            </div>
                        )}

                        {replyingTo === review.id && (
                            <div className="mt-4 space-y-2">
                                <Textarea
                                    placeholder="Write your reply..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                />
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={() => handlePostReply(review.id)}>Post Reply</Button>
                                    <Button size="sm" variant="ghost" onClick={() => setReplyingTo(null)}>Cancel</Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    {!review.reply && !replyingTo && (
                        <CardFooter>
                            <Button variant="outline" size="sm" onClick={() => setReplyingTo(review.id)}>
                                <Reply className="mr-2 h-4 w-4" />
                                Reply
                            </Button>
                        </CardFooter>
                    )}
                </Card>
            ))}
        </div>
    );
};

export default function ReviewsPage() {
    const router = useRouter();
    // Google State
    const [googleStatus, setGoogleStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
    const [googleReviews, setGoogleReviews] = useState<any[]>([]);

    // Facebook State
    const [facebookStatus, setFacebookStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
    const [facebookReviews, setFacebookReviews] = useState<any[]>([]);

    // Fetch Google
    const fetchGoogle = async () => {
        try {
            const res = await fetch('/api/marketing/reviews/google/list?check_status=true');
            const data = await res.json();
            if (data.connected === false) {
                setGoogleStatus('disconnected');
            } else {
                setGoogleStatus('connected');
                setGoogleReviews(data.reviews || []);
            }
        } catch {
            setGoogleStatus('disconnected');
        }
    };

    // Fetch Facebook
    const fetchFacebook = async () => {
        try {
            const res = await fetch('/api/marketing/reviews/facebook/list?check_status=true');
            const data = await res.json();
            if (data.connected === false) {
                setFacebookStatus('disconnected');
            } else {
                setFacebookStatus('connected');
                setFacebookReviews(data.reviews || []);
            }
        } catch {
            setFacebookStatus('disconnected');
        }
    };

    useEffect(() => {
        fetchGoogle();
        fetchFacebook();
    }, []);

    const handleConnectGoogle = () => {
        router.push('/settings/integrations');
    };

    const handleConnectFacebook = () => {
        router.push('/settings/integrations');
    };

    const handleReplyGoogle = async (id: string, text: string) => {
        const res = await fetch('/api/marketing/reviews/google/reply', {
            method: 'POST',
            body: JSON.stringify({ reviewId: id, reply: text })
        });
        if (res.ok) {
            toast.success("Reply posted!");
            setGoogleReviews(prev => prev.map(r => r.id === id ? { ...r, reply: { comment: text } } : r));
        }
    };

    const handleReplyFacebook = async (id: string, text: string) => {
        // Mock reply for Facebook
        toast.success("Reply posted!");
        setFacebookReviews(prev => prev.map(r => r.id === id ? { ...r, reply: { comment: text } } : r));
    };

    return (
        <Shell>
            <div className="space-y-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Reviews</h1>
                    <p className="text-muted-foreground">Manage your reputation across platforms.</p>
                </div>

                <Tabs defaultValue="google">
                    <TabsList>
                        <TabsTrigger value="google">Google Reviews</TabsTrigger>
                        <TabsTrigger value="facebook">Facebook Reviews</TabsTrigger>
                    </TabsList>
                    <TabsContent value="google" className="mt-6">
                        <ReviewsList
                            provider="google"
                            status={googleStatus === 'loading' ? 'disconnected' : googleStatus} // Handle loading visually in component if needed, but safe here
                            loading={googleStatus === 'loading'}
                            reviews={googleReviews}
                            onConnect={handleConnectGoogle}
                            onReply={handleReplyGoogle}
                        />
                    </TabsContent>
                    <TabsContent value="facebook" className="mt-6">
                        <ReviewsList
                            provider="facebook"
                            status={facebookStatus === 'loading' ? 'disconnected' : facebookStatus}
                            loading={facebookStatus === 'loading'}
                            reviews={facebookReviews}
                            onConnect={handleConnectFacebook}
                            onReply={handleReplyFacebook}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </Shell>
    );
}
