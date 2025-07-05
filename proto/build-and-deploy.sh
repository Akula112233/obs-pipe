#!/bin/bash

# Directory setup
PROTO_DIR="$(pwd)/definitions"
DESC_DIR="$(pwd)/descriptors"

# Ensure descriptor directory exists
mkdir -p "$DESC_DIR"

# Convert all .proto files to .desc files
for proto_file in "$PROTO_DIR"/*.proto; do
    if [ -f "$proto_file" ]; then
        filename=$(basename "$proto_file")
        desc_file="$DESC_DIR/${filename%.proto}.desc"
        
        echo "Converting $filename to descriptor..."
        protoc --include_imports \
               --include_source_info \
               --descriptor_set_out="$desc_file" \
               --proto_path="$PROTO_DIR" \
               --proto_path="$(pwd)/third_party/opentelemetry-proto" \
               "$proto_file"
        
        if [ $? -eq 0 ]; then
            echo "Successfully created descriptor: $desc_file"
        else
            echo "Error creating descriptor for $filename"
            exit 1
        fi
    fi
done

echo "Proto compilation completed. Descriptor files are in: $DESC_DIR" 