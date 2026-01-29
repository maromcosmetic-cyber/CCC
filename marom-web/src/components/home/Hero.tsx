import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Hero() {
    return (
        <section className="relative h-[85vh] w-full flex items-center justify-center overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0">
                <Image
                    src="/hero.png"
                    alt="Natural Beauty"
                    fill
                    className="object-cover"
                    priority
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/20" />
            </div>

            {/* Content */}
            <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in duration-1000">
                <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold leading-tight drop-shadow-lg">
                    Where South East Asia Meets <br />
                    <span className="italic">European Standards</span>
                </h1>

                <p className="text-lg md:text-xl font-light tracking-wide max-w-2xl mx-auto drop-shadow-md opacity-90">
                    Natural Hair & Skin Care, Powered by Moringa.<br />
                    Clean, family-friendly formulas you can feel good about.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <Link
                        href="/shop"
                        className="bg-white text-primary hover:bg-muted px-8 py-3 rounded-full font-medium transition-all transform hover:scale-105 shadow-lg"
                    >
                        Shop Best Sellers
                    </Link>
                    <Link
                        href="/quiz"
                        className="bg-primary/80 backdrop-blur-sm border border-white/30 text-white hover:bg-primary px-8 py-3 rounded-full font-medium transition-all transform hover:scale-105 flex items-center justify-center gap-2"
                    >
                        Take Hair Quiz <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
