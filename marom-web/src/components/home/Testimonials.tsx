import { Star } from "lucide-react";

const reviews = [
    {
        name: "Rachel Riggio",
        image: "/user-rachel.png", // Placeholder or generic avatar if not available
        rating: 5,
        text: "Wow! I love this company and these products! I am very strict about only putting high-quality, synthetic chemical free ingredients on the skin of my family. The mosquito repellent is the best I've ever used."
    },
    {
        name: "Ashley “Ash” Fairfield",
        image: "/user-ash.png",
        rating: 5,
        text: "So glad we found this. It feels nice on the skin, smells great and most importantly we can all use it. We put it on our 1.5yr old and he loves it. No bad chemicals! 🙌"
    },
    {
        name: "Rotem Metuki",
        image: "/user-rotem.png",
        rating: 5,
        text: "I absolutely love this product!!! I usually have a really hard time finding products that I enjoy the smell of… this one has the nicest smell and it feels incredible on the skin!!"
    },
    {
        name: "Erez Monk",
        image: "/user-erez.png",
        rating: 5,
        text: "This natural mosquito repellent is a lifesaver! Smells good, feels great on the skin, and actually works without the harsh chemicals. Love that it’s locally made. Highly recommend!"
    }
];

export function Testimonials() {
    return (
        <section className="py-20 bg-muted/50">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="font-serif text-3xl md:text-4xl text-primary mb-4">What Our Family is Saying</h2>
                    <div className="flex justify-center gap-1 text-yellow-500 mb-2">
                        {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
                    </div>
                    <p className="text-muted-foreground">Real reviews from our community</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {reviews.map((review, index) => (
                        <div key={index} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-1 text-yellow-500 mb-4">
                                {[...Array(review.rating)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                            </div>
                            <p className="text-sm text-gray-600 mb-6 italic leading-relaxed">"{review.text}"</p>
                            <div className="flex items-center gap-3 mt-auto">
                                <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-primary font-bold text-xs">
                                    {review.name.charAt(0)}
                                </div>
                                <span className="font-medium text-primary text-sm">{review.name}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
