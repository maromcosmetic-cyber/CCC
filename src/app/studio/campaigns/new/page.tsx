'use client';

import { Shell } from "@/components/layout/Shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useProject } from "@/contexts/ProjectContext";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Facebook, Search as GoogleIcon, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const STEPS = [
    { id: 1, name: 'Campaign Details', description: 'Basic information' },
    { id: 2, name: 'Budget & Schedule', description: 'Set your budget and dates' },
    { id: 3, name: 'Targeting', description: 'Define your audience' },
    { id: 4, name: 'Review', description: 'Review and launch' },
];

const PLATFORMS = [
    { value: 'meta', label: 'Meta Ads', icon: Facebook, color: 'text-blue-600' },
    { value: 'google_ads', label: 'Google Ads', icon: GoogleIcon, color: 'text-red-600' },
];

const OBJECTIVES = [
    { value: 'awareness', label: 'Brand Awareness' },
    { value: 'traffic', label: 'Website Traffic' },
    { value: 'engagement', label: 'Engagement' },
    { value: 'leads', label: 'Lead Generation' },
    { value: 'conversions', label: 'Conversions' },
    { value: 'sales', label: 'Catalog Sales' },
];

export default function NewCampaignPage() {
    const { currentProject } = useProject();
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form state
    const [platform, setPlatform] = useState('meta');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [objective, setObjective] = useState('conversions');
    const [budgetAmount, setBudgetAmount] = useState('');
    const [budgetCurrency, setBudgetCurrency] = useState('USD');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Targeting state
    const [ageMin, setAgeMin] = useState('18');
    const [ageMax, setAgeMax] = useState('65');
    const [gender, setGender] = useState('all');
    const [locations, setLocations] = useState('');
    const [interests, setInterests] = useState('');

    const handleNext = () => {
        if (currentStep < STEPS.length) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = async () => {
        if (!currentProject) return;

        setLoading(true);
        try {
            const targeting_config = {
                age_min: parseInt(ageMin),
                age_max: parseInt(ageMax),
                gender,
                locations: locations.split(',').map(l => l.trim()).filter(Boolean),
                interests: interests.split(',').map(i => i.trim()).filter(Boolean),
            };

            const response = await fetch(`/api/projects/${currentProject.id}/campaigns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description,
                    platform,
                    objective,
                    budget_amount: parseFloat(budgetAmount),
                    budget_currency: budgetCurrency,
                    start_date: startDate,
                    end_date: endDate,
                    targeting_config,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                router.push('/studio/campaigns');
            } else {
                const error = await response.json();
                alert(`Error: ${error.error || 'Failed to create campaign'}`);
            }
        } catch (error) {
            console.error('Error creating campaign:', error);
            alert('Failed to create campaign');
        } finally {
            setLoading(false);
        }
    };

    const isStepValid = () => {
        switch (currentStep) {
            case 1:
                return name && platform && objective;
            case 2:
                return budgetAmount && startDate;
            case 3:
                return true; // Targeting is optional
            case 4:
                return true;
            default:
                return false;
        }
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
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-display font-black text-foreground tracking-tight">Create Campaign</h1>
                        <p className="text-muted-foreground text-lg mt-1">
                            Set up a new advertising campaign for {currentProject.name}
                        </p>
                    </div>
                    <Button variant="outline" onClick={() => router.push('/studio/campaigns')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Cancel
                    </Button>
                </div>

                {/* Progress Steps */}
                <Card className="glass-card">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            {STEPS.map((step, index) => (
                                <div key={step.id} className="flex items-center flex-1">
                                    <div className="flex flex-col items-center flex-1">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${currentStep > step.id
                                                ? 'bg-green-500 text-white'
                                                : currentStep === step.id
                                                    ? 'bg-primary text-white'
                                                    : 'bg-muted text-muted-foreground'
                                            }`}>
                                            {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
                                        </div>
                                        <div className="mt-2 text-center">
                                            <div className="text-sm font-medium">{step.name}</div>
                                            <div className="text-xs text-muted-foreground">{step.description}</div>
                                        </div>
                                    </div>
                                    {index < STEPS.length - 1 && (
                                        <div className={`h-0.5 flex-1 mx-4 transition-colors ${currentStep > step.id ? 'bg-green-500' : 'bg-muted'
                                            }`} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Step Content */}
                <Card className="glass-card">
                    <CardHeader>
                        <CardTitle>{STEPS[currentStep - 1].name}</CardTitle>
                        <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Step 1: Campaign Details */}
                        {currentStep === 1 && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="platform">Platform *</Label>
                                    <Select value={platform} onValueChange={setPlatform}>
                                        <SelectTrigger className="h-11">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PLATFORMS.map(p => (
                                                <SelectItem key={p.value} value={p.value}>
                                                    <div className="flex items-center gap-2">
                                                        <p.icon className={`w-4 h-4 ${p.color}`} />
                                                        {p.label}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="name">Campaign Name *</Label>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g., Summer Sale 2024"
                                        className="h-11"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Description</Label>
                                    <Textarea
                                        id="description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Describe your campaign goals and strategy"
                                        rows={3}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="objective">Campaign Objective *</Label>
                                    <Select value={objective} onValueChange={setObjective}>
                                        <SelectTrigger className="h-11">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {OBJECTIVES.map(obj => (
                                                <SelectItem key={obj.value} value={obj.value}>
                                                    {obj.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Budget & Schedule */}
                        {currentStep === 2 && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="budget">Daily Budget *</Label>
                                        <Input
                                            id="budget"
                                            type="number"
                                            value={budgetAmount}
                                            onChange={(e) => setBudgetAmount(e.target.value)}
                                            placeholder="100"
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="currency">Currency</Label>
                                        <Select value={budgetCurrency} onValueChange={setBudgetCurrency}>
                                            <SelectTrigger className="h-11">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="USD">USD</SelectItem>
                                                <SelectItem value="EUR">EUR</SelectItem>
                                                <SelectItem value="GBP">GBP</SelectItem>
                                                <SelectItem value="THB">THB</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="startDate">Start Date *</Label>
                                        <Input
                                            id="startDate"
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="endDate">End Date</Label>
                                        <Input
                                            id="endDate"
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="h-11"
                                        />
                                    </div>
                                </div>

                                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                    <p className="text-sm text-blue-600">
                                        <strong>Estimated Daily Reach:</strong> {budgetAmount ? `${parseInt(budgetAmount) * 100}-${parseInt(budgetAmount) * 200} people` : 'Enter budget to see estimate'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Targeting */}
                        {currentStep === 3 && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="ageMin">Minimum Age</Label>
                                        <Input
                                            id="ageMin"
                                            type="number"
                                            value={ageMin}
                                            onChange={(e) => setAgeMin(e.target.value)}
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="ageMax">Maximum Age</Label>
                                        <Input
                                            id="ageMax"
                                            type="number"
                                            value={ageMax}
                                            onChange={(e) => setAgeMax(e.target.value)}
                                            className="h-11"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="gender">Gender</Label>
                                    <Select value={gender} onValueChange={setGender}>
                                        <SelectTrigger className="h-11">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            <SelectItem value="male">Male</SelectItem>
                                            <SelectItem value="female">Female</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="locations">Locations (comma-separated)</Label>
                                    <Input
                                        id="locations"
                                        value={locations}
                                        onChange={(e) => setLocations(e.target.value)}
                                        placeholder="e.g., United States, Canada, United Kingdom"
                                        className="h-11"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="interests">Interests (comma-separated)</Label>
                                    <Textarea
                                        id="interests"
                                        value={interests}
                                        onChange={(e) => setInterests(e.target.value)}
                                        placeholder="e.g., Fashion, Technology, Travel"
                                        rows={3}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 4: Review */}
                        {currentStep === 4 && (
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-semibold mb-2">Campaign Details</h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Platform:</span>
                                                <Badge>{PLATFORMS.find(p => p.value === platform)?.label}</Badge>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Name:</span>
                                                <span className="font-medium">{name}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Objective:</span>
                                                <span className="font-medium capitalize">{objective.replace('_', ' ')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t pt-4">
                                        <h3 className="font-semibold mb-2">Budget & Schedule</h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Daily Budget:</span>
                                                <span className="font-medium">{budgetCurrency} {budgetAmount}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Start Date:</span>
                                                <span className="font-medium">{startDate || 'Immediately'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">End Date:</span>
                                                <span className="font-medium">{endDate || 'Ongoing'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t pt-4">
                                        <h3 className="font-semibold mb-2">Targeting</h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Age Range:</span>
                                                <span className="font-medium">{ageMin}-{ageMax}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-muted-foreground">Gender:</span>
                                                <span className="font-medium capitalize">{gender}</span>
                                            </div>
                                            {locations && (
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Locations:</span>
                                                    <span className="font-medium text-right">{locations}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                                    <p className="text-sm text-yellow-600">
                                        <strong>Note:</strong> This campaign will be created as a draft. You'll need to configure your API credentials in Settings → Integrations before launching.
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Navigation Buttons */}
                <div className="flex justify-between">
                    <Button
                        variant="outline"
                        onClick={handleBack}
                        disabled={currentStep === 1}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    {currentStep < STEPS.length ? (
                        <Button
                            onClick={handleNext}
                            disabled={!isStepValid()}
                        >
                            Next
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={loading || !isStepValid()}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Create Campaign
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </Shell>
    );
}
