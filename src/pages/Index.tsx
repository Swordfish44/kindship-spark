import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Briefcase, Users, Newspaper, Home, Wheat, Search, Scale, Heart, Trees, Vote, Folder, GraduationCap, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import CampaignCard from "@/components/CampaignCard";
import heroImage from "@/assets/hero-crowdfunding.jpg";

// Fix for Link import issue

const Index = () => {
  // Mock data for campaigns
  const featuredCampaigns = [
    {
      id: "1",
      title: "Revolutionary Solar Panel Technology for Rural Communities",
      description: "Bringing clean, affordable energy to underserved communities with innovative solar panel designs.",
      image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=500",
      category: "Technology",
      currentAmount: 45800,
      targetAmount: 75000,
      backers: 234,
      daysLeft: 18,
      creatorName: "GreenTech Solutions",
      isLiked: true
    },
    {
      id: "2", 
      title: "Educational Mobile Library for Remote Schools",
      description: "A mobile library bringing books and digital learning resources to remote schools across the region.",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500",
      category: "Education",
      currentAmount: 23500,
      targetAmount: 40000,
      backers: 156,
      daysLeft: 25,
      creatorName: "Books for All Initiative"
    },
    {
      id: "3",
      title: "Sustainable Urban Farming Project",
      description: "Creating vertical farms in urban areas to provide fresh produce to local communities.",
      image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=500",
      category: "Environment",
      currentAmount: 67200,
      targetAmount: 100000,
      backers: 412,
      daysLeft: 12,
      creatorName: "Urban Harvest Co."
    }
  ];

  const categories = [
    { name: "Business Start Engine", count: 1250, icon: Briefcase },
    { name: "Community Development", count: 988, icon: Users },
    { name: "Current Events", count: 654, icon: Newspaper },
    { name: "Emergency Housing", count: 432, icon: Home },
    { name: "Farming and Food Deserts", count: 321, icon: Wheat },
    { name: "Investigations", count: 234, icon: Search },
    { name: "Legal Defense", count: 195, icon: Scale },
    { name: "Medical", count: 167, icon: Heart },
    { name: "Parks and Greenspace", count: 143, icon: Trees },
    { name: "Political", count: 123, icon: Vote },
    { name: "Trade Education", count: 76, icon: GraduationCap },
    { name: "Transportation", count: 54, icon: Truck }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-800">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative container py-24 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight drop-shadow-lg">
                <span className="text-yellow-300 drop-shadow-lg">Community Capital</span>
                <br />
                for Lasting Power
              </h1>
              <p className="text-lg lg:text-xl mb-8 text-white/90 leading-relaxed drop-shadow">
                The first definitive platform for community-driven wealth creation. 
                Fund transformative projects that build lasting economic independence and prosperity.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 font-semibold shadow-xl transform hover:scale-105 transition-all duration-200" asChild>
                  <Link to="/create-campaign">
                    Start Your Campaign
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="text-blue-600 border-white/50 bg-white/90 hover:bg-white hover:text-blue-700 backdrop-blur-sm shadow-lg font-semibold">
                  Explore Projects
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-2xl blur-2xl opacity-30" />
              <img
                src={heroImage}
                alt="Crowdfunding Success Stories"
                className="relative rounded-2xl shadow-2xl w-full h-auto border-2 border-white/20"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary mb-2">$12.5M</div>
              <div className="text-muted-foreground">Total Funded</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-accent mb-2">3,247</div>
              <div className="text-muted-foreground">Projects Launched</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-warning mb-2">89%</div>
              <div className="text-muted-foreground">Success Rate</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary mb-2">45,892</div>
              <div className="text-muted-foreground">Happy Backers</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Campaigns */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Featured Campaigns</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Discover groundbreaking projects from passionate creators around the world
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredCampaigns.map((campaign) => (
              <CampaignCard key={campaign.id} {...campaign} />
            ))}
          </div>
          <div className="text-center mt-12">
            <Button size="lg" variant="outline">
              View All Campaigns
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-gradient-to-r from-slate-50 to-blue-50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-gray-800">Browse by Category</h2>
            <p className="text-gray-600 text-lg">
              Find projects that match your interests
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {categories.map((category, index) => {
              const Icon = category.icon;
              return (
                <div
                  key={index}
                  className="p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group transform hover:-translate-y-1 border border-gray-100"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-200">
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="font-bold mb-2 text-gray-800 group-hover:text-blue-600 transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-sm text-gray-500 font-medium">
                      {category.count} projects
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container">
          <div className="bg-card rounded-2xl shadow-card p-8 lg:p-12 text-center card-gradient">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Ready to Launch Your Idea?</h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              Join our community of innovators and turn your vision into reality. 
              Get the funding and support you need to make an impact.
            </p>
            <Button size="lg" className="hero-gradient text-white font-semibold" asChild>
              <Link to="/create-campaign">
                Start Your Campaign Today
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;