#!/bin/bash
set -e  # Exit on error
set -o pipefail  # Exit on pipe failures

# Help function
show_help() {
    echo "Usage: $0 [options]"
    echo "Deploy the application to a GCP VM instance"
    echo
    echo "Options:"
    echo "  -h         Show this help message"
    echo "  -f         Force redeploy everything"
    echo "  -a         Force redeploy NextJS app only"
    echo
    echo "Examples:"
    echo "  $0                 # Deploy without forcing any redeployments"
    echo "  $0 -f             # Force redeploy everything"
    echo "  $0 -a             # Force redeploy NextJS app only"
    exit 0
}

# Parse command line arguments
force_all=false
force_app=false

while getopts "hfa" opt; do
    case $opt in
        h) show_help ;;
        f) force_all=true ;;
        a) force_app=true ;;
        *) echo "Unknown parameter: $1"
           echo "Use -h to see available options"
           exit 1
           ;;
    esac
    shift
done

# Source environment variables
if [[ ! -f .gcloud.env ]]; then
    echo "Error: .gcloud.env file not found"
    exit 1
fi
source .gcloud.env

# Check for .env.local
if [[ ! -f .env.local ]]; then
    echo "Error: .env.local file not found"
    exit 1
fi

# Load environment variables from .env.local
set -a
source .env.local
set +a

# Static IP configuration
STATIC_IP_NAME=$GCP_EXTERNAL_IP_ADDRESS_NAME
STATIC_IP=$GCP_EXTERNAL_IP_ADDRESS
SUBDOMAIN="app.trysift.dev"

# Cleanup function
cleanup() {
    echo "Cleaning up temporary files..."
    rm -f ../deploy.tar.gz
}

# Set up cleanup on script exit
trap cleanup EXIT

# Function to check if VM exists
check_vm_exists() {
    gcloud compute instances describe $COMPUTE_ENGINE_SERVICE_NAME \
        --zone=$GCP_ZONE >/dev/null 2>&1
    return $?
}

# Function to wait for startup script completion
wait_for_startup() {
    echo "Waiting for startup script to complete..."
    local max_attempts=30
    local attempt=1
    local sleep_time=10

    while [ $attempt -le $max_attempts ]; do
        echo "Checking startup script status (attempt $attempt/$max_attempts)..."
        if gcloud compute ssh $COMPUTE_ENGINE_SERVICE_NAME --zone=$GCP_ZONE --command="sudo systemctl is-active docker" >/dev/null 2>&1; then
            echo "Startup script completed successfully"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep $sleep_time
    done

    echo "Error: Startup script did not complete in time"
    exit 1
}

# Function to create and configure VM instance
create_vm() {
    if check_vm_exists; then
        if [ "${force_all}" = true ]; then
            echo "VM instance exists and force flag is set. Continuing with deployment..."
        else
            echo "VM instance exists. Continuing with deployment..."
        fi
        return 0
    fi

    echo "Creating new VM instance with static IP $STATIC_IP..."
    gcloud compute instances create $COMPUTE_ENGINE_SERVICE_NAME \
        --zone=$GCP_ZONE \
        --machine-type=e2-medium \
        --image-family=ubuntu-2204-lts \
        --image-project=ubuntu-os-cloud \
        --boot-disk-size=50GB \
        --tags=http-server,https-server,vector-server \
        --address=$STATIC_IP_NAME \
        --network-tier=PREMIUM \
        --metadata=startup-script='#!/bin/bash
            # Update package list
            apt-get update
            # Install Docker dependencies
            apt-get install -y apt-transport-https ca-certificates curl software-properties-common
            # Add Docker GPG key
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
            # Add Docker repository
            echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
            # Install Docker
            apt-get update
            apt-get install -y docker-ce docker-ce-cli containerd.io
            # Install Docker Compose
            curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            chmod +x /usr/local/bin/docker-compose
            # Create app directory with proper permissions
            mkdir -p /app
            chown -R ubuntu:ubuntu /app
            # Set up Docker permissions
            usermod -aG docker ubuntu
            chmod 666 /var/run/docker.sock
            # Pull latest Vector image
            docker pull timberio/vector:latest-alpine' || {
        echo "Error: Failed to create VM instance"
        exit 1
    }

    echo "Waiting for VM to be ready..."
    sleep 30

    # Wait for startup script to complete
    wait_for_startup

    # Install Nginx and Certbot after VM is ready
    echo "Installing Nginx and Certbot..."
    gcloud compute ssh $COMPUTE_ENGINE_SERVICE_NAME --zone=$GCP_ZONE -- "
        sudo apt-get update
        sudo apt-get install -y nginx certbot python3-certbot-nginx
    " || {
        echo "Error: Failed to install Nginx and Certbot"
        exit 1
    }
}

