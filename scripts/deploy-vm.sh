#!/bin/bash

# Set strict error handling
set -euo pipefail

# Check command line arguments
if [ "$#" -lt 4 ]; then
    echo "Usage: $0 <project_id> <environment> <instance_name> <vm_user> [disk_size_gb]"
    echo "Example: $0 my-project prod app-server admin-user 200"
    exit 1
fi

# Configuration variables
PROJECT_ID="$1"
ENVIRONMENT="$2"
INSTANCE_NAME="$3"
VM_USER="$4"
DISK_SIZE="${5:-100}"  # Default to 100GB if not specified
REGION="us-central1"
ZONE="${REGION}-a"
MACHINE_TYPE="n2-standard-16"
STATIC_IP_NAME="${ENVIRONMENT}-${INSTANCE_NAME}-ip"
SSH_KEY_PATH="$HOME/.ssh/gcp_key"
NETWORK_TAGS="http-server,https-server,${ENVIRONMENT}"
VPC_NETWORK="default"  # Using default VPC
SUBNET="default"       # Using default subnet

# Required files check
REQUIRED_FILES=(
    "../docker-compose.yml"
    "../Caddyfile*"
    "../.env"
    "bot"
)

# Logging configuration
LOGFILE="logs/${ENVIRONMENT}-${INSTANCE_NAME}-$(date +%Y%m%d-%H%M%S).log"
mkdir -p "$(dirname $LOGFILE)"

# Logging function
log() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $1" | tee -a "$LOGFILE"
}

error() {
    log "ERROR: $1"
    exit 1
}

# Cleanup function
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log "Error occurred. Starting cleanup..."
        if [ -n "${STATIC_IP:-}" ]; then
            log "Cleaning up static IP ${STATIC_IP_NAME}..."
            gcloud compute addresses delete "${STATIC_IP_NAME}" --region="${REGION}" --quiet || true
        fi
        if [ -n "${INSTANCE_NAME:-}" ]; then
            log "Cleaning up instance ${INSTANCE_NAME}..."
            gcloud compute instances delete "${INSTANCE_NAME}" --zone="${ZONE}" --quiet || true
        fi
    fi
    exit $exit_code
}

trap cleanup EXIT

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."

    # Check required commands
    for cmd in gcloud ssh-keygen rsync docker; do
        which $cmd >/dev/null 2>&1 || error "$cmd not found. Please install it first."
    done

    # Check gcloud auth
    gcloud auth list --filter=status:ACTIVE --format="value(account)" >/dev/null 2>&1 || \
        error "Not authenticated with gcloud. Please run 'gcloud auth login' first."

    # Check required files
    for file in "${REQUIRED_FILES[@]}"; do
        if [ ! -f "$file" ]; then
            error "Required file $file not found"
        fi
    done

    # Set project
    gcloud config set project "${PROJECT_ID}" || error "Failed to set project"

    # Verify default VPC exists
    gcloud compute networks describe "${VPC_NETWORK}" >/dev/null 2>&1 || \
        error "Default VPC network not found"
}

# Setup SSH key
setup_ssh_key() {
    if [[ ! -f "${SSH_KEY_PATH}" ]]; then
        log "Generating new SSH key pair..."
        ssh-keygen -t rsa -b 4096 -f "${SSH_KEY_PATH}" -N "" -C "${VM_USER}-${ENVIRONMENT}"
        chmod 400 "${SSH_KEY_PATH}"
    else
        log "Using existing SSH key at ${SSH_KEY_PATH}"
    fi
}

# Create static IP
create_static_ip() {
    local ip_exists

    log "Checking for existing static IP..."
    ip_exists=$(gcloud compute addresses list \
        --filter="name=${STATIC_IP_NAME}" \
        --format="value(name)" 2>/dev/null || true)

    if [[ -z "$ip_exists" ]]; then
        log "Creating new static IP..."
        gcloud compute addresses create "${STATIC_IP_NAME}" \
            --region="${REGION}" \
            --network-tier=PREMIUM || error "Failed to create static IP"
    fi

    STATIC_IP=$(gcloud compute addresses describe "${STATIC_IP_NAME}" \
        --region="${REGION}" \
        --format="value(address)")

    log "Static IP: ${STATIC_IP}"
}

