import React from "react";
import { Button } from "@/components/ui/button";
import { Search, Heart, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate, useLocation } from "react-router-dom";

const Header: React.FC = () => {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Heart className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">FundFlow</span>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <a href="#" className="text-sm font-medium hover:text-primary transition-smooth">
            Discover
          </a>
          <a href="#" className="text-sm font-medium hover:text-primary transition-smooth">
            Categories
          </a>
          <a href="#" className="text-sm font-medium hover:text-primary transition-smooth">
            How it works
          </a>
        </nav>

        {/* Search */}
        <div className="hidden lg:flex items-center space-x-2 flex-1 max-w-sm mx-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              className="pl-10 bg-muted/50 border-muted"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="md:hidden">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => navigate('/auth')}>
            <User className="h-4 w-4 mr-2" />
            Sign In
          </Button>
          <Button className="hero-gradient text-white font-semibold" onClick={() => navigate('/onboarding')}>
            Start Campaign
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;