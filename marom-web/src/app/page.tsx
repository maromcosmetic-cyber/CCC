import { Hero } from "@/components/home/Hero";
import { TrustBar } from "@/components/home/TrustBar";
import { CollectionGrid } from "@/components/home/CollectionGrid";
import { BestSellers } from "@/components/home/BestSellers";
import { QuizBanner } from "@/components/home/QuizBanner";
import { IngredientHighlight } from "@/components/home/IngredientHighlight";
import { Testimonials } from "@/components/home/Testimonials";
import { OurStory } from "@/components/home/OurStory";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Hero />
      <TrustBar />

      <CollectionGrid />

      <BestSellers />

      <QuizBanner />

      <OurStory />

      <Testimonials />

      <IngredientHighlight />
    </div>
  );
}
