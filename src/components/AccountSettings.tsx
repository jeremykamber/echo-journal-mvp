import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authService, userService } from '@/services/storage/RepositoryFactory';
import { toast } from 'sonner';
import { LogOut, User, Mail, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const AccountSettings: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.name || '');
  const [loading, setLoading] = useState(false);

  // Update local state when profile changes
  React.useEffect(() => {
    if (profile?.name) setName(profile.name);
  }, [profile]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { success, error } = await userService.updateUserProfile(user.id, { name });
      if (!success) throw error;
      await refreshProfile();
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await authService.logout();
      if (error) throw error;
      toast.success('Logged out successfully');
      window.location.href = '/login';
    } catch (error: any) {
      toast.error(error.message || 'Logout failed');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 font-sans">
      <Card className="glass-card p-0 overflow-hidden border-none shadow-subtle">
        <CardHeader className="pb-4 pt-8 px-8">
          <CardTitle className="text-2xl font-serif font-medium flex items-center gap-3 text-primary-900">
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            Personal Information
          </CardTitle>
          <CardDescription className="text-muted-foreground font-medium pl-12">
            Manage your profile details and how you appear in Echo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pb-10 px-8">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-primary-900 font-semibold ml-1">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                value={user?.email || ''}
                className="pl-11 h-12 bg-muted/30 border-border/50 text-muted-foreground cursor-not-allowed rounded-2xl"
                disabled
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="acc-name" className="text-primary-900 font-semibold ml-1">Display Name</Label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="acc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-11 h-12 bg-white/50 border-border/80 text-primary-900 focus:bg-white transition-all rounded-2xl"
                placeholder="Enter your name"
              />
            </div>
          </div>
          <Button
            onClick={handleUpdateProfile}
            disabled={loading || name === profile?.name}
            className="w-full sm:w-auto font-bold h-11 px-8 shadow-subtle"
            size="default"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/10 bg-destructive/5 rounded-2xl overflow-hidden shadow-sm">
        <CardHeader className="pb-4 pt-6 px-8 border-b border-destructive/5">
          <CardTitle className="text-xl font-serif font-medium flex items-center gap-3 text-destructive">
            <div className="p-2 rounded-full bg-destructive/10">
              <LogOut className="h-5 w-5" />
            </div>
            Sign Out
          </CardTitle>
          <CardDescription className="text-destructive/70 font-medium pl-12">
            Safely end your session on this device.
          </CardDescription>
        </CardHeader>
        <CardFooter className="py-6 px-8">
          <Button
            variant="destructive"
            onClick={handleLogout}
            className="w-full sm:w-auto font-bold rounded-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

const CardFooter: React.FC<CardFooterProps> = ({ children, className }) => (
  <div className={`p-6 pt-0 ${className}`}>{children}</div>
);
