#! /bin/bash

# Run this once after checking out the repo.
if [ -d "venv" ] || [ -d ".venv" ]; then
    echo -e "\033[1;33mProject already appears to be set up (found 'venv' or '.venv' directory).\033[0m"
    exit 0
fi


if ! command -v python3.13 &> /dev/null
then
    echo -e "\033[1;31mError:\033[0m \033[1;33mpython3.13 is not installed or not available in PATH.\033[0m"
    exit 1
fi

python3.13 -m venv venv

source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo -e "\033[1;32mSetup complete\033[0m"
echo -e "\033[1;33mPlease run '. venv/bin/activate' to activate your virtual environment.\033[0m"