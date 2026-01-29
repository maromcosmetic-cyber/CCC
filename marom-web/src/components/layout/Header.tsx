"use client";

import Link from "next/link";
import { Search, ShoppingBag, User, Menu } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <header className="sticky top-0 z-50 w-full bg-white border-b border-muted">
            {/* Top Bar */}
            <div className="bg-primary text-primary-foreground text-xs text-center py-2 px-4">
                Free Shipping on orders over ฿1000 | 100% Natural Guarantee
            </div>

            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                {/* Mobile Menu Button */}
                <button
                    className="lg:hidden p-2"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    <Menu className="h-6 w-6 text-foreground" />
                </button>

                {/* Logo */}
                <Link href="/" className="text-2xl font-serif font-bold text-primary tracking-wide">
                    MAROM
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden lg:flex items-center gap-8 absolute left-1/2 transform -translate-x-1/2">
                    <Link href="/shop" className="text-sm font-medium hover:text-primary transition-colors">
                        Shop
                    </Link>
                    <Link href="/about" className="text-sm font-medium hover:text-primary transition-colors">
                        Our Mission
                    </Link>
                    <Link href="/journal" className="text-sm font-medium hover:text-primary transition-colors">
                        Journal
                    </Link>
                    <Link href="/quiz" className="text-sm font-medium hover:text-primary transition-colors">
                        Hair Quiz
                    </Link>
                </nav>

                {/* Icons */}
                <div className="flex items-center gap-4">
                    <button className="p-2 hover:bg-muted rounded-full transition-colors">
                        <Search className="h-5 w-5 text-foreground" />
                    </button>
                    <Link href="/account" className="hidden sm:block p-2 hover:bg-muted rounded-full transition-colors">
                        <User className="h-5 w-5 text-foreground" />
                    </Link>
                    <Link href="/cart" className="p-2 hover:bg-muted rounded-full transition-colors relative">
                        <ShoppingBag className="h-5 w-5 text-foreground" />
                        <span className="absolute top-1 right-1 bg-secondary text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                            0
                        </span>
                    </Link>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="lg:hidden absolute top-full left-0 w-full bg-white border-b border-muted py-4 px-4 flex flex-col gap-4 shadow-lg animate-in slide-in-from-top-5">
                    <Link href="/shop" className="text-base font-medium py-2 border-b border-muted">
                        Shop
                    </Link>
                    <Link href="/about" className="text-base font-medium py-2 border-b border-muted">
                        Our Mission
                    </Link>
                    <Link href="/journal" className="text-base font-medium py-2 border-b border-muted">
                        Journal
                    </Link>
                    <Link href="/quiz" className="text-base font-medium py-2 text-primary">
                        Take Hair Quiz
                    </Link>
                </div>
            )}
        </header>
    );
}
