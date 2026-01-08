"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CopilotWidget } from "@/components/copilot/CopilotWidget";
import { createClient } from '@/lib/auth/client';
import {
  LayoutDashboard,
  BarChart2,
  ShieldCheck,
  Database,
  Search,
  Bell,
  Plus,
  ChevronDown,
  Users,
  Layers,
  FileText,
  Calendar,
  CheckSquare,
  Library,
  Cpu,
  Share2,
  Sparkles,
  MessageSquare,
  ShoppingBag,
  Tag,
  Zap,
  User,
  Palette,
  Mic,
  Video,
  Image as ImageIcon,
  Fingerprint,
  Mic2,
  UserCircle,
  Network,
  BookOpen,
  LogOut,
  Mail,
  Wand2,
  Subtitles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useProject } from "@/contexts/ProjectContext";

const PRIMARY_NAV = [
  { id: "studio", icon: LayoutDashboard, label: "Marketing", href: "/studio" },
  { id: "brand", icon: Sparkles, label: "Brand", href: "/brand" },
  { id: "commerce", icon: ShoppingBag, label: "Commerce", href: "/commerce/overview" },
  { id: "design", icon: Palette, label: "Design", href: "/studio/design" },
  { id: "results", icon: BarChart2, label: "Results", href: "/results" },
];

const STUDIO_SUB_NAV = [

  { id: "campaigns", label: "Campaigns", icon: FileText, href: "/studio/campaigns" },
  { id: "ads-library", label: "Ads Library", icon: Library, href: "/studio/ads" },
  { id: "schedule", label: "Schedule", icon: Calendar, href: "/studio/schedule" },
  { id: "approvals", label: "Approvals", icon: CheckSquare, href: "/studio/approvals" },
  { id: "creative-library", label: "Creative Library", icon: Library, href: "/studio/creatives" },
  { id: "ai-builder", label: "AI Builder", icon: Cpu, href: "/studio/ai-builder" },
  { id: "email", label: "Email Marketing", icon: Mail, href: "/studio/email" },
  { id: "analytics", label: "Analytics", icon: BarChart2, href: "/studio/analytics" },
  { id: "reviews", label: "Reviews", icon: MessageSquare, href: "/marketing/reviews" },
];

const BRAND_SUB_NAV = [
  { id: "brand-overview", label: "Overview", icon: Layers, href: "/brand/overview" },
  { id: "brand-identity", label: "Identity", icon: Fingerprint, href: "/brand/identity" },
  { id: "brand-visuals", label: "Visual Identity", icon: Palette, href: "/brand/visuals" },
  { id: "brand-voice", label: "Voice & Guardrails", icon: Mic2, href: "/brand/voice" },
  { id: "brand-audiences", label: "Audiences", icon: Users, href: "/brand/audiences" },
  { id: "brand-competitors", label: "Competitor Research", icon: Search, href: "/brand/competitors" },
  { id: "brand-personas", label: "Personas / Presenters", icon: UserCircle, href: "/brand/personas" },

  { id: "brand-playbook", label: "Playbook", icon: BookOpen, href: "/brand/playbook" },
];

const COMMERCE_SUB_NAV = [
  { id: "commerce-overview", label: "Overview", icon: Layers, href: "/commerce/overview" },
  { id: "commerce-products", label: "Products", icon: ShoppingBag, href: "/commerce/products" },
  { id: "commerce-transactions", label: "Transactions", icon: BarChart2, href: "/commerce/transactions" },
  { id: "commerce-collections", label: "Collections", icon: Zap, href: "/commerce/collections" },
  { id: "commerce-offers", label: "Offers", icon: Tag, href: "/commerce/offers" },
  { id: "commerce-assets", label: "Assets", icon: Library, href: "/commerce/assets" },
  { id: "commerce-legal", label: "Legal Pages", icon: FileText, href: "/commerce/legal-pages" },
];

