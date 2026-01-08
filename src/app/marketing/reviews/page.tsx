"use client";

import { useEffect, useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Star, Loader2, Send, Sparkles, MessageSquare, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { starRatingToNumber } from "@/lib/integrations/google-business";

interface Review {
    reviewId: string;
    reviewer: {
        profilePhotoUrl?: string;
        displayName: string;
        isAnonymous: boolean;
    };
    starRating: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE';
    comment?: string;
    createTime: string;
    updateTime: string;
    reviewReply?: {
        comment: string;
        updateTime: string;
    };
    name: string;
}

export default function ReviewsPage() {
    const { currentProject } = useProject();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState("");
    const [generatingAI, setGeneratingAI] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (currentProject) {
            fetchReviews();
        }
    }, [currentProject]);

    const fetchReviews = async () => {
        if (!currentProject) return;

        setLoading(true);
        try {
            const response = await fetch(`/api/projects/${currentProject.id}/reviews`);

            if (!response.ok) {
                const error = await response.json();
                toast.error(error.error || 'Failed to fetch reviews');
                setReviews([]);
                return;
            }

            const data = await response.json();
            setReviews(data.reviews || []);
        } catch (error) {
            console.error('Error fetching reviews:', error);
            toast.error('Failed to load reviews');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateAIReply = async (review: Review) => {
        setGeneratingAI(true);
        try {
            const response = await fetch('/api/ai/generate-review-reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reviewText: review.comment || '',
                    starRating: starRatingToNumber(review.starRating),
                    businessName: currentProject?.name || 'our business',
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate AI reply');
            }

            const data = await response.json();
            setReplyText(data.suggestedReply);
            toast.success('AI reply generated!');
        } catch (error) {
            console.error('Error generating AI reply:', error);
            toast.error('Failed to generate AI response');
        } finally {
            setGeneratingAI(false);
        }
    };

    const handleSubmitReply = async (reviewName: string) => {
        if (!currentProject || !replyText.trim()) return;

        setSubmitting(true);
        try {
            const response = await fetch(`/api/projects/${currentProject.id}/reviews/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reviewName,
                    replyText: replyText.trim(),
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to post reply');
            }

            toast.success('Reply posted successfully!');
            setReplyingTo(null);
            setReplyText('');
            fetchReviews(); // Refresh to show the new reply
        } catch (error) {
            console.error('Error posting reply:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to post reply');
        } finally {
            setSubmitting(false);
        }
    };

    const renderStars = (rating: Review['starRating']) => {
        const numStars = starRatingToNumber(rating);
        return (
            <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`w-4 h-4 ${star <= numStars ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                            }`}
                    />
                ))}
            </div>
        );
    };

    if (!currentProject) {
        return (
            <Shell>
                <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Please select a project first</p>
                </div>
            </Shell>
        );
    }

    return (
        <Shell>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Google Reviews</h1>
                        <p className="text-muted-foreground">
                            Manage and respond to customer reviews from Google Business Profile
                        </p>
                    </div>
                    <Button onClick={fetchReviews} variant="outline" disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : reviews.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-lg font-medium mb-2">No Reviews Yet</h3>
                            <p className="text-muted-foreground mb-4">
                                Connect your Google Business Profile to see reviews here.
                            </p>
                            <Button onClick={() => window.location.href = '/settings/integrations'}>
                                Go to Settings
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {reviews.map((review) => (
                            <Card key={review.reviewId}>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex gap-3">
                                            {review.reviewer.profilePhotoUrl ? (
                                                <img
                                                    src={review.reviewer.profilePhotoUrl}
                                                    alt={review.reviewer.displayName}
                                                    className="w-10 h-10 rounded-full"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                                    <span className="text-sm font-medium text-gray-600">
                                                        {review.reviewer.displayName[0]?.toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-medium">{review.reviewer.displayName}</h3>
                                                    {renderStars(review.starRating)}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(review.createTime).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                        {review.reviewReply ? (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                Replied
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline">Pending</Badge>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {review.comment && (
                                        <p className="text-sm text-gray-700">{review.comment}</p>
                                    )}

                                    {review.reviewReply && (
                                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                                            <p className="text-xs font-medium text-blue-900 mb-1">Your Reply:</p>
                                            <p className="text-sm text-blue-800">{review.reviewReply.comment}</p>
                                            <p className="text-xs text-blue-600 mt-2">
                                                {new Date(review.reviewReply.updateTime).toLocaleDateString()}
                                            </p>
                                        </div>
                                    )}

                                    {!review.reviewReply && (
                                        <>
                                            {replyingTo === review.reviewId ? (
                                                <div className="space-y-3 border-t pt-4">
                                                    <div className="flex gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleGenerateAIReply(review)}
                                                            disabled={generatingAI}
                                                        >
                                                            {generatingAI ? (
                                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            ) : (
                                                                <Sparkles className="w-4 h-4 mr-2" />
                                                            )}
                                                            Generate AI Reply
                                                        </Button>
                                                    </div>
                                                    <Textarea
                                                        value={replyText}
                                                        onChange={(e) => setReplyText(e.target.value)}
                                                        placeholder="Write your reply..."
                                                        rows={4}
                                                        className="resize-none"
                                                    />
                                                    <div className="flex gap-2">
                                                        <Button
                                                            onClick={() => handleSubmitReply(review.name)}
                                                            disabled={!replyText.trim() || submitting}
                                                        >
                                                            {submitting ? (
                                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            ) : (
                                                                <Send className="w-4 h-4 mr-2" />
                                                            )}
                                                            Send Reply
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => {
                                                                setReplyingTo(null);
                                                                setReplyText('');
                                                            }}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setReplyingTo(review.reviewId)}
                                                >
                                                    <MessageSquare className="w-4 h-4 mr-2" />
                                                    Reply
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </Shell>
    );
}
