#!/bin/bash

echo "🚀 Setting up FREE OpenAI Whisper for lifetime transcription!"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    echo "Please install Python 3 from: https://www.python.org/downloads/"
    exit 1
fi

echo "✅ Python 3 found"

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is required but not installed."
    echo "Please install pip3"
    exit 1
fi

echo "✅ pip3 found"

# Install Whisper
echo "📦 Installing OpenAI Whisper..."
pip3 install openai-whisper

# Check if installation was successful
if command -v whisper &> /dev/null; then
    echo "✅ Whisper installed successfully!"
    echo ""
    echo "🎉 Setup complete! Now you can:"
    echo "1. Go to /admin/dashboard"
    echo "2. Click '🤖 Generate AI Transcript'"
    echo "3. Get FREE, accurate transcriptions forever!"
    echo ""
    echo "📊 Whisper will download models on first use:"
    echo "- tiny: ~39 MB (fastest, less accurate)"
    echo "- base: ~74 MB (good balance)"
    echo "- small: ~244 MB (better accuracy)"
    echo "- medium: ~769 MB (best for this use case)"
    echo "- large: ~1550 MB (best accuracy)"
    echo ""
    echo "The script uses 'medium' model for best balance of speed and accuracy."
else
    echo "❌ Whisper installation failed. Please try:"
    echo "pip3 install --upgrade openai-whisper"
fi
