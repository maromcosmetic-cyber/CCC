
import { Button } from "@/components/ui/button";
import { MessageSquare, LayoutGrid } from "lucide-react";
import Link from "next/link";

export function ConnectGooglePrompt({ onConnect }: { onConnect: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-gray-50 space-y-4 animate-in fade-in zoom-in duration-500">
            <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                <img
                    src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg"
                    alt="Google"
                    className="h-8 w-8"
                />
            </div>
            <div className="text-center space-y-1">
                <h3 className="text-xl font-bold text-gray-900">Connect Google Business Profile</h3>
                <p className="text-muted-foreground max-w-sm">
                    Connect your Google Business Profile to view, manage, and reply to customer reviews directly from your dashboard.
                </p>
            </div>
            <Button size="lg" className="mt-4" onClick={onConnect}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Connect Google Business
            </Button>
        </div>
    );
}
