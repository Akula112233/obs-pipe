'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './dialog';
import { Button } from './button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './collapsible';
import { ChevronDown, ChevronUp, ExternalLink, Code } from 'lucide-react';

interface IntegrationOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FEATURED_INTEGRATIONS = [
  {
    name: 'Splunk',
    logo: '/logos/splunk.svg',
    description: 'Send logs from Splunk to our platform',
  },
  {
    name: 'Datadog',
    logo: '/logos/datadog.svg',
    description: 'Integrate with your existing Datadog setup',
  },
];

const ADDITIONAL_INTEGRATIONS = [
  { name: 'AWS CloudWatch', logo: '/logos/aws-cloudwatch.svg' },
  { name: 'Elasticsearch', logo: '/logos/elasticsearch.svg' },
  { name: 'Fluent', logo: '/logos/fluent.svg' },
  { name: 'Logstash', logo: '/logos/logstash.svg' },
  { name: 'Loki', logo: '/logos/loki.png' },
  { name: 'Syslog', logo: '/logos/syslog.svg' },
  { name: 'Kafka', logo: '/logos/kafka.svg' },
  { name: 'Redis', logo: '/logos/redis.svg' },
  { name: 'New Relic', logo: '/logos/newrelic.png' },
  { name: 'HTTP', logo: '/logos/http.svg' },
  { name: 'OpenTelemetry', logo: '/logos/opentelemetry.svg' },
  { name: 'File', logo: '/logos/file.svg' },
];

export default function IntegrationOptionsModal({ isOpen, onClose }: IntegrationOptionsModalProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Connect Your Data</DialogTitle>
          <DialogDescription>
            Choose how you want to send log data to our platform
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* SDK Option */}
          <div className="border rounded-lg p-4 hover:border-primary transition-colors">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-md bg-primary/10 text-primary">
                <Code className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium">Use our SDK</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Our lightweight SDK lets you send logs directly from your applications with minimal overhead
                </p>
                <div className="mt-4">
                  <Link 
                    href="/docs" 
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    View documentation <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
          
          {/* Existing Solutions Option */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-medium mb-4">Integrate with Existing Solutions</h3>
            
            {/* Featured integrations */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {FEATURED_INTEGRATIONS.map((integration) => (
                <div 
                  key={integration.name}
                  className="flex flex-col items-center p-4 border rounded-md hover:bg-secondary/50 transition-colors"
                >
                  <div className="relative h-16 w-16 mb-3">
                    <Image 
                      src={integration.logo}
                      alt={integration.name}
                      fill
                      style={{ objectFit: 'contain' }}
                      className="drop-shadow-sm"
                    />
                  </div>
                  <h4 className="font-medium text-center">{integration.name}</h4>
                  <p className="text-xs text-center text-muted-foreground mt-1">
                    {integration.description}
                  </p>
                </div>
              ))}
            </div>
            
            {/* Collapsible section for more integrations */}
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <div className="flex justify-center mb-2">
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="flex items-center gap-1 text-muted-foreground"
                  >
                    {isExpanded ? (
                      <>Show less <ChevronUp className="h-4 w-4" /></>
                    ) : (
                      <>Show more integrations <ChevronDown className="h-4 w-4" /></>
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
              
              <CollapsibleContent>
                <div className="grid grid-cols-4 gap-3 pt-2">
                  {ADDITIONAL_INTEGRATIONS.map((integration) => (
                    <div 
                      key={integration.name}
                      className="flex flex-col items-center p-3 border rounded-md hover:bg-secondary/50 transition-colors"
                    >
                      <div className="relative h-8 w-8 mb-2">
                        <Image 
                          src={integration.logo}
                          alt={integration.name}
                          fill
                          style={{ objectFit: 'contain' }}
                          className="drop-shadow-sm"
                        />
                      </div>
                      <h4 className="text-xs font-medium text-center">{integration.name}</h4>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 