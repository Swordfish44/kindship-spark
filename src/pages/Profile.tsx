import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';
import UserProfile from '@/components/UserProfile';

const Profile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  
  if (!userId) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Profile Not Found</h1>
          <p className="text-muted-foreground">Invalid profile ID.</p>
        </div>
      </div>
    );
  }

  const isCurrentUser = user?.id === userId;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <UserProfile userId={userId} isCurrentUser={isCurrentUser} />
    </div>
  );
};

export default Profile;