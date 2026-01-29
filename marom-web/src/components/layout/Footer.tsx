import Link from "next/link";
import { Facebook, Instagram, Youtube, Phone, Mail, MapPin } from "lucide-react";

export function Footer() {
    return (
        <footer className="bg-[#1C1C1C] text-white pt-16 pb-8">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
                    {/* Brand Column */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-2xl font-serif font-bold tracking-wide mb-2">MAROM</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Where South East Asian Wisdom Meets European Standards.
                                Holistic, natural beauty powered by Moringa.
                            </p>
                        </div>

                        <div className="space-y-3 text-sm text-gray-400">
                            <div className="flex items-start gap-3">
                                <MapPin className="w-4 h-4 mt-1 shrink-0" />
                                <span>26 Moo.2, Tambon Sanpulei, Amphoe Doi Saket, Chiang Mai, 50220, Thailand</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone className="w-4 h-4 shrink-0" />
                                <a href="tel:+66824468330" className="hover:text-white transition-colors">+66 82 446 8330</a>
                            </div>
                            <div className="flex items-center gap-3">
                                <Mail className="w-4 h-4 shrink-0" />
                                <a href="mailto:info@maromcosmetic.com" className="hover:text-white transition-colors">info@maromcosmetic.com</a>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-2">
                            <Link href="#" className="hover:text-secondary transition-colors"><Facebook className="h-5 w-5" /></Link>
                            <Link href="#" className="hover:text-secondary transition-colors"><Instagram className="h-5 w-5" /></Link>
                            <Link href="#" className="hover:text-secondary transition-colors"><Youtube className="h-5 w-5" /></Link>
                        </div>
                    </div>

                    {/* Shop Links */}
                    <div>
                        <h4 className="font-serif text-lg mb-4">Shop</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><Link href="/shop/hair-care" className="hover:text-white transition-colors">Hair Care</Link></li>
                            <li><Link href="/shop/skin-care" className="hover:text-white transition-colors">Natural Protection</Link></li>
                            <li><Link href="/shop/bundles" className="hover:text-white transition-colors">Gift Sets</Link></li>
                            <li><Link href="/shop/new" className="hover:text-white transition-colors">New Arrivals</Link></li>
                        </ul>
                    </div>

                    {/* Company Links */}
                    <div>
                        <h4 className="font-serif text-lg mb-4">About</h4>
                        <ul className="space-y-2 text-sm text-gray-400">
                            <li><Link href="/about" className="hover:text-white transition-colors">Our Mission</Link></li>
                            <li><Link href="/ingredients" className="hover:text-white transition-colors">Ingredients Transparency</Link></li>
                            <li><Link href="/blog" className="hover:text-white transition-colors">Journal</Link></li>
                            <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                        </ul>
                    </div>

                    {/* Newsletter */}
                    <div>
                        <h4 className="font-serif text-lg mb-4">Join the Marom Family</h4>
                        <p className="text-gray-400 text-sm mb-4">
                            Get 10% off your first order and holistic beauty tips.
                        </p>
                        <form className="flex gap-2">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="bg-white/10 border border-white/20 text-white px-3 py-2 rounded-md w-full focus:outline-none focus:border-secondary"
                            />
                            <button
                                type="submit"
                                className="bg-secondary hover:bg-secondary/90 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                            >
                                Join
                            </button>
                        </form>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 gap-4">
                    <p>© 2024 Marom Co.,Ltd , All Rights Reserved.</p>
                    <div className="flex gap-6">
                        <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