# Function to set up Nginx and SSL
setup_nginx_ssl() {
    echo "Setting up Nginx and SSL certificates..."
    
    # Step 1: Configure system limits
    echo "Configuring system limits..."
    gcloud compute ssh $COMPUTE_ENGINE_SERVICE_NAME --zone=$GCP_ZONE -- "
        sudo tee /etc/sysctl.d/98-nginx.conf > /dev/null << 'EOL'
fs.file-max = 65535
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535
EOL
        sudo sysctl -p /etc/sysctl.d/98-nginx.conf
    " || {
        echo "Error: Failed to configure system limits"
        return 1
    }

    # Step 2: Configure Nginx service limits
    echo "Configuring Nginx service limits..."
    gcloud compute ssh $COMPUTE_ENGINE_SERVICE_NAME --zone=$GCP_ZONE -- "
        sudo mkdir -p /etc/systemd/system/nginx.service.d/
        sudo tee /etc/systemd/system/nginx.service.d/limits.conf > /dev/null << 'EOL'
[Service]
LimitNOFILE=65535
TimeoutStartSec=300
TimeoutStopSec=300
EOL
        sudo systemctl daemon-reload
    " || {
        echo "Error: Failed to configure Nginx service limits"
        return 1
    }

    # Step 3: Stop Nginx
    echo "Stopping Nginx service..."
    gcloud compute ssh $COMPUTE_ENGINE_SERVICE_NAME --zone=$GCP_ZONE -- "
        sudo systemctl stop nginx || true
        sudo pkill -f nginx || true
    " || {
        echo "Warning: Could not stop Nginx gracefully, continuing anyway..."
    }

    # Step 4: Set up SSL certificates
    echo "Setting up SSL certificates..."
    echo '
==================================================================
                    IMPORTANT CERTIFICATE SETUP
==================================================================
You will now be asked to create DNS records for domain validation.
The process will show you the required TXT records to add.
Please have your Namecheap DNS management page open and ready.

Instructions:
1. Certbot will display TXT record details
2. Add these records in Namecheap DNS management
3. Wait 5-10 minutes for DNS propagation
4. Press Enter to continue the validation

Note: You may need to add multiple TXT records if validating
both the main domain and wildcard.
==================================================================
'

    gcloud compute ssh $COMPUTE_ENGINE_SERVICE_NAME --zone=$GCP_ZONE -- "
        sudo certbot certonly --manual \
            --preferred-challenges dns \
            --manual-public-ip-logging-ok \
            -d ${SUBDOMAIN} \
            --agree-tos \
            --email ssl@trysift.dev
    " || {
        echo "Error: Failed to set up SSL certificates"
        return 1
    }

    # Step 5: Configure SSL renewal
    echo "Configuring SSL renewal..."
    gcloud compute ssh $COMPUTE_ENGINE_SERVICE_NAME --zone=$GCP_ZONE -- "
        sudo tee /etc/letsencrypt/renewal/${SUBDOMAIN}.conf > /dev/null << EOL
# renew_before_expiry = 30 days
version = 2.6.0
archive_dir = /etc/letsencrypt/archive/${SUBDOMAIN}
cert = /etc/letsencrypt/live/${SUBDOMAIN}/cert.pem
privkey = /etc/letsencrypt/live/${SUBDOMAIN}/privkey.pem
chain = /etc/letsencrypt/live/${SUBDOMAIN}/chain.pem
fullchain = /etc/letsencrypt/live/${SUBDOMAIN}/fullchain.pem