const DESIGN_SUB_NAV = [
  { id: "design-chat", label: "AI Assistant", icon: Sparkles, href: "/studio/design?tab=overview" },
  { id: "design-text-video", label: "Text to Video", icon: Video, href: "/studio/design?tab=text-to-video" },
  { id: "design-image-video", label: "Image to Video", icon: Sparkles, href: "/studio/design?tab=image-to-video" },
  { id: "design-ugc-video", label: "UGC Video", icon: FileText, href: "/studio/design?tab=ugc-video" },
  { id: "design-ad-studio", label: "Ad Studio", icon: Layers, href: "/studio/design?tab=ad-studio" },
  { id: "design-voice", label: "Voice Studio", icon: Mic, href: "/studio/design?tab=voice-studio" },
  { id: "design-lip-sync", label: "Lip Sync", icon: User, href: "/studio/design?tab=lip-sync" },
  { id: "design-skin-enhancer", label: "Skin Enhancer", icon: Wand2, href: "/studio/design?tab=skin-enhancer" },
  { id: "design-subtitles", label: "Subtitles", icon: Subtitles, href: "/studio/design?tab=subtitles" },
];

const WORKSPACES = [
  { id: "ws1", name: "Acme Global", brands: [{ id: "b1", name: "Acme Shoes" }, { id: "b2", name: "Acme Active" }] },
  { id: "ws2", name: "Globex", brands: [{ id: "b3", name: "Globex Pharma" }] },
];

