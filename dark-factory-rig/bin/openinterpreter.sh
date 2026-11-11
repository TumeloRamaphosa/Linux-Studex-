#!/bin/bash
# Open Interpreter — local free agent on :3100, Ollama-backed (no API cost).
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
export INTERPRETER_HOST=127.0.0.1
export INTERPRETER_PORT=3100
export OLLAMA_HOST=http://127.0.0.1:11434
exec "$HOME/dark-factory-rig/venvs/openinterpreter/bin/interpreter" --server --model ollama/qwen2.5:14b
