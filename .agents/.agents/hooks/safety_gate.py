#!/usr/bin/env python3
"""
Antigravity PreToolUse Safety Gate Hook
Guards against accidental deletion of local data snapshots or destructive commands.
"""

import sys
import json
import re

def main():
    try:
        raw_input = sys.stdin.read()
        if not raw_input.strip():
            print(json.dumps({"decision": "allow"}))
            return
            
        payload = json.loads(raw_input)
        tool_call = payload.get("toolCall", {})
        args = tool_call.get("args", {})
        
        command_line = args.get("CommandLine", "")
        
        # High risk patterns
        destructive_patterns = [
            r"rm\s+-rf\s+.*",
            r"drop\s+table\s+.*",
            r"truncate\s+.*",
            r"Remove-Item.*\.local-.*",
            r"git\s+reset\s+--hard",
            r"git\s+clean\s+-fdx"
        ]
        
        for pattern in destructive_patterns:
            if re.search(pattern, command_line, re.IGNORECASE):
                response = {
                    "decision": "ask",
                    "reason": f"Potentially destructive command detected: '{command_line}'. User confirmation required."
                }
                print(json.dumps(response))
                return
                
        # Default allow
        print(json.dumps({"decision": "allow"}))
    except Exception as e:
        print(json.dumps({"decision": "allow", "reason": f"Safety hook fallback: {str(e)}"}))

if __name__ == "__main__":
    main()
