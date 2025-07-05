import { X } from 'lucide-react';
import { CodeBlock } from '@/components/CodeBlock';

interface VectorGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VectorGuideModal({ isOpen, onClose }: VectorGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div className="bg-white w-full max-w-2xl h-full overflow-y-auto">
        <div className="sticky top-0 bg-white border-b z-10">
          <div className="flex justify-between items-center p-4">
            <h2 className="text-xl font-bold">Vector Configuration Guide</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8">
          <section>
            <h3 className="text-lg font-semibold mb-3">Overview</h3>
            <p className="leading-relaxed">
              Vector is a high-performance observability data pipeline that enables you to collect, transform, and route logs and metrics.
              Configure your pipeline using three main components: Sources (data collection), Transforms (data processing), and Sinks (data delivery).
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">Sources</h3>
            <p className="mb-3 leading-relaxed">
              Sources define where Vector collects data from. Here are some common source configurations:
            </p>
            <div className="space-y-4">
              <div>
                <CodeBlock
                  title="File Source"
                  code={`sources:
  app_logs:
    type: "file"
    include:
      - "/var/log/app/*.log"
    ignore_older_secs: 86400  # Ignore files older than 1 day
    read_from: "beginning"    # Read existing logs`}
                />
              </div>
              <div>
                <CodeBlock
                  title="HTTP Source"
                  code={`sources:
  http_receiver:
    type: "http"
    address: "0.0.0.0:8080"
    encoding:
      codec: "json"          # Accept JSON-formatted logs
    auth:
      type: "token"
      token: "{{ TOKEN }}"`}
                />
              </div>
              <p className="mt-2">
                <a
                  href="https://vector.dev/docs/reference/configuration/sources/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Browse all source types
                  <span className="text-xs">→</span>
                </a>
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">Transforms</h3>
            <p className="mb-3 leading-relaxed">
              Transforms modify, filter, or aggregate data as it passes through your pipeline. Here are common transform patterns:
            </p>
            <div className="space-y-4">
              <div>
                <CodeBlock
                  title="Parse and Filter Logs"
                  code={`transforms:
  parse_json:
    type: "remap"
    inputs: ["http_receiver"]
    source: |
      . = parse_json!(.message)
      .timestamp = parse_timestamp!(.timestamp, format: "%Y-%m-%d")
  
  filter_errors:
    type: "filter"
    inputs: ["parse_json"]
    condition: |
      .level == "error" || .severity == "critical"`}
                />
              </div>
              <div>
                <CodeBlock
                  title="Route by Environment"
                  code={`transforms:
  route_logs:
    type: "route"
    inputs: ["parse_json"]
    route:
      production: '.environment == "prod"'
      staging: '.environment == "staging"'
      development: '.environment == "dev"'`}
                />
              </div>
              <p className="mt-2">
                <a
                  href="https://vector.dev/docs/reference/configuration/transforms/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Browse all transform types
                  <span className="text-xs">→</span>
                </a>
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">Sinks</h3>
            <p className="mb-3 leading-relaxed">
              Sinks define where Vector sends data. Here are popular sink configurations:
            </p>
            <div className="space-y-4">
              <div>
                <CodeBlock
                  title="Elasticsearch Output"
                  code={`sinks:
  elastic_out:
    type: "elasticsearch"
    inputs: ["parse_json"]
    endpoints: ["http://elasticsearch:9200"]
    bulk:
      index: "logs-%Y-%m-%d"    # Daily indices
    encoding:
      codec: "json"
    batch:
      max_bytes: 10485760       # 10MB
      timeout_secs: 1`}
                />
              </div>
              <div>
                <CodeBlock
                  title="S3 Archive"
                  code={`sinks:
  s3_archive:
    type: "aws_s3"
    inputs: ["route_logs.production"]
    bucket: "my-log-archive"
    key_prefix: "logs/%Y/%m/%d"
    compression: "gzip"
    encoding:
      codec: "json"
    batch:
      max_bytes: 10485760       # 10MB
      timeout_secs: 300         # 5 minutes`}
                />
              </div>
              <p className="mt-2">
                <a
                  href="https://vector.dev/docs/reference/configuration/sinks/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Browse all sink types
                  <span className="text-xs">→</span>
                </a>
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">Complete Pipeline Example</h3>
            <p className="mb-3 leading-relaxed">
              Here's an example of a production-ready pipeline that collects HTTP logs, processes them, and routes them to multiple destinations:
            </p>
            <CodeBlock
              title="Complete Vector Pipeline"
              code={`# API endpoint to receive logs
sources:
  http_in:
    type: "http"
    address: "0.0.0.0:8080"
    encoding:
      codec: "json"

# Process and enrich logs
transforms:
  parse_logs:
    type: "remap"
    inputs: ["http_in"]
    source: |
      . = parse_json!(.message)
      .timestamp = parse_timestamp!(.timestamp)
      .environment = downcase!(.environment)
  
  route_by_env:
    type: "route"
    inputs: ["parse_logs"]
    route:
      prod: '.environment == "prod"'
      staging: '.environment == "staging"'

# Multiple destinations
sinks:
  elasticsearch:
    type: "elasticsearch"
    inputs: ["route_by_env.prod"]
    endpoints: ["http://elasticsearch:9200"]
    bulk:
      index: "prod-logs-%Y-%m-%d"
  
  s3_archive:
    type: "aws_s3"
    inputs: ["route_by_env.prod"]
    bucket: "log-archive"
    key_prefix: "prod/%Y/%m/%d"
    compression: "gzip"
  
  datadog_staging:
    type: "datadog_logs"
    inputs: ["route_by_env.staging"]
    default_api_key: "{{ DATADOG_API_KEY }}"
    encoding:
      codec: "json"`}
            />
          </section>
        </div>
      </div>
    </div>
  );
} 