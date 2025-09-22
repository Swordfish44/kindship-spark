import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { ArrowLeft, Upload, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

const campaignSchema = z.object({
  title: z.string().min(10, "Title must be at least 10 characters").max(100, "Title must be less than 100 characters"),
  description: z.string().min(100, "Description must be at least 100 characters").max(5000, "Description must be less than 5000 characters"),
  funding_goal: z.number().min(100, "Funding goal must be at least $100").max(1000000, "Funding goal must be less than $1,000,000"),
  category_id: z.string().min(1, "Please select a category"),
  image_url: z.string().optional(),
});

interface Category {
  id: string;
  name: string;
  color_hex: string;
}

interface RewardTier {
  id?: string;
  title: string;
  description: string;
  minimum_amount: number;
  quantity_limit?: number;
  estimated_delivery?: string;
}

type CampaignFormData = z.infer<typeof campaignSchema>;

const CreateCampaign = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [rewardTiers, setRewardTiers] = useState<RewardTier[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: "",
      description: "",
      funding_goal: 1000,
      category_id: "",
      image_url: "",
    },
  });

  useEffect(() => {
    checkAuth();
    fetchCategories();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create a campaign.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }
    setCurrentUser(user);
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("campaign_categories")
        .select("*")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Error",
        description: "Failed to load categories.",
        variant: "destructive",
      });
    }
  };

  const addRewardTier = () => {
    setRewardTiers([
      ...rewardTiers,
      {
        title: "",
        description: "",
        minimum_amount: 25,
        quantity_limit: undefined,
        estimated_delivery: "",
      }
    ]);
  };

  const updateRewardTier = (index: number, field: keyof RewardTier, value: any) => {
    const updated = [...rewardTiers];
    updated[index] = { ...updated[index], [field]: value };
    setRewardTiers(updated);
  };

  const removeRewardTier = (index: number) => {
    setRewardTiers(rewardTiers.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: CampaignFormData) => {
    if (!currentUser) return;

    setIsSubmitting(true);
    try {
      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          title: data.title,
          description: data.description,
          funding_goal: data.funding_goal,
          category_id: data.category_id,
          image_url: data.image_url || null,
          organizer_id: currentUser.id,
          status: "draft",
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Create reward tiers if any
      if (rewardTiers.length > 0) {
        const validTiers = rewardTiers.filter(tier => 
          tier.title.trim() && tier.description.trim() && tier.minimum_amount > 0
        );

        if (validTiers.length > 0) {
          const { error: tiersError } = await supabase
            .from("reward_tiers")
            .insert(
              validTiers.map(tier => ({
                campaign_id: campaign.id,
                title: tier.title,
                description: tier.description,
                minimum_amount: tier.minimum_amount,
                quantity_limit: tier.quantity_limit || null,
                estimated_delivery: tier.estimated_delivery || null,
              }))
            );

          if (tiersError) throw tiersError;
        }
      }

      toast({
        title: "Campaign created!",
        description: "Your campaign has been created successfully. You can now review and publish it.",
      });

      navigate(`/campaign/${campaign.slug || campaign.id}`);
    } catch (error: any) {
      console.error("Error creating campaign:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create Your Campaign</h1>
            <p className="text-muted-foreground">Tell your story and bring your project to life</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Title *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter a compelling title for your campaign"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Choose a clear, compelling title that describes your project (10-100 characters)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="funding_goal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Funding Goal ($) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="100"
                          max="1000000"
                          placeholder="1000"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Set a realistic funding goal between $100 and $1,000,000
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Image</FormLabel>
                      <FormControl>
                        <div className="space-y-4">
                          <Input 
                            placeholder="https://example.com/image.jpg"
                            {...field}
                          />
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Upload className="h-4 w-4" />
                            Add an image URL or upload an image to make your campaign more appealing
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Campaign Story</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tell Your Story *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your project in detail. What are you building? Why does it matter? How will the funds be used?"
                          className="min-h-[200px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Write a compelling story about your project (100-5000 characters). Include what you're building, why it matters, and how funds will be used.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Reward Tiers */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Reward Tiers</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Optional rewards to incentivize backers
                    </p>
                  </div>
                  <Button type="button" variant="outline" onClick={addRewardTier}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Reward
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {rewardTiers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No rewards added yet. Add some rewards to incentivize backers!</p>
                  </div>
                ) : (
                  rewardTiers.map((tier, index) => (
                    <div key={index} className="p-4 border rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">Reward Tier #{index + 1}</h4>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm"
                          onClick={() => removeRewardTier(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Reward Title</label>
                          <Input
                            placeholder="Early Bird Special"
                            value={tier.title}
                            onChange={(e) => updateRewardTier(index, 'title', e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium">Minimum Amount ($)</label>
                          <Input
                            type="number"
                            min="1"
                            value={tier.minimum_amount}
                            onChange={(e) => updateRewardTier(index, 'minimum_amount', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">Description</label>
                        <Textarea
                          placeholder="Describe what backers will receive..."
                          value={tier.description}
                          onChange={(e) => updateRewardTier(index, 'description', e.target.value)}
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Quantity Limit (Optional)</label>
                          <Input
                            type="number"
                            min="1"
                            placeholder="Leave empty for unlimited"
                            value={tier.quantity_limit || ''}
                            onChange={(e) => updateRewardTier(index, 'quantity_limit', e.target.value ? parseInt(e.target.value) : undefined)}
                          />
                        </div>
                        
                        <div>
                          <label className="text-sm font-medium">Estimated Delivery</label>
                          <Input
                            type="date"
                            value={tier.estimated_delivery || ''}
                            onChange={(e) => updateRewardTier(index, 'estimated_delivery', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" asChild>
                <Link to="/">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Campaign"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default CreateCampaign;