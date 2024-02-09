#!/bin/bash

# Get the current directory of the script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Get the script's filename
SCRIPT_NAME=$(basename "${BASH_SOURCE[0]}")

# Loop through all files in the script's directory
for file in "$SCRIPT_DIR"/*; do
  if [ -f "$file" ] && [ "$file" != "$SCRIPT_DIR/$SCRIPT_NAME" ]; then
    # Get the filename without the path
    filename=$(basename "$file")

    # Read the file contents
    file_contents=$(<"$file")

    # Export the environment variable with the filename as the name and contents as the value
    export "$filename"="$file_contents"

    echo "Exported $filename with value: $file_contents"
  fi
done
