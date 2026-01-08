import { Button } from "@/components/ui/button";
import { ShoppingBag, Zap } from "lucide-react";
import Link from "next/link";

export function ConnectStorePrompt() {
    return (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-gray-50 space-y-4 animate-in fade-in zoom-in duration-500">
            <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                <ShoppingBag className="w-8 h-8" />
            </div>
            <div className="text-center space-y-1">
                <h3 className="text-xl font-bold text-gray-900">Connect Your Store</h3>
                <p className="text-muted-foreground max-w-sm">
                    WooCommerce is not connected. Connect your store to unlock Catalog features, sync products, and manage inventory.
                </p>
            </div>
            <Link href="/settings/integrations">
                <Button size="lg" className="mt-4">
                    <Zap className="w-4 h-4 mr-2" />
                    Connect WooCommerce
                </Button>
            </Link>
        </div>
    );
}
