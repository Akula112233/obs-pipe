'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { usePathname } from 'next/navigation';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/dialog';
import { Button } from '@/components/button';
import { Input } from './input';
import { Label } from '@/components/label';
import { createBrowserComponentClient } from '@/utils/supabase/client';

// Key used for localStorage
const WELCOME_MODAL_SHOWN_KEY = 'welcome_modal_shown';

// Define ref type
export type WelcomeModalRef = {
  setOpen: (open: boolean) => void;
};

export const WelcomeModal = forwardRef<WelcomeModalRef>((props, ref) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [user, setUser] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createBrowserComponentClient();
  const pathname = usePathname();

  // Expose setOpen method through the ref
  useImperativeHandle(ref, () => ({
    setOpen,
  }));

  // The automatic display functionality has been removed. 
  // The modal will now only open when explicitly triggered elsewhere.
  // The component is kept in the layout for legacy purposes, but won't auto-show.

  useEffect(() => {
    // Only prefill user info if the modal is opened
    if (open) {
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
    }
  }, [open, supabase]);

  const handleClose = () => {
    // Mark the modal as shown - keeping this for backward compatibility
    localStorage.setItem(WELCOME_MODAL_SHOWN_KEY, 'true');
    setOpen(false);
  };

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
            source: 'demo_modal'
          }
        ]);
      
      if (insertError) {
        throw new Error('Error joining waitlist');
      }
      
      // Success
      setIsSubmitted(true);
      
      // Still mark the modal as shown when they join the waitlist
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">Welcome to the Demo Environment!</DialogTitle>
          <DialogDescription className="text-center text-lg pt-2">
            This is a limited demo with (interactive!) test data.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-amber-800">
            <p className="font-medium">Demo Environment Notice</p>
            <p className="text-sm mt-1">
              We're still in closed beta. For full access to the platform, please join our waitlist below.
              Feel free to <a href="https://runsift.com/booking-page.html" target="_blank" rel="noopener noreferrer" className="underline font-medium">book a demo</a> if you'd like to see more!
            </p>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">What you can do in this playground:</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>See raw demo logging data</li>
              <li>Chat with demo logs to extract insights - try out some of our test prompts (we made some buggy logs!)</li>
              <li>See errors we surfaced, explanations, and relevant logs that correspond to them</li>
              <li>Pipeline -- You can see an example of our pipeline functionality (allows you to use us as a pass-through to your existing vendors)</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">What you can't do:</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>You can't send real data to this playground environment</li>
            </ul>
          </div>
          
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <h3 className="font-medium text-center">Join our waitlist for full access!</h3>
              
              <div>
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>
              
              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}
              
              <div className="flex justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                >
                  Skip for now
                </Button>
                
                <Button
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Join Waitlist'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="text-center py-4">
              <div className="bg-green-50 border border-green-200 rounded-md p-4 text-green-800">
                <p className="font-medium">Thank you for joining our waitlist!</p>
                <p className="text-sm mt-1">
                  We'll reach out to you as soon as we're ready to grant you full access.
                </p>
              </div>
            </div>
          )}
        </div>
        
        {isSubmitted && (
          <DialogFooter>
            <Button
              onClick={handleClose}
              className="w-full mt-2"
            >
              Continue to Demo
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}); 