import { Leaf, ShieldCheck, Heart, Droplets } from "lucide-react";

const trustItems = [
    {
        icon: Leaf,
        title: "Natural Formulas",
        description: "Clean ingredients backed by science"
    },
    {
        icon: ShieldCheck,
        title: "Ingredient Transparency",
        description: "No hidden chemicals or fillers"
    },
    {
        icon: Heart,
        title: "Family-Friendly",
        description: "Safe for babies and sensitive skin"
    },
    {
        icon: Droplets,
        title: "Sustainably Sourced",
        description: "Supporting local communities"
    }
];

export function TrustBar() {
    return (
        <section className="bg-muted py-12">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {trustItems.map((item, index) => (
                        <div key={index} className="flex flex-col items-center text-center gap-3 group hover:-translate-y-1 transition-transform duration-300">
                            <div className="bg-white p-4 rounded-full shadow-sm text-secondary group-hover:text-primary transition-colors">
                                <item.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-serif font-semibold text-primary mb-1">{item.title}</h3>
                                <p className="text-xs text-muted-foreground">{item.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
