
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

export function ConnectFacebookPrompt({ onConnect }: { onConnect: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-gray-50 space-y-4 animate-in fade-in zoom-in duration-500">
            <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                <img
                    src="https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg"
                    alt="Facebook"
                    className="h-8 w-8"
                />
            </div>
            <div className="text-center space-y-1">
                <h3 className="text-xl font-bold text-gray-900">Connect Facebook Reviews</h3>
                <p className="text-muted-foreground max-w-sm">
                    Connect your Facebook Page to view, manage, and reply to customer reviews directly from your dashboard.
                </p>
            </div>
            <Button size="lg" className="mt-4 bg-[#1877F2] hover:bg-[#166fe5]" onClick={onConnect}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Connect Facebook Page
            </Button>
        </div>
    );
}
