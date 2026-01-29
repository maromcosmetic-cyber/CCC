import Image from "next/image";

const ingredients = [
    {
        name: "Moringa",
        image: "/ing-moringa.png",
        benefit: "Nutrient-rich nourishment"
    },
    {
        name: "Reishi Mushroom",
        image: "/ing-reishi.png",
        benefit: "Antioxidant powerhouse"
    },
    {
        name: "Curry Leaves",
        image: "/ing-curry.png",
        benefit: "Vitality support"
    },
    {
        name: "Camellia Tea Oil",
        image: "/ing-tea-oil.png",
        benefit: "Softness + Shine"
    }
];

export function IngredientHighlight() {
    return (
        <section className="py-24 bg-white">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="font-serif text-3xl md:text-4xl text-primary mb-4">Powered by Plants. Backed by Nature.</h2>
                    <p className="text-muted-foreground">We believe in showing exactly what goes into your products and why.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
                    {ingredients.map((item, index) => (
                        <div key={index} className="flex flex-col items-center text-center group">
                            <div className="relative w-32 h-32 md:w-40 md:h-40 mb-6 rounded-full overflow-hidden shadow-md border-4 border-muted group-hover:border-secondary transition-colors duration-300">
                                <Image
                                    src={item.image}
                                    alt={item.name}
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                            </div>
                            <h3 className="font-serif text-xl text-primary mb-2 font-medium">{item.name}</h3>
                            <p className="text-sm text-muted-foreground">{item.benefit}</p>
                        </div>
                    ))}
                </div>

                <div className="text-center mt-12">
                    <a href="/ingredients" className="text-secondary hover:text-primary font-medium underline underline-offset-4 decoration-secondary">
                        Explore Our Ingredients
                    </a>
                </div>
            </div>
        </section>
    );
}
