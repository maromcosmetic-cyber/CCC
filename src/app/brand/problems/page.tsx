'use client';

import { useState, useEffect } from "react";
import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Save, Plus, Trash2 } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";

interface Problem {
    id: string;
    problem: string;
    type: 'physical' | 'emotional' | 'social' | 'financial' | 'time' | 'identity';
    emotional_intensity: number;
    caused_by: string;
    why_persists: string;
    why_solutions_fail: string;
    how_feels: string;
    cost_if_unsolved: string;
}

const emptyProblem: Problem = {
    id: '',
    problem: '',
    type: 'emotional',
    emotional_intensity: 5,
    caused_by: '',
    why_persists: '',
    why_solutions_fail: '',
    how_feels: '',
    cost_if_unsolved: ''
};

export default function ProblemsPage() {
    const { currentProject, updateBrandIdentity } = useProject();
    const [problems, setProblems] = useState<Problem[]>([]);

    useEffect(() => {
        if (currentProject?.brandIdentity?.pain_matrix) {
            setProblems(currentProject.brandIdentity.pain_matrix);
        }
    }, [currentProject]);

    const handleSave = () => {
        const brandIdentity = currentProject?.brandIdentity || {};
        updateBrandIdentity({ ...brandIdentity, pain_matrix: problems });
        alert("Problem Matrix Saved!");
    };

    const addProblem = () => {
        setProblems([...problems, { ...emptyProblem, id: Date.now().toString() }]);
    };

    const removeProblem = (id: string) => {
        setProblems(problems.filter(p => p.id !== id));
    };

    const updateProblem = (id: string, field: string, value: any) => {
        setProblems(problems.map(p => 
            p.id === id ? { ...p, [field]: value } : p
        ));
    };

    const getIntensityColor = (intensity: number) => {
        if (intensity >= 8) return 'bg-red-500';
        if (intensity >= 6) return 'bg-orange-500';
        if (intensity >= 4) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    const getTypeColor = (type: string) => {
        const colors: Record<string, string> = {
            physical: 'bg-red-100 text-red-700',
            emotional: 'bg-purple-100 text-purple-700',
            social: 'bg-blue-100 text-blue-700',
            financial: 'bg-green-100 text-green-700',
            time: 'bg-orange-100 text-orange-700',
            identity: 'bg-pink-100 text-pink-700'
        };
        return colors[type] || 'bg-gray-100 text-gray-700';
    };

    return (
        <Shell>
            <div className="max-w-6xl mx-auto space-y-8 pb-20">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-red-600 font-bold text-xs uppercase tracking-widest mb-2">
                            <AlertTriangle className="w-3 h-3" /> Problem Matrix
                        </div>
                        <h1 className="text-3xl font-display font-bold">Pain Hierarchy</h1>
                        <p className="text-muted-foreground">List every problem your customer has. Rank by emotional intensity.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={addProblem} variant="outline">
                            <Plus className="w-4 h-4 mr-2" /> Add Problem
                        </Button>
                        <Button onClick={handleSave}>
                            <Save className="w-4 h-4 mr-2" /> Save All
                        </Button>
                    </div>
                </div>

                <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-4">
                        <p className="text-sm text-red-800">
                            <strong>Why this matters:</strong> People buy to solve problems, not to get features. 
                            The AI will use this to open campaigns with PAIN, not product specs.
                        </p>
                    </CardContent>
                </Card>

                {problems.length === 0 && (
                    <Card className="border-dashed">
                        <CardContent className="p-12 text-center">
                            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-muted-foreground mb-4">No problems defined yet. Add your first problem.</p>
                            <Button onClick={addProblem}>
                                <Plus className="w-4 h-4 mr-2" /> Add First Problem
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <div className="space-y-6">
                    {problems.map((problem) => (
                        <Card key={problem.id} className="relative">
                            <CardHeader>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Badge className={getTypeColor(problem.type)}>
                                                {problem.type.toUpperCase()}
                                            </Badge>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-medium text-muted-foreground">Intensity:</span>
                                                <div className="flex gap-1">
                                                    {[...Array(10)].map((_, i) => (
                                                        <div
                                                            key={i}
                                                            className={`w-2 h-4 rounded-sm ${
                                                                i < problem.emotional_intensity 
                                                                    ? getIntensityColor(problem.emotional_intensity) 
                                                                    : 'bg-gray-200'
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-xs font-bold">{problem.emotional_intensity}/10</span>
                                            </div>
                                        </div>
                                        <Textarea
                                            value={problem.problem}
                                            onChange={(e) => updateProblem(problem.id, 'problem', e.target.value)}
                                            placeholder="Describe the problem in customer's words..."
                                            className="min-h-[60px] font-medium text-base"
                                        />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeProblem(problem.id)}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-0">
                                {/* Problem Type & Intensity */}
                                <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Problem Type</label>
                                        <select
                                            value={problem.type}
                                            onChange={(e) => updateProblem(problem.id, 'type', e.target.value as any)}
                                            className="w-full p-2 border rounded-md"
                                        >
                                            <option value="physical">Physical</option>
                                            <option value="emotional">Emotional</option>
                                            <option value="social">Social</option>
                                            <option value="financial">Financial</option>
                                            <option value="time">Time</option>
                                            <option value="identity">Identity</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Emotional Intensity (1-10)</label>
                                        <Input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={problem.emotional_intensity}
                                            onChange={(e) => updateProblem(problem.id, 'emotional_intensity', parseInt(e.target.value) || 5)}
                                        />
                                    </div>
                                </div>

                                {/* Deep Dive Questions */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">What caused it?</label>
                                        <Textarea
                                            value={problem.caused_by}
                                            onChange={(e) => updateProblem(problem.id, 'caused_by', e.target.value)}
                                            placeholder="Root cause..."
                                            className="min-h-[70px]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Why does it persist?</label>
                                        <Textarea
                                            value={problem.why_persists}
                                            onChange={(e) => updateProblem(problem.id, 'why_persists', e.target.value)}
                                            placeholder="Why hasn't it been solved yet?"
                                            className="min-h-[70px]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Why do current solutions fail?</label>
                                        <Textarea
                                            value={problem.why_solutions_fail}
                                            onChange={(e) => updateProblem(problem.id, 'why_solutions_fail', e.target.value)}
                                            placeholder="What's wrong with existing options?"
                                            className="min-h-[70px]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">How does it make them feel?</label>
                                        <Textarea
                                            value={problem.how_feels}
                                            onChange={(e) => updateProblem(problem.id, 'how_feels', e.target.value)}
                                            placeholder="Emotional impact..."
                                            className="min-h-[70px]"
                                        />
                                    </div>
                                </div>

                                {/* Cost of Inaction */}
                                <div className="space-y-2 bg-orange-50 p-4 rounded-lg border border-orange-200">
                                    <label className="text-sm font-medium text-orange-900">💰 Cost if unsolved (What do they lose?)</label>
                                    <Textarea
                                        value={problem.cost_if_unsolved}
                                        onChange={(e) => updateProblem(problem.id, 'cost_if_unsolved', e.target.value)}
                                        placeholder="Time, money, relationships, opportunities, status..."
                                        className="min-h-[60px] bg-white"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </Shell>
    );
}

