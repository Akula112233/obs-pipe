'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const SECTIONS = [
  { id: 'contact', label: 'Contact Us' },
  { id: 'story', label: 'Our Story' },
  { id: 'about', label: 'About SiftDev' },
  { id: 'next', label: "What's Next" },
  { id: 'licenses', label: 'Licenses' }
];

export default function About() {
  const [activeSection, setActiveSection] = useState('');
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-20% 0px -80% 0px'
      }
    );

    Object.values(sectionRefs.current).forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = sectionRefs.current[sectionId];
    if (element) {
      const offset = 100; // Adjust this value based on your header height
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: elementPosition - offset,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="min-h-screen">
      {/* Navigation - now with title */}
      <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50 border-b">
        <nav className="container mx-auto py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="text-sm font-medium">Back</span>
              </Link>
              <h1 className="text-xl font-semibold">About SiftDev</h1>
            </div>

            <div className="flex gap-2">
              {SECTIONS.map(section => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`text-sm font-medium px-3 py-1.5 rounded-md transition-all ${
                    activeSection === section.id
                      ? 'bg-secondary text-secondary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/10'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </div>
        </nav>
      </div>

      {/* Content */}
      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/50 shadow-sm p-6 rounded-lg mb-12">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-2">
                <div className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium px-2.5 py-0.5 rounded-full h-fit">
                  Coming Soon
                </div>
                <div className="space-y-1">
                  <p className="text-gray-900 dark:text-gray-100 font-medium">
                    AI-powered pipeline configuration and optimization
                  </p>
                  <button 
                    onClick={() => scrollToSection('next')}
                    className="text-primary hover:text-primary/80 text-sm inline-flex items-center gap-1"
                  >
                    Learn more about our AI features
                    <span className="text-xs">→</span>
                  </button>
                </div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Want early access?{' '}
                <a href="mailto:earlyaccess@runsift.com" className="text-primary hover:text-primary/80 font-medium">
                  Contact us
                </a>
              </div>
            </div>
          </div>

          <div className="space-y-24">
            <div id="contact" ref={el => sectionRefs.current.contact = el}>
              <h2 className="text-3xl font-semibold mb-6">Contact Us</h2>
              <ul className="space-y-3">
                <li>Email: <a href="mailto:founders@runsift.com" className="text-primary hover:text-primary/80">founders@runsift.com</a></li>
                <li>Phone: (856) 492-4098</li>
              </ul>
            </div>

            <div id="story" ref={el => sectionRefs.current.story = el}>
              <h2 className="text-3xl font-semibold mb-6">Our Story</h2>
              <div className="space-y-4 text-lg leading-relaxed">
                <p>
                  Having worked at some of the largest observability companies, we've witnessed teams
                  struggle with complex data routing and delivery across various platforms. When we discovered
                  Vector, we were immediately excited by its potential to democratize data processing and
                  make pipelines more accessible. However, we found that installing and configuring Vector
                  was often a significant challenge for teams.
                </p>
                <p>
                  This led us to create SiftDev - a simple, intuitive interface for Vector that makes
                  it easier for teams to visualize, configure, and monitor their data pipelines.
                  We're just at the start of our journey and committed to building features that the 
                  community needs and making Vector's capabilities more accessible to everyone. We would
                  love to hear any feedback you have!
                </p>
              </div>
            </div>

            <div id="about" ref={el => sectionRefs.current.about = el}>
              <h2 className="text-3xl font-semibold mb-6">About SiftDev</h2>
              <p className="text-lg mb-6">
                SiftDev is a web-based interface for Vector that provides:
              </p>
              <ul className="list-disc pl-6 mb-8 space-y-3 text-lg">
                <li>Visual pipeline builder and configuration editor</li>
                <li>Real-time metrics and monitoring</li>
                <li>Live log viewing and filtering</li>
                <li>Component-level performance insights</li>
              </ul>
              
              <h3 className="text-2xl font-semibold mb-4">Current Limitations</h3>
              <ul className="list-disc pl-6 space-y-3 text-lg">
                <li>Requires Vector to be running with GraphQL API enabled</li>
                <li>Limited to local Vector instances (no remote management yet)</li>
                <li>Configuration changes require pipeline restart</li>
                <li>Basic authentication only</li>
              </ul>
            </div>

            <div id="next" ref={el => sectionRefs.current.next = el}>
              <h2 className="text-3xl font-semibold mb-6">What's Next</h2>
              <div className="space-y-12">
                <div>
                  <h3 className="text-2xl font-semibold mb-4">AI-Powered Configuration Analysis</h3>
                  <ul className="list-disc pl-6 space-y-3 text-lg">
                    <li><strong>Smart Pipeline Optimization:</strong> Automated analysis of your logging data to suggest configuration improvements</li>
                    <li><strong>Custom Recommendations:</strong> Personalized suggestions based on your specific data patterns and requirements. Interact with our AI to refine suggestions via an intuitive chat interface.</li>
                    <li><strong>Expert Review:</strong> Manual tuning of AI-generated recommendations by our team</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-2xl font-semibold mb-4">Expanded Data Support</h3>
                  <ul className="list-disc pl-6 space-y-3 text-lg">
                    <li><strong>Metrics Visualization:</strong> Interactive dashboards for metrics pipeline monitoring and optimization</li>
                    <li><strong>Distributed Tracing:</strong> End-to-end visibility with trace-aware routing capabilities</li>
                    <li><strong>Unified Observability:</strong> Integrated view across logs, metrics, and traces</li>
                  </ul>
                </div>
              </div>
            </div>

            <div id="licenses" ref={el => sectionRefs.current.licenses = el} className="mb-12">
              <h2 className="text-3xl font-semibold mb-6">Licenses and Acknowledgments</h2>
              
              <div className="space-y-8">
                <div>
                  <h3 className="text-2xl font-semibold mb-4">Vector</h3>
                  <p className="text-lg">
                    Vector is licensed under the Mozilla Public License Version 2.0.
                    For more information, visit{' '}
                    <a 
                      href="https://github.com/vectordotdev/vector" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80"
                    >
                      Vector's GitHub repository
                    </a>.
                  </p>
                </div>

                <div>
                  <h3 className="text-2xl font-semibold mb-4">Open Source Libraries</h3>
                  <ul className="list-disc pl-6 space-y-2 text-lg">
                    <li>Next.js - MIT License</li>
                    <li>Tailwind CSS - MIT License</li>
                    <li>Lucide Icons - ISC License</li>
                    <li>Monaco Editor - MIT License</li>
                    <li>js-yaml - MIT License</li>
                    <li>dagre - MIT License</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 