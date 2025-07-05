# SiftDev Worker - Log Analytics Pipeline Dashboard

A modern web application for monitoring and managing data pipelines using Vector. This application provides real-time visualization of log processing pipelines, metrics monitoring, and log analytics capabilities.

> **Quick Start**: For local development, you can run just the frontend with `npm install && npm run dev`, though most features will be limited without proper configuration. See the [Development](#-development) section for details.

> **Note**: This project was originally developed as part of Sift's work on log analytics and data pipeline monitoring. After YC, we pivoted away from this direction, but the codebase serves as an educational example of building intelligent, real-time log processing pipelines.
>
> **Production Context**: During Sift's active development, live production applications had ad-hoc versions of this demo that were more tailored to each company's specific use cases and requirements. This demo version includes some future functionality and experimental features that weren't fully implemented in production. While some pieces are more superficial or demonstrative, the core log processing capabilities are already baked in and represent the foundation that was successfully deployed in production environments.



## 🚀 Features

### Core Functionality
- **Real-time Pipeline Monitoring**: Visualize your Vector data pipeline with live metrics and component status
- **Log Analytics Dashboard**: View and search through processed logs with advanced filtering capabilities
- **Metrics Visualization**: Real-time charts showing events processed, throughput, and error rates
- **Vector Integration**: Direct integration with Vector for log collection, processing, and routing
- **Docker Management**: Start, stop, and monitor Vector containers through the web interface
- **Multi-tenant Support**: Organization-based isolation with Supabase authentication

### Key Components
- **Pipeline Dashboard**: Interactive graph showing sources, transforms, and sinks with real-time metrics
- **Log Viewer**: Live log streaming with search and filtering capabilities
- **Metrics Page**: Real-time charts and analytics for pipeline performance
- **Configuration Management**: Dynamic Vector configuration management
- **Integration Options**: Multiple ways to connect data sources (SDK, existing logging solutions)

## 🏗️ Architecture

The application consists of several components:

- **Next.js Frontend**: React-based web interface with TypeScript
- **Vector Pipeline**: Vector for log collection and processing
- **Caddy Server**: Reverse proxy and load balancer
- **Supabase**: Authentication and database backend
- **SigNoz**: Observability and monitoring (optional)

## 🐳 Quick Start with Docker Compose

### Prerequisites
- Docker and Docker Compose installed
- At least 4GB of available RAM
- Ports 80, 443, 3000, and 2019 available

### 1. Clone the Repository
```bash
git clone <repository-url>
cd worker
```

### 2. Set Up Environment Variables
Create a `.env` file in the root directory:
```bash
# Required environment variables
NEXT_PUBLIC_SITE_URL=http://localhost
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Optional: SigNoz integration
NEXT_PUBLIC_SIGNOZ_URL=http://localhost:3301
```

### 3. Start the Application (only works in Linux boxes with proper config files)
```bash
# Start all services
docker-compose up -d

# Or start with specific profiles
docker-compose --profile all up -d
```

### 4. Access the Application
- **Main Dashboard**: http://localhost:3000
- **Pipeline Dashboard**: http://localhost:3000/pipeline
- **Metrics**: http://localhost:3000/metrics
- **Caddy Admin**: http://localhost:2019

## 🔧 Configuration

### Vector Configuration
The application uses Vector for log processing. Configuration files are located in:
- `config/default.yaml` - Default Vector configuration
- `config/demo-logs.yaml` - Demo configuration with sample data
- `config/complex-dummy-vector.yaml` - Complex pipeline example

### Caddy Configuration
- `Caddyfile-application` - Main application proxy
- `Caddyfile-worker` - Worker-specific proxy
- `caddy-worker-initial.json` - Initial Caddy configuration

## 📊 Usage

### Starting the Pipeline
1. Navigate to the Pipeline Dashboard
2. Click "Start Pipeline" to begin Vector processing
3. Monitor real-time metrics and logs
4. Use the interactive graph to explore pipeline components

### Viewing Logs
1. Access the main dashboard or pipeline page
2. Click on any source or sink component to view its logs
3. Use the search and filter options to find specific logs
4. View live log streaming with real-time updates

### Monitoring Metrics
1. Visit the Metrics page for detailed analytics
2. View real-time charts of events processed
3. Monitor throughput and error rates
4. Track pipeline performance over time

## 🛠️ Development

### Local Development Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

> **Important**: You can primarily only run the frontend (Next.js app) locally. After running `npm install` (first time only) and `npm run dev`, the frontend will start, but the majority of the app functionality won't work because required API keys, Supabase configuration, and other sensitive configs are not included in the public repository for security reasons.


## 🔍 Troubleshooting

### Common Issues

**Vector not starting:**
- Check Docker logs: `docker-compose logs shift-dev-worker`
- Verify Vector configuration syntax
- Ensure sufficient system resources

**Caddy connection issues:**
- Check Caddy admin interface at http://localhost:2019
- Verify network connectivity between containers
- Review Caddy configuration files

**Authentication problems:**
- Verify Supabase configuration in `.env`
- Check database migrations: `npm run migrate`
- Ensure proper environment variables

### Logs and Debugging
```bash
# View application logs
docker-compose logs -f shift-dev-worker

# View Caddy logs
docker-compose logs -f caddy-server-worker

# Check Vector status
curl http://localhost:8686/health
```

## 📁 Project Structure

```
worker/
├── src/                    # Next.js application source
│   ├── app/               # App router pages
│   ├── components/        # React components
│   ├── lib/              # Utility libraries
│   └── types/            # TypeScript type definitions
├── config/               # Vector configuration files
├── supabase/             # Database migrations and config
├── signoz/               # SigNoz observability stack
├── docker-compose.yml    # Docker Compose configuration
└── README.md            # This file
```

## 🔐 Security

- Authentication handled by Supabase
- Multi-tenant organization isolation
- Secure environment variable management
- HTTPS support through Caddy

## 📈 Monitoring

The application includes comprehensive monitoring:
- Real-time pipeline metrics
- Error tracking and alerting
- Performance monitoring
- Log aggregation and analysis

**Note**: This is a demo environment with sample data. For production use, ensure proper configuration and security measures are in place.
