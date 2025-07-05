'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Layout, Info } from 'lucide-react';
import { Button } from '@/components/button';
import LogViewerContainer from '@/components/LogViewerContainer';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/dialog';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import { createBrowserComponentClient } from '@/utils/supabase/client';
import { WelcomeModal, WelcomeModalRef } from '@/components/WelcomeModal';

// Same key used in WelcomeModal component to avoid showing both modals
const WELCOME_MODAL_SHOWN_KEY = 'welcome_modal_shown';

export default function Home() {
  const [open, setOpen] = useState(false);
  const [shouldShowWelcomeModal, setShouldShowWelcomeModal] = useState(false);
  const welcomeModalRef = useRef<WelcomeModalRef>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [user, setUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createBrowserComponentClient();

  // Effect to open welcome modal when requested
  useEffect(() => {
    if (shouldShowWelcomeModal && welcomeModalRef.current) {
      welcomeModalRef.current.setOpen(true);
      setShouldShowWelcomeModal(false);
    }
  }, [shouldShowWelcomeModal]);

  useEffect(() => {
    // Try to get user information if logged in
    const getUserInfo = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        // Pre-fill email from user data
        setEmail(session.user.email || '');
        
        // Pre-fill name from user metadata if available
        if (session.user.user_metadata?.full_name) {
          setName(session.user.user_metadata.full_name);
        } else if (session.user.user_metadata?.name) {
          setName(session.user.user_metadata.name);
        }
      }
    };
    
    getUserInfo();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Check if the email already exists in the waitlist
      const { data: existingSignups, error: checkError } = await supabase
        .from('waitlist')
        .select('email')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();
      
      if (checkError) {
        throw new Error('Error checking waitlist status');
      }
      
      if (existingSignups) {
        setError('This email is already on our waitlist');
        return;
      }
      
      // Add to waitlist
      const { error: insertError } = await supabase
        .from('waitlist')
        .insert([
          { 
            email: email.toLowerCase().trim(), 
            name: name.trim(),
            source: 'demo_banner'
          }
        ]);
      
      if (insertError) {
        throw new Error('Error joining waitlist');
      }
      
      // Success
      setIsSubmitted(true);
      
      // Mark the modal as shown
      localStorage.setItem(WELCOME_MODAL_SHOWN_KEY, 'true');
      
      // Auto-close after 3 seconds
      setTimeout(() => {
        setOpen(false);
      }, 3000);
      
    } catch (err: any) {
      console.error('Error joining waitlist:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container py-4 px-5 space-y-3 max-h-screen h-screen flex flex-col overflow-hidden">
      <div className="page-header mb-2 flex-shrink-0">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">
          Welcome to your log analytics dashboard
        </p>
      </div>

      {/* Demo Environment Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-amber-600" />
          <p className="text-amber-800">
            Welcome! This demo environment contains sample data for you to check out
          </p>
        </div>
        <Button 
          variant="default"
          className="bg-amber-600 hover:bg-amber-700 text-white"
          onClick={() => setShouldShowWelcomeModal(true)}
        >
          Learn More
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <LogViewerContainer />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Share feedback</DialogTitle>
            <DialogDescription>
              Let us know how we can improve the platform
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input 
                id="name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="feedback">Feedback</Label>
              <textarea 
                id="feedback"
                className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Tell us what you like and what we can improve..."
              ></textarea>
            </div>
          </div>
          
          {error && (
            <div className="text-sm font-medium text-destructive mb-4">
              {error}
            </div>
          )}
          
          {isSubmitted ? (
            <div className="text-sm font-medium text-green-600 mb-4">
              Thank you for your feedback!
            </div>
          ) : (
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send feedback'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Add the WelcomeModal */}
      <WelcomeModal ref={welcomeModalRef} />
    </div>
  );
} 