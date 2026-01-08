
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { BarChart, Mail, Phone, Clock } from "lucide-react";

interface ReportingSettingsCardProps {
    settings: any;
    onSettingsChange: (newSettings: any) => void;
}

export default function ReportingSettingsCard({ settings, onSettingsChange }: ReportingSettingsCardProps) {
    return (
        <Card className="glass-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <BarChart className="w-5 h-5" /> Reporting & Analytics
                </CardTitle>
                <CardDescription>
                    Configure how and when you receive performance reports (Sales, Campaigns, Traffic).
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Frequency */}
                <div className="flex items-center justify-between border-b pb-4">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <Label className="text-base">Daily Report</Label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Receive a summary of yesterday's performance every morning.
                        </p>
                    </div>
                    <Switch
                        checked={settings?.reporting_daily || false}
                        onCheckedChange={(checked) => onSettingsChange({ ...settings, reporting_daily: checked })}
                    />
                </div>

                <div className="flex items-center justify-between border-b pb-4">
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <Label className="text-base">Weekly Report</Label>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Receive a comprehensive analysis every Monday.
                        </p>
                    </div>
                    <Switch
                        checked={settings?.reporting_weekly || false}
                        onCheckedChange={(checked) => onSettingsChange({ ...settings, reporting_weekly: checked })}
                    />
                </div>

                {/* Delivery Channel */}
                <div className="space-y-3 pt-2">
                    <Label className="text-base font-semibold">Delivery Method</Label>
                    <RadioGroup
                        value={settings?.reporting_channel || 'email'}
                        onValueChange={(val: string) => onSettingsChange({ ...settings, reporting_channel: val })}
                        className="grid grid-cols-2 gap-4"
                    >
                        <div>
                            <RadioGroupItem value="email" id="channel-email" className="peer sr-only" />
                            <Label
                                htmlFor="channel-email"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                                <Mail className="mb-2 h-6 w-6 text-blue-500" />
                                <span>Email</span>
                            </Label>
                        </div>
                        <div>
                            <RadioGroupItem value="whatsapp" id="channel-whatsapp" className="peer sr-only" />
                            <Label
                                htmlFor="channel-whatsapp"
                                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                                <Phone className="mb-2 h-6 w-6 text-green-500" />
                                <span>WhatsApp</span>
                            </Label>
                        </div>
                    </RadioGroup>
                </div>

                {/* Conditional Inputs */}
                {settings?.reporting_channel === 'whatsapp' && (
                    <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-1">
                        <Label>WhatsApp Number</Label>
                        <Input
                            placeholder="+1 (555) 000-0000"
                            value={settings?.reporting_whatsapp || ''}
                            onChange={(e) => onSettingsChange({ ...settings, reporting_whatsapp: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">Include country code.</p>
                    </div>
                )}

                {settings?.reporting_channel === 'email' && (
                    <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-1">
                        <Label>Report Recipient Email</Label>
                        <Input
                            placeholder="reports@mybrand.com"
                            value={settings?.reporting_email || settings?.sender_email || ''}
                            onChange={(e) => onSettingsChange({ ...settings, reporting_email: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">Detailed reports will be sent here.</p>
                    </div>
                )}

            </CardContent>
        </Card>
    );
}