# Create VM instance
create_vm() {
    local vm_exists

    log "Checking for existing VM..."
    vm_exists=$(gcloud compute instances list \
        --filter="name=${INSTANCE_NAME}" \
        --format="value(name)" 2>/dev/null || true)

    if [[ -z "$vm_exists" ]]; then
        log "Creating new VM instance..."
        gcloud compute instances create "${INSTANCE_NAME}" \
            --machine-type="${MACHINE_TYPE}" \
            --zone="${ZONE}" \
            --network="${VPC_NETWORK}" \
            --subnet="${SUBNET}" \
            --boot-disk-size="${DISK_SIZE}GB" \
            --boot-disk-type="pd-ssd" \
            --create-disk="auto-delete=yes,boot=no,device-name=data-disk,mode=rw,size=${DISK_SIZE},type=pd-ssd" \
            --metadata-from-file="ssh-keys=${SSH_KEY_PATH}.pub" \
            --metadata="env=${ENVIRONMENT},created-by=automation" \
            --tags="${NETWORK_TAGS}" \
            --network-tier=PREMIUM \
            --maintenance-policy=MIGRATE \
            --labels="env=${ENVIRONMENT},project=${PROJECT_ID}" \
            --scopes=https://www.googleapis.com/auth/cloud-platform || error "Failed to create VM instance"
    fi
}

# Attach static IP
attach_static_ip() {
    log "Attaching static IP to VM..."
    gcloud compute instances delete-access-config "${INSTANCE_NAME}" \
        --zone="${ZONE}" \
        --access-config-name="external-nat" || true

    gcloud compute instances add-access-config "${INSTANCE_NAME}" \
        --zone="${ZONE}" \
        --access-config-name="external-nat" \
        --address="${STATIC_IP}" || error "Failed to attach static IP"
}

# Wait for VM
wait_for_vm() {
    local max_attempts=30
    local attempt=1

    log "Waiting for VM to be ready..."
    while [[ $attempt -le $max_attempts ]]; do
        if gcloud compute instances describe "${INSTANCE_NAME}" \
            --zone="${ZONE}" \
            --format="get(status)" | grep -q "RUNNING"; then
            log "VM is running"

            # Wait for SSH
            if timeout 10 ssh -i "${SSH_KEY_PATH}" -o StrictHostKeyChecking=no \
                -o ConnectTimeout=5 "${VM_USER}@${STATIC_IP}" "exit" >/dev/null 2>&1; then
                log "SSH is ready"
                return 0
            fi
        fi

        log "Attempt $attempt/$max_attempts: Waiting..."
        sleep 10
        ((attempt++))
    done

    error "Timeout waiting for VM"
}

# Run setup on VM
run_setup() {
    log "Copying files to VM..."

    # Create remote directories
    ssh -i "${SSH_KEY_PATH}" -o StrictHostKeyChecking=no "gcp-automation@${STATIC_IP}" "mkdir -p ~/app"

    # Copy files
    rsync -avz -e "ssh -i ${SSH_KEY_PATH} -o StrictHostKeyChecking=no" \
        ../docker-compose.yml \
        ../Caddyfile* \
        ../.env \
        bot \
        "gcp-automation@${STATIC_IP}:~/app/"

    # Execute setup
    ssh -i "${SSH_KEY_PATH}" -o StrictHostKeyChecking=no "gcp-automation@${STATIC_IP}" '
        cd ~/app

        # Install Docker
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        sudo systemctl enable docker
        sudo systemctl start docker

        # Configure Docker
        sudo mkdir -p /data/docker
        sudo mkdir -p /etc/docker
        echo '"'"'{"data-root": "/data/docker"}'"'"' | sudo tee /etc/docker/daemon.json
        sudo systemctl restart docker

        # Setup service
        sudo mkdir -p /etc/deployment-bot
        sudo mv bot /usr/local/bin/
        sudo chmod +x /usr/local/bin/bot

        # Create service file
        sudo tee /etc/systemd/system/deployment-bot.service << EOF
[Unit]
Description=Deployment Bot Service
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=$USER
Environment=COMPOSE_FILE_PATH=/home/${VM_USER}/app/docker-compose.yml
ExecStart=/usr/local/bin/bot
WorkingDirectory=/home/${VM_USER}/app
Restart=always
RestartSec=3
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=deployment-bot

[Install]
WantedBy=multi-user.target
EOF

        # Start services
        sudo systemctl daemon-reload
        sudo systemctl enable deployment-bot
        sudo systemctl start deployment-bot

        # Pull and start containers
        docker pull timberio/vector:latest-alpine
        docker compose --profile all up -d
    '
}

# Main execution
main() {
    log "Starting GCP infrastructure setup..."

    check_prerequisites
    setup_ssh_key
    create_static_ip
    create_vm
    attach_static_ip
    wait_for_vm
    run_setup

    log "Setup completed successfully!"
    log "Static IP: ${STATIC_IP}"
    log "Instance: ${INSTANCE_NAME}"
    log "Zone: ${ZONE}"
}

main "$@"