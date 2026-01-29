import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductCardProps {
    title: string;
    price: number;
    originalPrice?: number;
    image: string;
    tag?: string;
    className?: string;
}

export function ProductCard({ title, price, originalPrice, image, tag, className }: ProductCardProps) {
    return (
        <div className={cn("group relative flex flex-col gap-3", className)}>
            {/* Image Container */}
            <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-muted">
                {tag && (
                    <span className="absolute top-2 left-2 z-10 bg-secondary text-white text-[10px] font-bold px-2 py-1 rounded-sm uppercase tracking-wider">
                        {tag}
                    </span>
                )}
                <Image
                    src={image}
                    alt={title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Quick Add Button - Appears on Hover */}
                <button className="absolute bottom-4 right-4 bg-white text-primary p-3 rounded-full shadow-lg translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hover:bg-primary hover:text-white">
                    <ShoppingBag className="w-5 h-5" />
                </button>
            </div>

            {/* Details */}
            <div className="space-y-1">
                <h3 className="font-medium text-primary text-lg leading-tight group-hover:text-secondary transition-colors">
                    {title}
                </h3>
                <div className="flex items-center gap-2 text-sm">
                    {originalPrice && (
                        <span className="text-muted-foreground line-through">฿{originalPrice.toFixed(2)}</span>
                    )}
                    <span className="font-semibold text-primary">฿{price.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
}
