// app/providers.tsx
'use client'

import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, Suspense } from "react"
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import { createBrowserComponentClient } from '@/utils/supabase/client'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY as string || 'phc_Whordxktz7VDRl7lwsiHfzx6957IfHB9F675pOY42yx', {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      person_profiles: 'identified_only', // or 'always' to create profiles for anonymous users as well
      capture_pageview: false // Disable automatic pageview capture, as we capture manually
    })
  }, [])

  return (
    <PHProvider client={posthog}>
      <SuspendedPostHogPageView />
      <PostHogIdentify />
      {children}
    </PHProvider>
  )
}

function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const posthog = usePostHog()

  // Track pageviews
  useEffect(() => {
    if (pathname && posthog) {
      let url = window.origin + pathname
      if (searchParams.toString()) {
        url = url + "?" + searchParams.toString();
      }

      posthog.capture('$pageview', { '$current_url': url })
    }
  }, [pathname, searchParams, posthog])

  return null
}

// Wrap PostHogPageView in Suspense to avoid the useSearchParams usage above
// from de-opting the whole app into client-side rendering
// See: https://nextjs.org/docs/messages/deopted-into-client-rendering
function SuspendedPostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageView />
    </Suspense>
  )
}

// Component to identify users via Supabase auth
function PostHogIdentify() {
  const posthog = usePostHog()
  const supabase = createBrowserComponentClient()
  
  useEffect(() => {
    // Function to identify user with PostHog
    const identifyUser = async () => {
      try {
        // Get the current session
        const { data: { session } } = await supabase.auth.getSession()
        
        // If user is authenticated, identify them in PostHog
        if (session?.user) {
          const { id, email } = session.user
          
          // Identify the user in PostHog with their Supabase ID and set email as a property
          posthog.identify(id, { 
            email,
            supabase_id: id
          })
          
          console.log('User identified in PostHog:', email)
        }
      } catch (error) {
        console.error('Error identifying user in PostHog:', error)
      }
    }
    
    if (posthog) {
      identifyUser()
    }
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Identify the user when they sign in
        posthog.identify(session.user.id, {
          email: session.user.email,
          supabase_id: session.user.id
        })
        console.log('User signed in and identified in PostHog:', session.user.email)
      } else if (event === 'SIGNED_OUT') {
        // Reset the user ID when they sign out
        posthog.reset()
        console.log('User signed out, PostHog identity reset')
      }
    })
    
    // Clean up subscription when component unmounts
    return () => {
      subscription.unsubscribe()
    }
  }, [posthog, supabase])
  
  return null
}