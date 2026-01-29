'use client';

import { useState, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BarChart2, Save, Plus, Trash2, Target, TrendingUp, AlertCircle } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";

interface KPI {
    metric: string;
    current_value: string;
    target_value: string;
    timeframe: string;
    priority: string;
}

export default function KPIsPage() {
    const { currentProject, updateBrandIdentity } = useProject();
    const [kpis, setKpis] = useState<KPI[]>([]);
    const [data, setData] = useState<any>({
        benchmarks: '',
        growth_targets: '',
        optimization_priorities: '',
        ab_test_priorities: ''
    });

    useEffect(() => {
        if (currentProject?.brandIdentity?.kpis_optimization) {
            const kpiData = currentProject.brandIdentity.kpis_optimization;
            if (kpiData.success_metrics) {
                setKpis(kpiData.success_metrics);
            }
            setData({
                benchmarks: kpiData.benchmarks || '',
                growth_targets: kpiData.growth_targets || '',
                optimization_priorities: kpiData.optimization_priorities || '',
                ab_test_priorities: kpiData.ab_test_priorities || ''
            });
        }
    }, [currentProject]);

    const handleSave = () => {
        const brandIdentity = currentProject?.brandIdentity || {};
        updateBrandIdentity({
            ...brandIdentity,
            kpis_optimization: {
                success_metrics: kpis,
                ...data
            }
        });
        alert("KPIs & Optimization Logic Saved!");
    };

    const addKPI = () => {
        setKpis(prev => [
            ...prev,
            {
                metric: '',
                current_value: '',
                target_value: '',
                timeframe: '',
                priority: 'Medium'
            }
        ]);
    };

    const removeKPI = (index: number) => {
        setKpis(prev => prev.filter((_, i) => i !== index));
    };

    const updateKPI = (index: number, field: keyof KPI, value: string) => {
        setKpis(prev => prev.map((kpi, i) =>
            i === index ? { ...kpi, [field]: value } : kpi
        ));
    };

    const updateField = (field: string, value: string) => {
        setData((prev: any) => ({ ...prev, [field]: value }));
    };

    const getPriorityColor = (priority: string) => {
        const colors: { [key: string]: string } = {
            'High': 'bg-red-100 text-red-700 border-red-300',
            'Medium': 'bg-amber-100 text-amber-700 border-amber-300',
            'Low': 'bg-blue-100 text-blue-700 border-blue-300'
        };
        return colors[priority] || 'bg-gray-100 text-gray-700 border-gray-300';
    };

    return (
        <Shell>
            <div className="max-w-6xl mx-auto space-y-8 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-green-600 font-bold text-xs uppercase tracking-widest mb-2">
                            <BarChart2 className="w-3 h-3" /> Performance Metrics
                        </div>
                        <h1 className="text-3xl font-display font-bold">KPIs & Optimization Logic</h1>
                        <p className="text-muted-foreground">
                            AI uses these metrics to measure success and optimize campaigns.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={addKPI} variant="outline">
                            <Plus className="w-4 h-4 mr-2" /> Add KPI
                        </Button>
                        <Button onClick={handleSave}>
                            <Save className="w-4 h-4 mr-2" /> Save KPIs
                        </Button>
                    </div>
                </div>

                <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                        <p className="text-sm text-green-800">
                            <strong>KPIs = Feedback Loop:</strong> These metrics tell the AI what's working and what needs optimization. 
                            The AI will use these to make data-driven decisions.
                        </p>
                    </CardContent>
                </Card>

                {kpis.length === 0 && (
                    <Card className="border-dashed">
                        <CardContent className="p-12 text-center">
                            <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground mb-4">No KPIs defined yet</p>
                            <Button onClick={addKPI}>
                                <Plus className="w-4 h-4 mr-2" /> Add Your First KPI
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {kpis.map((kpi, index) => (
                    <Card key={index} className="border-2 border-green-100">
                        <CardHeader className="bg-gradient-to-r from-green-50 to-transparent border-b">
                            <div className="flex items-start justify-between">
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <Input
                                            value={kpi.metric}
                                            onChange={(e) => updateKPI(index, 'metric', e.target.value)}
                                            placeholder="Metric Name (e.g., 'Monthly Recurring Revenue', 'Conversion Rate')"
                                            className="font-semibold text-lg border-none shadow-none focus-visible:ring-0"
                                        />
                                        <Badge className={`${getPriorityColor(kpi.priority)} border`}>
                                            {kpi.priority}
                                        </Badge>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeKPI(index)}
                                >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                {/* Current Value */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Current Value</label>
                                    <Input
                                        value={kpi.current_value}
                                        onChange={(e) => updateKPI(index, 'current_value', e.target.value)}
                                        placeholder="e.g., $50k, 2.5%, 10k"
                                        className="bg-white"
                                    />
                                </div>

                                {/* Target Value */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Target Value</label>
                                    <Input
                                        value={kpi.target_value}
                                        onChange={(e) => updateKPI(index, 'target_value', e.target.value)}
                                        placeholder="e.g., $100k, 5%, 25k"
                                        className="bg-white"
                                    />
                                </div>

                                {/* Timeframe */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Timeframe</label>
                                    <Input
                                        value={kpi.timeframe}
                                        onChange={(e) => updateKPI(index, 'timeframe', e.target.value)}
                                        placeholder="e.g., Q2 2026, 90 days"
                                        className="bg-white"
                                    />
                                </div>

                                {/* Priority */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-muted-foreground uppercase">Priority</label>
                                    <select
                                        value={kpi.priority}
                                        onChange={(e) => updateKPI(index, 'priority', e.target.value)}
                                        className="w-full h-10 px-3 rounded-md border border-input bg-white text-sm"
                                    >
                                        <option value="High">🔴 High</option>
                                        <option value="Medium">🟡 Medium</option>
                                        <option value="Low">🔵 Low</option>
                                    </select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {kpis.length > 0 && (
                    <Card className="border-green-200 bg-green-50">
                        <CardContent className="p-4">
                            <p className="text-sm text-green-800">
                                <strong>✓ {kpis.length} KPI{kpis.length !== 1 ? 's' : ''} Tracked:</strong> AI will monitor these metrics and optimize campaigns accordingly.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Benchmarks */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-blue-600" />
                            Industry Benchmarks
                        </CardTitle>
                        <CardDescription>What are the industry standards for key metrics?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={data.benchmarks}
                            onChange={(e) => updateField('benchmarks', e.target.value)}
                            placeholder="e.g., 'Industry avg conversion rate: 3.2%', 'Top performers: 6-8%', 'Average CAC: $50', 'Industry LTV: $500'"
                            className="min-h-[120px]"
                        />
                    </CardContent>
                </Card>

                {/* Growth Targets */}
                <Card className="border-purple-200 bg-purple-50/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-purple-600" />
                            Growth Targets
                        </CardTitle>
                        <CardDescription>What are your specific growth goals?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={data.growth_targets}
                            onChange={(e) => updateField('growth_targets', e.target.value)}
                            placeholder="e.g., '30% revenue growth in 2026', 'Double email list to 100k by Q4', 'Increase ROAS from 3x to 5x'"
                            className="min-h-[120px] bg-white"
                        />
                    </CardContent>
                </Card>

                {/* Optimization Priorities */}
                <Card>
                    <CardHeader>
                        <CardTitle>Optimization Priorities</CardTitle>
                        <CardDescription>What should AI focus on optimizing first?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={data.optimization_priorities}
                            onChange={(e) => updateField('optimization_priorities', e.target.value)}
                            placeholder="e.g., '1. Reduce CAC by 20%, 2. Improve email open rates, 3. Increase average order value, 4. Reduce cart abandonment'"
                            className="min-h-[120px]"
                        />
                    </CardContent>
                </Card>

                {/* A/B Test Priorities */}
                <Card className="border-amber-200 bg-amber-50/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                            A/B Test Priorities
                        </CardTitle>
                        <CardDescription>What should AI A/B test to find winners?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={data.ab_test_priorities}
                            onChange={(e) => updateField('ab_test_priorities', e.target.value)}
                            placeholder="e.g., 'Test headlines (emotional vs rational)', 'Test CTA buttons (colors, copy)', 'Test pricing displays', 'Test email subject lines'"
                            className="min-h-[120px] bg-white"
                        />
                    </CardContent>
                </Card>
            </div>
        </Shell>
    );
}

