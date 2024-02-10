#!/bin/bash

# Read exclude patterns from .dockerignore file
exclude_patterns=()
while IFS= read -r line; do
  exclude_patterns+=("--exclude=$line")
done < .dockerignore

# Create the tar archive with exclude options
tar cvf pantry-guardan-docker.tar ${exclude_patterns[@]} .
echo "pantry-guardan-docker.tar created successfully!"
