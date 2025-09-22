import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Circle, Upload, DollarSign } from 'lucide-react';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import DocumentUpload from './DocumentUpload';

const organizerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  organizationName: z.string().optional(),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  campaignTitle: z.string().min(5, 'Campaign title must be at least 5 characters'),
  campaignDescription: z.string().min(50, 'Description must be at least 50 characters'),
  fundingGoal: z.number().min(0, 'Funding goal must be 0 or greater').optional(),
  socialMediaLinks: z.object({
    facebook: z.string().url().optional().or(z.literal('')),
    twitter: z.string().url().optional().or(z.literal('')),
    instagram: z.string().url().optional().or(z.literal('')),
  }).optional(),
});

type OrganizerFormData = z.infer<typeof organizerSchema>;

const OrganizerOnboarding = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [stripeOnboarding, setStripeOnboarding] = useState(false);
  const [documentUploads, setDocumentUploads] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<OrganizerFormData>({
    resolver: zodResolver(organizerSchema),
    defaultValues: {
      fullName: '',
      organizationName: '',
      email: '',
      phone: '',
      campaignTitle: '',
      campaignDescription: '',
      fundingGoal: 0,
      socialMediaLinks: {
        facebook: '',
        twitter: '',
        instagram: '',
      },
    },
  });

  const steps = [
    { number: 1, title: 'Basic Information', icon: Circle },
    { number: 2, title: 'Campaign Details', icon: Circle },
    { number: 3, title: 'Document Verification', icon: Upload },
    { number: 4, title: 'Banking Setup', icon: DollarSign },
  ];

  useEffect(() => {
    // Load existing user data if available
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userData) {
        form.setValue('fullName', userData.full_name || '');
        form.setValue('organizationName', userData.organization_name || '');
        form.setValue('email', userData.email);
        form.setValue('phone', userData.phone || '');
        
        if (userData.social_media_links && typeof userData.social_media_links === 'object') {
          const socialLinks = userData.social_media_links as { facebook?: string; twitter?: string; instagram?: string };
          form.setValue('socialMediaLinks', socialLinks);
        }
      }

      // Load existing documents
      const { data: documents } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id);

      if (documents) {
        const docMap: Record<string, string> = {};
        documents.forEach(doc => {
          docMap[doc.document_type] = doc.file_url;
        });
        setDocumentUploads(docMap);
      }

    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const saveBasicInfo = async (data: OrganizerFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: data.email,
          full_name: data.fullName,
          organization_name: data.organizationName,
          phone: data.phone,
          social_media_links: data.socialMediaLinks,
        });

      if (error) throw error;

      toast({
        title: "Information saved",
        description: "Your basic information has been saved successfully.",
      });

    } catch (error) {
      console.error('Error saving basic info:', error);
      toast({
        title: "Save failed",
        description: "Failed to save information. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const createCampaignDraft = async (data: OrganizerFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const slug = await generateSlug(data.campaignTitle);

      const { error } = await supabase
        .from('campaigns')
        .insert({
          organizer_id: user.id,
          title: data.campaignTitle,
          description: data.campaignDescription,
          funding_goal: data.fundingGoal || 0,
          slug,
          status: 'draft',
        });

      if (error) throw error;

      toast({
        title: "Campaign draft created",
        description: "Your campaign has been saved as a draft.",
      });

    } catch (error) {
      console.error('Error creating campaign:', error);
      toast({
        title: "Campaign creation failed",
        description: "Failed to create campaign draft. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const generateSlug = async (title: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .rpc('generate_campaign_slug', { title });

      if (error) throw error;
      return data;
    } catch (error) {
      // Fallback slug generation
      return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
  };

  const initiateStripeOnboarding = async () => {
    try {
      setStripeOnboarding(true);

      const { data, error } = await supabase.functions.invoke('stripe-connect', {
        body: { action: 'create_account_link' },
      });

      if (error) throw error;

      if (data.url) {
        window.location.href = data.url;
      }

    } catch (error) {
      console.error('Stripe onboarding error:', error);
      toast({
        title: "Onboarding failed",
        description: "Failed to start Stripe onboarding. Please try again.",
        variant: "destructive",
      });
    } finally {
      setStripeOnboarding(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      const isValid = await form.trigger(['fullName', 'email', 'phone']);
      if (isValid) {
        await saveBasicInfo(form.getValues());
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      const isValid = await form.trigger(['campaignTitle', 'campaignDescription']);
      if (isValid) {
        await createCampaignDraft(form.getValues());
        setCurrentStep(3);
      }
    } else if (currentStep === 3) {
      const requiredDocs = ['government_id_front', 'government_id_back', 'proof_of_address'];
      const uploadedRequiredDocs = requiredDocs.filter(doc => documentUploads[doc]);
      
      if (uploadedRequiredDocs.length < requiredDocs.length) {
        toast({
          title: "Documents required",
          description: "Please upload all required documents before proceeding.",
          variant: "destructive",
        });
        return;
      }
      setCurrentStep(4);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data: OrganizerFormData) => {
    try {
      await saveBasicInfo(data);
      await createCampaignDraft(data);
      navigate('/dashboard');
    } catch (error) {
      // Error handling is done in individual functions
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Legal Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="organizationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter organization name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter your email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator className="my-6" />

              <h4 className="font-medium mb-4">Social Media Links (Optional)</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="socialMediaLinks.facebook"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Facebook</FormLabel>
                      <FormControl>
                        <Input placeholder="https://facebook.com/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="socialMediaLinks.twitter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Twitter</FormLabel>
                      <FormControl>
                        <Input placeholder="https://twitter.com/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="socialMediaLinks.instagram"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram</FormLabel>
                      <FormControl>
                        <Input placeholder="https://instagram.com/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Campaign Details</h3>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="campaignTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter a compelling campaign title" {...field} />
                      </FormControl>
                      <FormDescription>
                        Choose a clear, engaging title that explains what you're raising money for.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="campaignDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Description *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Tell your story. Explain what you're raising money for, why it matters, and how the funds will be used."
                          className="min-h-32"
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum 50 characters. Be specific about your cause and how donations will help.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fundingGoal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Funding Goal (Optional)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0"
                          min="0"
                          step="1"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Set a target amount for tracking purposes. You keep what you raise regardless of reaching this goal.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Document Verification</h3>
              <p className="text-muted-foreground mb-6">
                Upload the required documents for identity verification and compliance.
              </p>
              
              <div className="grid gap-4">
                <DocumentUpload
                  documentType="government_id_front"
                  label="Government ID (Front)"
                  description="Upload the front of your driver's license, passport, or state ID"
                  required
                  existingUrl={documentUploads.government_id_front}
                  onUploadComplete={(url) => setDocumentUploads(prev => ({ ...prev, government_id_front: url }))}
                />

                <DocumentUpload
                  documentType="government_id_back"
                  label="Government ID (Back)"
                  description="Upload the back of your driver's license or ID card"
                  required
                  existingUrl={documentUploads.government_id_back}
                  onUploadComplete={(url) => setDocumentUploads(prev => ({ ...prev, government_id_back: url }))}
                />

                <DocumentUpload
                  documentType="proof_of_address"
                  label="Proof of Address"
                  description="Upload a utility bill, bank statement, or lease agreement from the last 90 days"
                  required
                  existingUrl={documentUploads.proof_of_address}
                  onUploadComplete={(url) => setDocumentUploads(prev => ({ ...prev, proof_of_address: url }))}
                />

                <DocumentUpload
                  documentType="business_registration"
                  label="Business Registration (Optional)"
                  description="Upload business license or incorporation documents if applicable"
                  existingUrl={documentUploads.business_registration}
                  onUploadComplete={(url) => setDocumentUploads(prev => ({ ...prev, business_registration: url }))}
                />

                <DocumentUpload
                  documentType="bank_statement"
                  label="Bank Statement (Optional)"
                  description="Upload a recent bank statement for payout verification"
                  existingUrl={documentUploads.bank_statement}
                  onUploadComplete={(url) => setDocumentUploads(prev => ({ ...prev, bank_statement: url }))}
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Banking Setup</h3>
              <p className="text-muted-foreground mb-6">
                Complete Stripe Connect onboarding to receive donations and payouts.
              </p>
              
              <Card className="p-6">
                <div className="text-center space-y-4">
                  <DollarSign className="h-12 w-12 mx-auto text-primary" />
                  <h4 className="text-lg font-medium">Stripe Connect Onboarding</h4>
                  <p className="text-muted-foreground">
                    You'll be redirected to Stripe to securely provide your banking information 
                    and complete the verification process.
                  </p>
                  
                  <div className="bg-muted p-4 rounded-lg text-sm">
                    <h5 className="font-medium mb-2">What you'll need:</h5>
                    <ul className="text-left space-y-1">
                      <li>• Bank account and routing number</li>
                      <li>• Tax identification information</li>
                      <li>• Business details (if applicable)</li>
                    </ul>
                  </div>

                  <Button 
                    onClick={initiateStripeOnboarding}
                    disabled={stripeOnboarding}
                    className="w-full"
                    size="lg"
                  >
                    {stripeOnboarding ? 'Redirecting to Stripe...' : 'Complete Banking Setup'}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Organizer Onboarding</h1>
          <p className="text-muted-foreground">
            Complete the setup process to start your fundraising campaign
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {steps.map((step) => (
              <div key={step.number} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.number 
                    ? 'bg-primary text-white border-primary' 
                    : 'bg-background border-muted-foreground'
                }`}>
                  {currentStep > step.number ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{step.number}</span>
                  )}
                </div>
                <div className="ml-3 hidden md:block">
                  <p className={`text-sm font-medium ${
                    currentStep >= step.number ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {step.number < steps.length && (
                  <div className="w-16 h-0.5 bg-border mx-4 hidden md:block" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <Card className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {renderStepContent()}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                >
                  Back
                </Button>

                {currentStep < 4 ? (
                  <Button type="button" onClick={handleNext}>
                    Next
                  </Button>
                ) : (
                  <Button type="submit">
                    Complete Setup
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default OrganizerOnboarding;