
import { Button } from "@/components/ui/button";
import { BarChart2, Activity } from "lucide-react";

export function ConnectAnalyticsPrompt({ onConnect }: { onConnect: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-gray-50 space-y-4 animate-in fade-in zoom-in duration-500">
            <div className="h-16 w-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                <BarChart2 className="w-8 h-8" />
            </div>
            <div className="text-center space-y-1">
                <h3 className="text-xl font-bold text-gray-900">Connect Analytics</h3>
                <p className="text-muted-foreground max-w-sm">
                    Connect Google Analytics 4 and Facebook Pixel to track website traffic, conversion funnels, and user behavior.
                </p>
            </div>
            <Button size="lg" className="mt-4 bg-purple-600 hover:bg-purple-700" onClick={onConnect}>
                <Activity className="w-4 h-4 mr-2" />
                Connect Providers
            </Button>
        </div>
    );
}
