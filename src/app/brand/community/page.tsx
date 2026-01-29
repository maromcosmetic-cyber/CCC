'use client';

import { useState, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Users, Save, Heart, MessageCircle, Shield, Gift } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";

export default function CommunityPage() {
    const { currentProject, updateBrandIdentity } = useProject();
    const [data, setData] = useState<any>({
        customer_treatment_philosophy: '',
        problem_resolution_protocol: '',
        criticism_handling: '',
        loyalty_building_tactics: '',
        belonging_creation: '',
        community_values: '',
        customer_recognition: '',
        engagement_style: ''
    });

    useEffect(() => {
        if (currentProject?.brandIdentity?.community_model) {
            setData(currentProject.brandIdentity.community_model);
        }
    }, [currentProject]);

    const handleSave = () => {
        const brandIdentity = currentProject?.brandIdentity || {};
        updateBrandIdentity({ ...brandIdentity, community_model: data });
        alert("Community Model Saved!");
    };

    const updateField = (field: string, value: string) => {
        setData((prev: any) => ({ ...prev, [field]: value }));
    };

    return (
        <Shell>
            <div className="max-w-5xl mx-auto space-y-8 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-pink-600 font-bold text-xs uppercase tracking-widest mb-2">
                            <Users className="w-3 h-3" /> Community Model
                        </div>
                        <h1 className="text-3xl font-display font-bold">Community & Relationship Architecture</h1>
                        <p className="text-muted-foreground">
                            How you treat customers, build loyalty, and create belonging.
                        </p>
                    </div>
                    <Button onClick={handleSave}>
                        <Save className="w-4 h-4 mr-2" /> Save Model
                    </Button>
                </div>

                <Card className="bg-pink-50 border-pink-200">
                    <CardContent className="p-4">
                        <p className="text-sm text-pink-800">
                            <strong>Community = Retention:</strong> AI uses this to respond to customers, handle complaints, and build long-term relationships (chat, email, support).
                        </p>
                    </CardContent>
                </Card>

                {/* Customer Treatment Philosophy */}
                <Card className="border-pink-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Heart className="w-5 h-5 text-pink-600" />
                            Customer Treatment Philosophy
                        </CardTitle>
                        <CardDescription>How do you treat your customers? What's the underlying belief?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={data.customer_treatment_philosophy || ""}
                            onChange={(e) => updateField('customer_treatment_philosophy', e.target.value)}
                            placeholder="e.g., 'We treat customers like family', 'We see customers as partners', 'Every interaction should make them feel valued'"
                            className="min-h-[120px]"
                        />
                    </CardContent>
                </Card>

                {/* Problem Resolution */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-blue-600" />
                            Problem Resolution Protocol
                        </CardTitle>
                        <CardDescription>How do you respond when something goes wrong?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={data.problem_resolution_protocol || ""}
                            onChange={(e) => updateField('problem_resolution_protocol', e.target.value)}
                            placeholder="e.g., 'Respond within 2 hours', 'Always apologize first', 'Offer immediate refund + bonus', 'Turn complaints into opportunities'"
                            className="min-h-[120px]"
                        />
                    </CardContent>
                </Card>

                {/* Criticism Handling */}
                <Card className="border-amber-200 bg-amber-50/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageCircle className="w-5 h-5 text-amber-600" />
                            Criticism & Negative Feedback Handling
                        </CardTitle>
                        <CardDescription>How do you respond to criticism, bad reviews, or public complaints?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={data.criticism_handling || ""}
                            onChange={(e) => updateField('criticism_handling', e.target.value)}
                            placeholder="e.g., 'We never argue publicly', 'We take it offline immediately', 'We acknowledge, apologize, and fix it', 'We use criticism to improve'"
                            className="min-h-[120px] bg-white"
                        />
                    </CardContent>
                </Card>

                {/* Loyalty Building */}
                <Card className="border-purple-200">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Gift className="w-5 h-5 text-purple-600" />
                            Loyalty Building Tactics
                        </CardTitle>
                        <CardDescription>How do you turn buyers into repeat customers and advocates?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={data.loyalty_building_tactics || ""}
                            onChange={(e) => updateField('loyalty_building_tactics', e.target.value)}
                            placeholder="e.g., 'Surprise bonuses', 'VIP early access', 'Personal thank-you messages', 'Loyalty rewards program', 'Exclusive community'"
                            className="min-h-[120px]"
                        />
                    </CardContent>
                </Card>

                {/* Belonging Creation */}
                <Card>
                    <CardHeader>
                        <CardTitle>Sense of Belonging Creation</CardTitle>
                        <CardDescription>How do you make customers feel like they're part of something bigger?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={data.belonging_creation || ""}
                            onChange={(e) => updateField('belonging_creation', e.target.value)}
                            placeholder="e.g., 'Private Facebook group', 'Brand ambassador program', 'Customer success stories featured', 'Inside jokes and shared language'"
                            className="min-h-[120px]"
                        />
                    </CardContent>
                </Card>

                {/* Community Values */}
                <Card className="border-green-200 bg-green-50/30">
                    <CardHeader>
                        <CardTitle>Community Values & Culture</CardTitle>
                        <CardDescription>What values does your community embody?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={data.community_values || ""}
                            onChange={(e) => updateField('community_values', e.target.value)}
                            placeholder="e.g., 'Support over competition', 'Transparency over perfection', 'Growth mindset', 'Inclusivity'"
                            className="min-h-[100px] bg-white"
                        />
                    </CardContent>
                </Card>

                {/* Customer Recognition */}
                <Card>
                    <CardHeader>
                        <CardTitle>Customer Recognition & Celebration</CardTitle>
                        <CardDescription>How do you celebrate customer wins and milestones?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={data.customer_recognition || ""}
                            onChange={(e) => updateField('customer_recognition', e.target.value)}
                            placeholder="e.g., 'Feature customer wins on social media', 'Send personalized congratulations', 'Anniversary gifts', 'Customer of the month'"
                            className="min-h-[100px]"
                        />
                    </CardContent>
                </Card>

                {/* Engagement Style */}
                <Card>
                    <CardHeader>
                        <CardTitle>Engagement Style</CardTitle>
                        <CardDescription>How do you engage with your community day-to-day?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={data.engagement_style || ""}
                            onChange={(e) => updateField('engagement_style', e.target.value)}
                            placeholder="e.g., 'Reply to every comment', 'Ask for feedback regularly', 'Host live Q&As', 'Share behind-the-scenes content'"
                            className="min-h-[100px]"
                        />
                    </CardContent>
                </Card>
            </div>
        </Shell>
    );
}