[renewalparams]
authenticator = manual
manual_public_ip_logging_ok = True
account = ${SUBDOMAIN}
pref_challs = dns-01
server = https://acme-v02.api.letsencrypt.org/directory
EOL
        sudo chmod -R 755 /etc/letsencrypt
        sudo chown -R root:root /etc/letsencrypt
    " || {
        echo "Error: Failed to configure SSL renewal"
        return 1
    }

    # Step 6: Configure Nginx
    echo "Configuring Nginx..."
    gcloud compute ssh $COMPUTE_ENGINE_SERVICE_NAME --zone=$GCP_ZONE -- "
        sudo tee /etc/nginx/nginx.conf > /dev/null << \"EOL\"
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 1024;
    multi_accept on;
}

http {
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOL
    " || {
        echo "Error: Failed to configure Nginx main configuration"
        return 1
    }

    # Step 7: Configure Nginx site
    echo "Configuring Nginx site..."
    gcloud compute ssh $COMPUTE_ENGINE_SERVICE_NAME --zone=$GCP_ZONE -- "
        sudo tee /etc/nginx/sites-available/${SUBDOMAIN} > /dev/null << EOL
server {
    listen 80;
    listen [::]:80;
    server_name ${SUBDOMAIN};
    return 301 https://\\\$host\\\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${SUBDOMAIN};

    ssl_certificate /etc/letsencrypt/live/${SUBDOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${SUBDOMAIN}/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_cache_bypass \\\$http_upgrade;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
    }
}
EOL
        sudo rm -f /etc/nginx/sites-enabled/default
        sudo ln -sf /etc/nginx/sites-available/${SUBDOMAIN} /etc/nginx/sites-enabled/
    " || {
        echo "Error: Failed to configure Nginx site"
        return 1
    }

    # Step 8: Test and start Nginx
    echo "Testing and starting Nginx..."
    gcloud compute ssh $COMPUTE_ENGINE_SERVICE_NAME --zone=$GCP_ZONE -- "
        echo 'Testing Nginx configuration...'
        if ! sudo nginx -t; then
            echo 'Error: Nginx configuration test failed'
            exit 1
        fi

        echo 'Starting Nginx...'
        if ! sudo systemctl start nginx; then
            echo 'Error starting Nginx. Checking logs...'
            sudo journalctl -xeu nginx.service
            sudo nginx -t
            exit 1
        fi

        if ! sudo systemctl is-active --quiet nginx; then
            echo 'Error: Nginx failed to start'
            exit 1
        fi

        echo 'Nginx started successfully'
    " || {
        echo "Error: Failed to start Nginx"
        return 1
    }

    echo "Nginx and SSL setup completed successfully"
}

