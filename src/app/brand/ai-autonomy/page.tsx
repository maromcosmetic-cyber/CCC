'use client';

import { useState, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Zap, Save, Plus, Trash2, ShieldAlert, AlertTriangle, Lock, Unlock } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";

export default function AIAutonomyPage() {
    const { currentProject, updateBrandIdentity } = useProject();
    const [data, setData] = useState<any>({
        ai_can_decide_alone: [],
        requires_approval: [],
        escalation_logic: '',
        risk_thresholds: '',
        spending_limits: {
            ad_spend_per_campaign: '',
            max_daily_budget: '',
            requires_approval_above: ''
        },
        forbidden_actions: []
    });

    useEffect(() => {
        if (currentProject?.brandIdentity?.ai_autonomy_rules) {
            setData(currentProject.brandIdentity.ai_autonomy_rules);
        }
    }, [currentProject]);

    const handleSave = () => {
        const brandIdentity = currentProject?.brandIdentity || {};
        updateBrandIdentity({ ...brandIdentity, ai_autonomy_rules: data });
        alert("AI Autonomy Rules Saved!");
    };

    const updateField = (field: string, value: any) => {
        setData((prev: any) => ({ ...prev, [field]: value }));
    };

    const updateNestedField = (parent: string, field: string, value: any) => {
        setData((prev: any) => ({
            ...prev,
            [parent]: { ...(prev[parent] || {}), [field]: value }
        }));
    };

    const addToArray = (field: string) => {
        setData((prev: any) => ({
            ...prev,
            [field]: [...(prev[field] || []), '']
        }));
    };

    const updateArrayItem = (field: string, index: number, value: string) => {
        setData((prev: any) => ({
            ...prev,
            [field]: prev[field].map((item: string, i: number) => i === index ? value : item)
        }));
    };

    const removeFromArray = (field: string, index: number) => {
        setData((prev: any) => ({
            ...prev,
            [field]: prev[field].filter((_: any, i: number) => i !== index)
        }));
    };

    return (
        <Shell>
            <div className="max-w-6xl mx-auto space-y-8 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-red-600 font-bold text-xs uppercase tracking-widest mb-2">
                            <Zap className="w-3 h-3" /> AI Control Layer
                        </div>
                        <h1 className="text-3xl font-display font-bold">AI Autonomy Rules & Human Control</h1>
                        <p className="text-muted-foreground">
                            Define what AI can decide independently vs. what requires human approval.
                        </p>
                    </div>
                    <Button onClick={handleSave}>
                        <Save className="w-4 h-4 mr-2" /> Save Rules
                    </Button>
                </div>

                <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-4 flex items-start gap-3">
                        <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm text-red-800 font-semibold mb-1">CRITICAL: Brand Protection Layer</p>
                            <p className="text-xs text-red-700">
                                These rules prevent AI from making risky decisions, overspending, or acting outside your brand boundaries.
                                This is your safety system.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* AI Can Decide Alone */}
                <Card className="border-green-200 bg-green-50/30">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Unlock className="w-5 h-5 text-green-600" />
                                    AI Can Decide Alone (Full Autonomy)
                                </CardTitle>
                                <CardDescription>Actions AI is trusted to execute without approval</CardDescription>
                            </div>
                            <Button onClick={() => addToArray('ai_can_decide_alone')} size="sm" variant="outline">
                                <Plus className="w-4 h-4 mr-2" /> Add Permission
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(data.ai_can_decide_alone || []).map((action: string, index: number) => (
                            <div key={index} className="flex gap-2">
                                <Input
                                    value={action}
                                    onChange={(e) => updateArrayItem('ai_can_decide_alone', index, e.target.value)}
                                    placeholder="e.g., Generate social posts, Schedule content, Reply to comments, A/B test headlines"
                                    className="bg-white"
                                />
                                <Button variant="ghost" size="icon" onClick={() => removeFromArray('ai_can_decide_alone', index)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        ))}
                        {data.ai_can_decide_alone.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">No autonomous permissions defined</p>
                        )}
                    </CardContent>
                </Card>

                {/* Requires Approval */}
                <Card className="border-amber-200 bg-amber-50/30">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-amber-600" />
                                    Requires Human Approval
                                </CardTitle>
                                <CardDescription>Actions that must be reviewed before execution</CardDescription>
                            </div>
                            <Button onClick={() => addToArray('requires_approval')} size="sm" variant="outline">
                                <Plus className="w-4 h-4 mr-2" /> Add Restriction
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(data.requires_approval || []).map((action: string, index: number) => (
                            <div key={index} className="flex gap-2">
                                <Input
                                    value={action}
                                    onChange={(e) => updateArrayItem('requires_approval', index, e.target.value)}
                                    placeholder="e.g., Launch ads, Send emails to full list, Make pricing changes, Publish long-form content"
                                    className="bg-white"
                                />
                                <Button variant="ghost" size="icon" onClick={() => removeFromArray('requires_approval', index)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        ))}
                        {data.requires_approval.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">No approval requirements defined</p>
                        )}
                    </CardContent>
                </Card>

                {/* Forbidden Actions */}
                <Card className="border-red-200 bg-red-50/30">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-red-600" />
                                    Forbidden Actions (Never Allowed)
                                </CardTitle>
                                <CardDescription>Actions AI is strictly prohibited from taking</CardDescription>
                            </div>
                            <Button onClick={() => addToArray('forbidden_actions')} size="sm" variant="outline">
                                <Plus className="w-4 h-4 mr-2" /> Add Restriction
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {(data.forbidden_actions || []).map((action: string, index: number) => (
                            <div key={index} className="flex gap-2">
                                <Input
                                    value={action}
                                    onChange={(e) => updateArrayItem('forbidden_actions', index, e.target.value)}
                                    placeholder="e.g., Delete customer data, Make legal claims, Offer discounts over 30%, Change brand voice"
                                    className="bg-white"
                                />
                                <Button variant="ghost" size="icon" onClick={() => removeFromArray('forbidden_actions', index)}>
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Spending Limits */}
                <Card className="border-purple-200">
                    <CardHeader>
                        <CardTitle>Spending Limits & Budget Control</CardTitle>
                        <CardDescription>Financial guardrails for AI-managed campaigns</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground uppercase">Ad Spend Per Campaign</label>
                                <Input
                                    value={data.spending_limits?.ad_spend_per_campaign || ""}
                                    onChange={(e) => updateNestedField('spending_limits', 'ad_spend_per_campaign', e.target.value)}
                                    placeholder="e.g., $500 max"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground uppercase">Max Daily Budget</label>
                                <Input
                                    value={data.spending_limits?.max_daily_budget || ""}
                                    onChange={(e) => updateNestedField('spending_limits', 'max_daily_budget', e.target.value)}
                                    placeholder="e.g., $100/day"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground uppercase">Requires Approval Above</label>
                                <Input
                                    value={data.spending_limits?.requires_approval_above || ""}
                                    onChange={(e) => updateNestedField('spending_limits', 'requires_approval_above', e.target.value)}
                                    placeholder="e.g., $1000"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Risk Thresholds */}
                <Card>
                    <CardHeader>
                        <CardTitle>Risk Thresholds & Escalation Logic</CardTitle>
                        <CardDescription>When should AI escalate to human review?</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase">Risk Thresholds</label>
                            <Textarea
                                value={data.risk_thresholds || ""}
                                onChange={(e) => updateField('risk_thresholds', e.target.value)}
                                placeholder="e.g., If engagement drops 50%, stop campaign. If cost-per-click exceeds $5, pause and alert."
                                className="min-h-[100px]"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground uppercase">Escalation Logic</label>
                            <Textarea
                                value={data.escalation_logic || ""}
                                onChange={(e) => updateField('escalation_logic', e.target.value)}
                                placeholder="e.g., If ad gets flagged, pause immediately and notify. If negative sentiment detected, alert before responding."
                                className="min-h-[100px]"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Human Override */}
                <Card className="border-blue-200 bg-blue-50/30">
                    <CardHeader>
                        <CardTitle>Human Override Rules</CardTitle>
                        <CardDescription>How can humans step in and take control?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={data.human_override_rules || ""}
                            onChange={(e) => updateField('human_override_rules', e.target.value)}
                            placeholder="e.g., Humans can pause any AI action instantly. All AI decisions are logged and reversible. Emergency stop button available."
                            className="min-h-[100px]"
                        />
                    </CardContent>
                </Card>

                {/* Performance Review Triggers */}
                <Card>
                    <CardHeader>
                        <CardTitle>Performance Review Triggers</CardTitle>
                        <CardDescription>When should AI performance be reviewed?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={data.review_triggers || ""}
                            onChange={(e) => updateField('review_triggers', e.target.value)}
                            placeholder="e.g., Weekly review of all AI-generated campaigns. Monthly audit of spending. Alert if conversion rate drops below 2%."
                            className="min-h-[100px]"
                        />
                    </CardContent>
                </Card>
            </div>
        </Shell>
    );
}

