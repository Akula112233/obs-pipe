#!/bin/bash
set -e  # Exit on error
set -o pipefail  # Exit on pipe failures

# Parse command line arguments
FORCE_ALL=false
FORCE_APP=false
FORCE_SIGNOZ=false
REMOVE_VOLUMES=false

while getopts "fasv" opt; do
  case $opt in
    f) FORCE_ALL=true ;;
    a) FORCE_APP=true ;;
    s) FORCE_SIGNOZ=true ;;
    v) REMOVE_VOLUMES=true ;;
    \?) echo "Invalid option -$OPTARG" >&2; exit 1 ;;
  esac
done

# Function to check required environment variables
check_env_vars() {
    local missing_vars=()
    
    # List of required environment variables
    required_vars=(
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "NEXT_PUBLIC_SITE_URL"
    )

    # Check if .env.local exists
    if [ ! -f .env.local ]; then
        echo "Error: .env.local file not found!"
        echo "Please create .env.local with the required environment variables."
        exit 1
    fi

    # Source the .env.local file
    set -a
    source .env.local
    set +a

    # Check each required variable
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done

    # If any variables are missing, print error and exit
    if [ ${#missing_vars[@]} -ne 0 ]; then
        echo "Error: The following required environment variables are missing or empty:"
        printf '%s\n' "${missing_vars[@]}"
        echo "Please set these variables in your .env.local file"
        exit 1
    fi
}

# Function to create and configure Docker network for SigNoz only.
create_network() {
    echo "Creating Docker network 'signoz-net'..."
    if ! docker network ls | grep "signoz-net" > /dev/null; then
        docker network create signoz-net
        echo "Docker network 'signoz-net' created."
    else
        echo "Docker network 'signoz-net' already exists, skipping creation."
    fi
}

# Function to check if SigNoz is running
check_signoz() {
    if curl -s -f "http://localhost:3301/api/v1/health?live=1" > /dev/null; then
        return 0  # SigNoz is running
    else
        return 1  # SigNoz is not running
    fi
}

# Function to check if NextJS app is running
check_app() {
    if curl -s -f "http://localhost:3000" > /dev/null; then
        return 0  # App is running
    else
        return 1  # App is not running
    fi
}

# Function to deploy SigNoz
deploy_signoz() {
    if [ "$FORCE_ALL" = true ] || [ "$FORCE_SIGNOZ" = true ] || ! check_signoz; then
        echo 'Starting SigNoz services...'
        cd signoz/deploy/docker
        
        # If force flag is set, bring down existing containers first
        if [ "$FORCE_ALL" = true ] || [ "$FORCE_SIGNOZ" = true ]; then
            echo "Force flag set, bringing down existing SigNoz containers..."
            if [ "$REMOVE_VOLUMES" = true ]; then
                echo "Removing SigNoz volumes..."
                ${docker_compose_cmd} down -v
            else
                ${docker_compose_cmd} down
            fi
        fi
        
        COMPOSE_HTTP_TIMEOUT=200 ${docker_compose_cmd} up -d --build --remove-orphans
        cd ../../..  # Return to root directory
        
        # Wait for SigNoz to be ready
        echo "Waiting for SigNoz to be ready..."
        until curl -s -f "http://localhost:3301/api/v1/health?live=1" > /dev/null; do
            echo "Waiting for SigNoz to be ready..."
            sleep 5
        done
        echo "SigNoz is ready!"
    else
        echo "SigNoz is already running, skipping deployment. Use -s or -f to force redeploy."
    fi
}

# Function to deploy NextJS app and Vector
deploy_app() {
    if [ "$FORCE_ALL" = true ] || [ "$FORCE_APP" = true ] || ! check_app; then
        echo 'Starting NextJS application and Vector...'
        
        # If force flag is set, bring down existing containers first
        if [ "$FORCE_ALL" = true ] || [ "$FORCE_APP" = true ]; then
            echo "Force flag set, bringing down existing app containers..."
            ${docker_compose_cmd} down
        fi
        
        # Remove any existing app_network to allow docker-compose to create it properly:
        if docker network ls | grep "app_network"; then
            echo "Removing existing 'app_network' network..."
            docker network rm app_network || echo "Warning: Failed to remove app_network"
        fi
        
        # Export environment variables for docker-compose (excluding comments and empty lines)
        export $(grep -v '^#' .env.local | xargs)

        COMPOSE_HTTP_TIMEOUT=200 ${docker_compose_cmd} up -d --build --remove-orphans

        # Wait for NextJS app to be ready
        echo "Waiting for NextJS app to be ready..."
        until curl -s -f "http://localhost:3000" > /dev/null; do
            echo "Waiting for NextJS app to be ready..."
            sleep 5
        done
        echo "NextJS app is ready!"
    else
        echo "NextJS app is already running, skipping deployment. Use -a or -f to force redeploy."
    fi
}

# Main deployment logic
echo "Starting local deployment process..."

# Check environment variables
check_env_vars

# Check for docker compose plugin or standalone docker-compose
echo 'Checking for docker compose...'
if docker compose version > /dev/null 2>&1; then
    echo 'Using docker compose plugin'
    docker_compose_cmd='docker compose'
elif docker-compose version > /dev/null 2>&1; then
    echo 'Using standalone docker-compose'
    docker_compose_cmd='docker-compose'
else
    echo 'Error: Neither docker compose plugin nor docker-compose found'
    echo 'Please install docker compose following: https://docs.docker.com/compose/install/'
    exit 1
fi

# Create only the SigNoz network
create_network

# Deploy SigNoz first
deploy_signoz

# Deploy NextJS app and Vector
deploy_app

echo "Deployment complete!"
echo "SigNoz UI available at: http://localhost:3301"
echo "NextJS app available at: http://localhost:3000"