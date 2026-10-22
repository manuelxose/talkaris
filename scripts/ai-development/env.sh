#!/usr/bin/env bash
# Source this file in WSL before invoking native Node tooling.
talkaris_node_bin="$HOME/.nvm/versions/node/v22.23.2/bin"
if [ ! -x "$talkaris_node_bin/node" ]; then
  echo 'Required native Node 22.23.2 is missing; install/activate the project Node version.' >&2
  return 1 2>/dev/null || exit 1
fi
export PATH="$talkaris_node_bin:$HOME/.local/bin:$PATH"
# Keep Angular's parallel bundler within this workstation's WSL memory limit.
export NG_BUILD_MAX_WORKERS="${NG_BUILD_MAX_WORKERS:-1}"
unset talkaris_node_bin
