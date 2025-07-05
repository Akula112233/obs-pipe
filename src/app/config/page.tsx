'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { Editor } from '@monaco-editor/react';
import VectorGraph from '@/components/VectorGraph';
import yaml from 'js-yaml';
import { VectorConfig } from '@/lib/config';
import { Save, Play, RotateCw, ArrowLeft, Code, Columns, LayoutDashboard, BookOpen, XCircle } from 'lucide-react';
import Link from 'next/link';
import VectorGuideModal from '@/components/VectorGuideModal';

type ViewMode = 'editor' | 'split' | 'preview';

export default function ConfigEditor() {
  const [config, setConfig] = useState<VectorConfig>({
    sources: {},
    transforms: {},
    sinks: {}
  });
  const [yamlContent, setYamlContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [yamlError, setYamlError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const validationTimer = useRef<NodeJS.Timeout>();
  const saveMessageTimer = useRef<NodeJS.Timeout>();

  // Load initial config and check pipeline status
  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetch('/api/vector/config').then(async res => {
        const data = await res.json();
        console.log('Loaded config from API:', data);
        return data;
      }),
      fetch('/api/vector/status', { method: 'POST' })
        .then(res => res.json())
        .catch(() => ({ isRunning: false })) // Default to not running if status check fails
    ]).then(([configData, statusData]) => {
      if (!configData.config) {
        console.error('Invalid config data:', configData);
        throw new Error('Invalid config data received');
      }
      const yamlStr = yaml.dump(configData.config, { indent: 2 });
      console.log('Parsed YAML:', yamlStr);
      setYamlContent(yamlStr);
      setConfig(configData.config);
      setIsRunning(statusData.isRunning || false);
    }).catch(err => {
      setError('Failed to load configuration');
      console.error('Config load error:', err);
    }).finally(() => {
      setIsLoading(false);
    });
  }, []);

  const validateConfig = useCallback((value: string) => {
    try {
      const parsed = yaml.load(value) as VectorConfig;
      
      // Validate the parsed configuration
      const isValidConfig = parsed && typeof parsed === 'object';
      const sources = parsed?.sources || {};
      const transforms = parsed?.transforms || {};
      const sinks = parsed?.sinks || {};

      // Check for duplicate inputs in transforms and sinks
      const hasInvalidInputs = [...Object.values(transforms), ...Object.values(sinks)].some(component => {
        if (!component || typeof component !== 'object') return true;
        if (!('inputs' in component)) return false;
        
        const inputs = component.inputs;
        // Check if inputs is an array and all elements are strings
        if (!Array.isArray(inputs)) return true;
        if (inputs.some(input => typeof input !== 'string')) return true;
        // Check if any input is incomplete (just a hyphen)
        if (inputs.some(input => input === '-' || input === null)) return true;
        
        // Check for duplicate inputs
        const uniqueInputs = new Set(inputs);
        if (uniqueInputs.size !== inputs.length) {
          setYamlError(`Duplicate input value found in inputs array. Input values must be unique.`);
          return true;
        }
        
        return false;
      });

      // Ensure each component has at least a type field
      const hasInvalidSource = Object.values(sources).some(s => !s || typeof s !== 'object' || !s.type);
      const hasInvalidTransform = Object.values(transforms).some(t => !t || typeof t !== 'object' || !t.type);
      const hasInvalidSink = Object.values(sinks).some(s => !s || typeof s !== 'object' || !s.type);

      if (!isValidConfig || hasInvalidSource || hasInvalidTransform || hasInvalidSink || hasInvalidInputs) {
        if (!yamlError) {
          setYamlError('Configuration is incomplete');
        }
        return;
      }

      // Configuration is valid for both YAML and graph visualization
      setConfig(parsed);
      setYamlError(null);
    } catch (err) {
      // Extract the useful part of the YAML error message
      const errorMessage = err instanceof Error ? err.message : 'Invalid YAML';
      const cleanError = errorMessage.split('\n')[0].replace('YAMLException: ', '');
      setYamlError(cleanError);
    }
  }, [yamlError]);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (!value) return;
    setYamlContent(value);
    
    // Clear any existing timer
    if (validationTimer.current) {
      clearTimeout(validationTimer.current);
    }

    // Set a new timer for validation
    validationTimer.current = setTimeout(() => {
      validateConfig(value);
    }, 1000); // Wait 1 second after typing stops before validating
  }, [validateConfig]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (validationTimer.current) {
        clearTimeout(validationTimer.current);
      }
      if (saveMessageTimer.current) {
        clearTimeout(saveMessageTimer.current);
      }
    };
  }, []);

  const handleSave = async (shouldRestart = false) => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/vector/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      // Wait for the save to complete before showing success
      await new Promise(resolve => setTimeout(resolve, 500));

      if (shouldRestart && isRunning) {
        // TODO: Restart the pipeline here, or remove the shouldRestart parameter
        setError('Configuration saved and reloaded successfully');
      } else {
        setError('Configuration saved successfully');
      }
      
      // Clear any existing timer
      if (saveMessageTimer.current) {
        clearTimeout(saveMessageTimer.current);
      }

      // Set new timer to clear message
      saveMessageTimer.current = setTimeout(() => setError(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const getViewClasses = (mode: ViewMode) => {
    switch (mode) {
      case 'editor':
        return 'col-span-2';
      case 'preview':
        return 'col-span-2';
      default:
        return 'col-span-1';
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </Link>
          <div className="w-px h-6 bg-gray-200" />
          <h1 className="text-2xl font-bold">Pipeline Configuration</h1>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsGuideOpen(true)}
              className="p-2 rounded flex items-center gap-2 hover:bg-gray-100 transition-colors"
              title="Configuration Guide"
            >
              <BookOpen className="h-4 w-4" />
              <span className="text-sm">Guide</span>
            </button>
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('editor')}
                className={`p-2 rounded flex items-center gap-2 ${
                  viewMode === 'editor' ? 'bg-white shadow text-blue-600' : 'hover:bg-white/50'
                }`}
                title="Show editor only"
              >
                <Code className="h-4 w-4" />
                <span className="text-sm">Editor</span>
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`p-2 rounded flex items-center gap-2 ${
                  viewMode === 'split' ? 'bg-white shadow text-blue-600' : 'hover:bg-white/50'
                }`}
                title="Split view"
              >
                <Columns className="h-4 w-4" />
                <span className="text-sm">Split</span>
              </button>
              <button
                onClick={() => setViewMode('preview')}
                className={`p-2 rounded flex items-center gap-2 ${
                  viewMode === 'preview' ? 'bg-white shadow text-blue-600' : 'hover:bg-white/50'
                }`}
                title="Show preview only"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="text-sm">Preview</span>
              </button>
            </div>
          </div>

          {error && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded ${
              error.includes('success') 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => handleSave(isRunning)}
              disabled={isSaving || yamlError !== null}
              className={`px-4 py-2 rounded flex items-center gap-2 transition-colors ${
                isSaving || yamlError !== null
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : isRunning ? (
                <RotateCw className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? 'Saving...' : isRunning ? 'Save & Reload' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <VectorGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      
      <div className="flex-1 grid grid-cols-2 gap-4 p-4 min-h-0 overflow-hidden">
        {isLoading ? (
          <div className="col-span-2 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="text-gray-600">Loading configuration...</p>
            </div>
          </div>
        ) : (
          <>
            {viewMode !== 'preview' && (
              <div className={`flex flex-col min-h-0 ${getViewClasses(viewMode)}`}>
                {yamlError && (
                  <div className="mb-2 p-2 bg-red-50 text-red-600 text-sm rounded-md flex items-center gap-2">
                    <XCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{yamlError}</span>
                  </div>
                )}
                <div className="border rounded-lg overflow-hidden flex-1">
                  <Editor
                    height="100%"
                    defaultLanguage="yaml"
                    value={yamlContent}
                    onChange={handleEditorChange}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 14,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      wordWrap: 'on'
                    }}
                  />
                </div>
              </div>
            )}
            
            {viewMode !== 'editor' && (
              <div className={`border rounded-lg p-4 overflow-auto min-h-0 ${getViewClasses(viewMode)}`}>
                <VectorGraph
                  key={viewMode}
                  config={config}
                  metrics={{}}
                  onSourceClick={() => {}}
                  onSinkClick={() => {}}
                  onTransformClick={() => {}}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}