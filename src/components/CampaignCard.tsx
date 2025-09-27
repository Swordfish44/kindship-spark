import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, Users, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import ProgressBar from "./ProgressBar";
import DonationModal from "./DonationModal";
import { useState } from "react";

interface CampaignCardProps {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  currentAmount: number; // Expected in cents
  targetAmount: number;  // Expected in cents
  backers: number;
  daysLeft: number;
  creatorName: string;
  isLiked?: boolean;
  slug?: string;
}

const CampaignCard = ({
  id,
  title,
  description,
  image,
  category,
  currentAmount,
  targetAmount,
  backers,
  daysLeft,
  creatorName,
  isLiked = false,
  slug
}: CampaignCardProps) => {
  const [showDonationModal, setShowDonationModal] = useState(false);
  
  const campaign = {
    id,
    title,
    slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    organizer: {
      full_name: creatorName
    }
  };
  return (
    <Link to={`/campaign/${slug || id}`}>
      <Card className="overflow-hidden shadow-card hover:shadow-card-hover transition-smooth group cursor-pointer">
        {/* Image */}
        <div className="relative overflow-hidden">
          <img
            src={image}
            alt={title}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="bg-white/90 text-primary font-medium">
              {category}
            </Badge>
          </div>
          <button 
            className="absolute top-3 right-3 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <Heart 
              className={`h-4 w-4 ${isLiked ? 'text-red-500 fill-current' : 'text-muted-foreground'}`} 
            />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
            {description}
          </p>

          {/* Progress */}
          <div className="mb-4">
            <ProgressBar current={currentAmount} target={targetAmount} />
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Users className="h-4 w-4" />
                <span>{backers} backers</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{daysLeft} days left</span>
              </div>
            </div>
          </div>

          {/* Creator */}
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="text-muted-foreground">by </span>
              <span className="font-medium text-foreground">{creatorName}</span>
            </div>
            <Button 
              size="sm" 
              className="bg-primary hover:bg-primary/90" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowDonationModal(true);
              }}
            >
              Back This
            </Button>
          </div>
        </div>

        <DonationModal
          isOpen={showDonationModal}
          onClose={() => setShowDonationModal(false)}
          campaign={campaign}
        />
      </Card>
    </Link>
  );
};

export default CampaignCard;