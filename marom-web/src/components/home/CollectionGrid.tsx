import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const collections = [
    {
        title: "Hair Care",
        image: "/collection-hair.png",
        link: "/shop/hair-care",
        description: "Strengthen, nourish, and care naturally."
    },
    {
        title: "Natural Protection",
        image: "/collection-protection.png",
        link: "/shop/protection",
        description: "Gentle, chemical-free mosquito protection."
    },
    {
        title: "Gift Sets",
        image: "/collection-gifts.png",
        link: "/shop/bundles",
        description: "The perfect natural gift for loved ones."
    }
];

export function CollectionGrid() {
    return (
        <section className="py-16 md:py-24 bg-white">
            <div className="container mx-auto px-4">
                <h2 className="text-3xl md:text-4xl font-serif text-primary text-center mb-12">
                    Powered by Moringa
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center max-w-6xl mx-auto">
                    {collections.map((item, index) => (
                        <Link
                            key={index}
                            href={item.link}
                            className="group block relative overflow-hidden rounded-lg shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                        >
                            <div className="relative aspect-[3/4] overflow-hidden">
                                <Image
                                    src={item.image}
                                    alt={item.title}
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                            </div>

                            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white text-left">
                                <h3 className="text-2xl font-serif mb-1 group-hover:underline decoration-secondary underline-offset-4">
                                    {item.title}
                                </h3>
                                <p className="text-sm text-gray-200 mb-3 opacity-90">{item.description}</p>
                                <div className="flex items-center gap-2 text-sm font-medium text-secondary">
                                    Explore <ArrowRight className="w-4 h-4" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
