import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function QuizBanner() {
    return (
        <section className="bg-secondary/20 py-24">
            <div className="container mx-auto px-4 text-center">
                <h2 className="font-serif text-3xl md:text-5xl text-primary mb-6">
                    Why Is Your Hair Falling?
                </h2>
                <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                    Get a specialized natural plan tailored to your unique hair pattern and lifestyle.
                </p>
                <Link
                    href="/quiz"
                    className="inline-flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-full font-medium text-lg hover:bg-primary/90 transition-transform hover:scale-105 shadow-md"
                >
                    Take the Analysis <ArrowRight className="w-5 h-5" />
                </Link>
            </div>
        </section>
    );
}