# Function to deploy application
deploy_app() {
    echo "Creating deployment package..."
    tar -czf ../deploy.tar.gz \
        --exclude='node_modules' \
        --exclude='.next' \
        --exclude='.git' \
        --exclude='release' \
        --exclude='dist' \
        --exclude='.DS_Store' \
        --exclude='._*' \
        . || { echo "Error: Failed to create deployment package"; exit 1; }

    echo "Setting up remote environment..."
    gcloud compute ssh $COMPUTE_ENGINE_SERVICE_NAME --zone=$GCP_ZONE -- "mkdir -p ~/deploy" || {
        echo "Error: Failed to create temporary directory"
        exit 1
    }

    echo "Copying files to instance..."
    gcloud compute scp ../deploy.tar.gz .env.local $COMPUTE_ENGINE_SERVICE_NAME:~/deploy/ --zone=$GCP_ZONE || {
        echo "Error: Failed to copy files to instance"
        exit 1
    }

    echo "Deploying application..."
    # Create a temporary script file
    TMP_SCRIPT=$(mktemp)
    trap 'rm -f $TMP_SCRIPT' EXIT

    # Write the deployment script to the temporary file
    cat > "$TMP_SCRIPT" << 'EOF'
#!/bin/bash
set -e

# Get flags from environment variables
force_app="${FORCE_APP:-false}"

# Set up app directory with proper permissions
sudo rm -rf /app
sudo mkdir -p /app
sudo chown -R ubuntu:ubuntu /app
sudo chmod -R 755 /app

# Extract files and set permissions
cd /app
sudo tar xzf ~/deploy/deploy.tar.gz
sudo cp ~/deploy/.env.local .
sudo chown -R ubuntu:ubuntu .
sudo chmod -R 755 .

# Create runtime directory with proper permissions
sudo mkdir -p /app/runtime
sudo chown -R ubuntu:ubuntu /app/runtime
sudo chmod -R 777 /app/runtime

# Load environment variables
set -a
source .env.local
set +a

# Ensure docker is running with proper permissions
sudo systemctl start docker
sudo chmod 666 /var/run/docker.sock

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

# Pull latest Vector image
echo 'Pulling latest Vector image...'
sudo docker pull timberio/vector:latest-alpine

# Check if NextJS app is already running
echo 'Checking NextJS app status...'
app_running=false
cd /app
if sudo ${docker_compose_cmd} ps -q | grep -q .; then
    if curl -s http://localhost:3000 > /dev/null; then
        echo 'NextJS app is already running'
        app_running=true
    fi
fi

# Handle NextJS app deployment based on force flag and current status
if [ "${app_running}" = true ] && [ "${force_app}" != "true" ]; then
    echo 'Using existing NextJS app deployment'
else
    if [ "${app_running}" = true ]; then
        echo 'Force flag set, cleaning up existing NextJS app deployment...'
        cd /app
        COMPOSE_HTTP_TIMEOUT=200 sudo ${docker_compose_cmd} down -v
        
        # Remove any existing app containers and volumes
        echo 'Removing existing app containers and volumes...'
        sudo docker rm -f $(sudo docker ps -aq --filter name=app_*) 2>/dev/null || true
        sudo docker volume rm $(sudo docker volume ls -q --filter name=app_*) 2>/dev/null || true
    fi

    # Stop any existing application containers
    echo 'Stopping existing application containers...'
    cd /app
    COMPOSE_HTTP_TIMEOUT=200 sudo ${docker_compose_cmd} down --remove-orphans || true
    
    # Set build arguments to skip font download during build
    export NEXT_TELEMETRY_DISABLED=1
    export NEXT_SKIP_FONT_OPTIMIZE=1
    
    # Pull latest images and rebuild with proper permissions and increased timeout
    COMPOSE_HTTP_TIMEOUT=200 sudo ${docker_compose_cmd} pull || true
    COMPOSE_HTTP_TIMEOUT=200 DOCKER_BUILDKIT=1 sudo -E ${docker_compose_cmd} up -d --build --force-recreate --remove-orphans
    
    # Wait for services to start
    echo 'Waiting for services to start...'
    sleep 30
    
    # Check service status with increased retries
    max_retries=5
    retry_count=0
    while [ ${retry_count} -lt ${max_retries} ]; do
        if curl -s http://localhost:3000 > /dev/null; then
            echo 'NextJS service started successfully'
            break
        fi
        echo "Waiting for NextJS service... Attempt $((retry_count + 1))/${max_retries}"
        retry_count=$((retry_count + 1))
        sleep 30
    done
    
    if [ ${retry_count} -eq ${max_retries} ]; then
        echo '+++++++++++ ERROR ++++++++++++++++++++++'
        echo 'NextJS service failed to start. Please check:'
        echo '1. Docker logs below'
        echo '2. Port 3000 is available'
        echo '3. System has enough resources'
        echo '++++++++++++++++++++++++++++++++++++++++'
        sudo ${docker_compose_cmd} logs
        exit 1
    fi
fi

# Cleanup
rm -rf ~/deploy || true
EOF

    # Copy the script to the remote machine
    gcloud compute scp "$TMP_SCRIPT" $COMPUTE_ENGINE_SERVICE_NAME:~/deploy/deploy.sh --zone=$GCP_ZONE || {
        echo "Error: Failed to copy deployment script"
        exit 1
    }

    # Run the script with environment variables
    gcloud compute ssh $COMPUTE_ENGINE_SERVICE_NAME --zone=$GCP_ZONE -- "chmod +x ~/deploy/deploy.sh && FORCE_APP=${force_app} ~/deploy/deploy.sh" || {
        echo "Error: Deployment failed"
        exit 1
    }
}

# Main deployment logic
echo "Starting deployment process..."

# Create VM instance if it doesn't exist
create_vm

# Deploy the application with any passed arguments
deploy_app "$@"

# Set up Nginx and initial SSL
setup_nginx_ssl

echo "Deployment complete!"
echo "Application available at: https://$SUBDOMAIN"