const MasterNav = () => {
  const pathname = usePathname();
  return (
    <aside className="w-[88px] flex flex-col h-full bg-white border-r border-[#E0E0E0] liquid-glass z-30">
      <div className="h-16 flex items-center justify-center">
        <div className="w-10 h-10 rounded-lg bg-[#2B71FF] flex items-center justify-center text-white font-black">C</div>
      </div>
      <nav className="flex-1 mt-4">
        {PRIMARY_NAV.map((item) => {
          const isActive = pathname?.startsWith(item.href) || (item.id === 'studio' && (pathname === '/' || pathname === '/studio/overview')) || (item.id === 'commerce' && pathname?.startsWith('/commerce'));
          return (
            <Link key={item.id} href={item.href}>
              <div className={cn(
                "relative h-[72px] flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors group",
                isActive ? "text-[#2B71FF]" : "text-[#666666] hover:bg-[#F8F9FA]"
              )}>
                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#2B71FF]" />}
                <div className={cn(
                  "p-2 rounded-xl transition-colors",
                  isActive ? "bg-[#E0EBFF]" : "group-hover:bg-[#E0E0E0]/20"
                )}>
                  <item.icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-medium uppercase tracking-tight">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

const SecondaryNav = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams?.get('tab');

  let title = "Menu";
  let items: any[] = [];

  if ((pathname || '').startsWith('/studio')) {
    if ((pathname || '').startsWith('/studio/commerce')) {
      title = "Commerce";
      items = COMMERCE_SUB_NAV;
    } else if ((pathname || '').startsWith('/studio/design')) {
      title = "Design";
      items = DESIGN_SUB_NAV;
    } else {
      title = STUDIO_SUB_NAV.find(i => i.href === pathname)?.label || "Marketing";
      items = STUDIO_SUB_NAV;
    }
  } else if ((pathname || '').startsWith('/brand')) {
    title = "Brand";
    items = BRAND_SUB_NAV;
  } else if ((pathname || '').startsWith('/commerce')) {
    title = "Commerce";
    items = COMMERCE_SUB_NAV;
  }

  return (
    <div className="w-[240px] bg-white border-r border-[#E0E0E0] liquid-glass z-20 flex flex-col">
      <div className="h-14 flex items-center px-6 border-b border-[#E0E0E0]">
        <h3 className="text-sm font-semibold text-[#333333]">{title}</h3>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {items.map((item) => {
          let isActive = false;

          if (item.href.includes('?tab=')) {
            const itemTab = item.href.split('tab=')[1];
            // Active if paths match AND tabs match
            // Also handle case where no tab is present but it's the default (overview)
            const isDefault = !currentTab && itemTab === 'overview';
            isActive = (pathname === item.href.split('?')[0]) && (currentTab === itemTab || isDefault);
          } else {
            isActive = pathname === item.href || (item.id === 'overview' && (pathname === '/studio' || pathname === '/'));
          }

          return (
            <Link key={item.id} href={item.href}>
              <div className={cn(
                "relative h-11 flex items-center px-4 rounded-md cursor-pointer transition-colors group",
                isActive ? "bg-[#E0EBFF] text-[#2B71FF]" : "text-[#666666] hover:bg-[#F8F9FA]"
              )}>
                {isActive && <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#2B71FF] rounded-r" />}
                <item.icon className={cn("w-5 h-5 mr-3", isActive ? "text-[#2B71FF]" : "text-[#666666]")} />
                <span className="text-sm font-medium">{item.label}</span>
                {item.badge && (
                  <Badge className="ml-auto bg-[#2B71FF] text-white rounded-full h-5 min-w-5 flex items-center justify-center p-0 text-[10px]">
                    {item.badge}
                  </Badge>
                )}
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

const Topbar = () => {
  const { currentProject, projects, setCurrentProject } = useProject();
  const [user, setUser] = React.useState<any>(null);
  const router = useRouter();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);

  // Flatten navigation for search
  const searchOptions = React.useMemo(() => [
    ...STUDIO_SUB_NAV.map(i => ({ ...i, category: 'Marketing' })),
    ...BRAND_SUB_NAV.map(i => ({ ...i, category: 'Brand' })),
    ...COMMERCE_SUB_NAV.map(i => ({ ...i, category: 'Commerce' })),
    ...DESIGN_SUB_NAV.map(i => ({ ...i, category: 'Design' })),
  ], []);

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return [];
    const lower = searchQuery.toLowerCase();
    return searchOptions.filter(item =>
      item.label.toLowerCase().includes(lower) ||
      item.category.toLowerCase().includes(lower)
    ).slice(0, 8); // Limit results
  }, [searchQuery, searchOptions]);

  React.useEffect(() => {
    // Fetch user data from API
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/user');
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      window.location.href = '/auth/login';
    }
  };

  const getUserInitials = () => {
    if (user?.user_metadata?.name) {
      return user.user_metadata.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-[#E0E0E0] liquid-glass z-40">
      <div className="flex items-center gap-6 flex-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 px-3 gap-2 hover:bg-[#F8F9FA] rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[#2B71FF] to-[#1E5FE0] flex items-center justify-center text-white font-bold text-xs">
                  {currentProject?.name.substring(0, 2).toUpperCase() || 'P'}
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-[#333333]">
                    {currentProject?.name || 'Select Project'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {projects.length} project{projects.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-[#666666]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Projects</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => setCurrentProject(project)}
                className={currentProject?.id === project.id ? 'bg-accent' : ''}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[#2B71FF] to-[#1E5FE0] flex items-center justify-center text-white font-bold text-xs">
                    {project.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{project.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {project.website_url}
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/projects/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Create New Project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
          <Input
            placeholder="Search global..."
            className="pl-10 h-10 bg-[#F8F9FA] border-[#E0E0E0] rounded-lg text-sm"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            onBlur={() => setTimeout(() => setIsSearchOpen(false), 200)} // Delay for click to register
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#666666] font-medium bg-white border border-[#E0E0E0] px-1.5 py-0.5 rounded">⌘ K</span>

          {/* Autocomplete Dropdown */}
          {isSearchOpen && searchQuery && filteredOptions.length > 0 && (
            <div className="absolute top-12 left-0 w-full bg-white border border-[#E0E0E0] rounded-lg shadow-xl z-50 overflow-hidden max-h-[300px] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
              <div className="p-1">
                {filteredOptions.map((item) => (
                  <button
                    key={item.id}
                    className="w-full flex items-center px-3 py-2 text-sm text-[#333333] hover:bg-[#F8F9FA] rounded-md transition-colors text-left"
                    onClick={() => {
                      router.push(item.href);
                      setSearchQuery("");
                      setIsSearchOpen(false);
                    }}
                  >
                    <item.icon className="w-4 h-4 mr-3 text-[#666666]" />
                    <div className="flex-1">
                      <span className="font-medium">{item.label}</span>
                      <span className="ml-2 text-xs text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">{item.category}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-10 w-10 text-[#666666] hover:bg-[#F8F9FA]">
          <Bell className="w-5 h-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
              <Avatar className="h-8 w-8 border border-[#E0E0E0]">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="bg-[#2B71FF] text-white font-semibold text-xs">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || 'Loading...'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/settings/profile')}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')}>
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                handleLogout();
              }}
              className="text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-700"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

const ContextBar = () => {
  return null;
};

export const Shell = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen w-full bg-[#F8F9FA] overflow-hidden font-sans">
      <MasterNav />
      <SecondaryNav />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar />
        <ContextBar />
        <main className="flex-1 overflow-y-auto bg-[#F8F9FA] p-8">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
      <CopilotWidget />
    </div>
  );
};
