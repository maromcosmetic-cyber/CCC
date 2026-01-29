import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function OurStory() {
    return (
        <section className="py-24 bg-white overflow-hidden">
            <div className="container mx-auto px-4">
                <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

                    {/* Image Side */}
                    <div className="w-full lg:w-1/2 relative">
                        <div className="aspect-[4/3] relative rounded-2xl overflow-hidden shadow-xl z-20">
                            <Image
                                src="/story-image.png"
                                alt="Marom Community Farm"
                                fill
                                className="object-cover"
                            />
                        </div>
                        {/* Decorative Elements */}
                        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-secondary/10 rounded-full z-10 blur-2xl" />
                        <div className="absolute -top-10 -right-10 w-60 h-60 bg-accent/20 rounded-full z-10 blur-3xl" />
                    </div>

                    {/* Text Side */}
                    <div className="w-full lg:w-1/2 space-y-6">
                        <div className="inline-block bg-muted px-3 py-1 rounded-full text-xs font-semibold text-primary tracking-wide uppercase">
                            Established 2016
                        </div>
                        <h2 className="font-serif text-3xl md:text-5xl text-primary leading-tight">
                            Rooted in Nature. <br />
                            <span className="italic text-secondary">Grown in Community.</span>
                        </h2>

                        <div className="space-y-4 text-muted-foreground leading-relaxed">
                            <p>
                                MAROM began in 2016 as a small initiative in Kampot, Cambodia, rooted in natural ingredients and community collaboration. What started as a volunteer journey with The Red Road Foundation soon blossomed into something far greater.
                            </p>
                            <p>
                                We discovered the <strong>Moringa tree</strong>—locally known as the "Miracle Tree"—and witnessed its healing power firsthand. Hair that once felt dry became soft and strong. Skin began to glow.
                            </p>
                            <p>
                                Today, we blend Southeast Asian botanical wisdom with European quality standards to create honest, holistic solutions for your family.
                            </p>
                        </div>

                        <div className="pt-4">
                            <Link href="/about" className="text-primary font-medium border-b-2 border-accent hover:border-primary transition-colors inline-flex items-center gap-2 pb-1">
                                Read Our Story <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
