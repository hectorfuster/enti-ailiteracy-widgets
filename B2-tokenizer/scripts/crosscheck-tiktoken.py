import importlib.metadata
import json
import sys

import tiktoken


sys.stdin.reconfigure(encoding="utf-8")
sys.stdout.reconfigure(encoding="utf-8")
texts = json.load(sys.stdin)
encoding_names = ["o200k_base", "cl100k_base"]
ids = {
    encoding_name: [
        tiktoken.get_encoding(encoding_name).encode(text, disallowed_special=())
        for text in texts
    ]
    for encoding_name in encoding_names
}

json.dump(
    {
        "version": importlib.metadata.version("tiktoken"),
        "ids": ids,
    },
    sys.stdout,
    ensure_ascii=False,
)
