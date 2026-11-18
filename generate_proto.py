import os
import sys
import subprocess
from pathlib import Path

def generate():
    root = Path(__file__).parent
    proto_path = root / "proto" / "auction.proto"
    
    # Destination directories for backend services
    targets = [
        root / "backend" / "shard" / "generated",
        root / "backend" / "gateway" / "generated"
    ]
    
    for t in targets:
        t.mkdir(parents=True, exist_ok=True)
        (t / "__init__.py").touch()
        
        cmd = [
            sys.executable, "-m", "grpc_tools.protoc",
            f"-I{root / 'proto'}",
            f"--python_out={t}",
            f"--grpc_python_out={t}",
            str(proto_path)
        ]
        print(f"Generating proto for {t}...")
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            print("Error running protoc:", res.stderr)
        else:
            grpc_file = t / "auction_pb2_grpc.py"
            if grpc_file.exists():
                content = grpc_file.read_text(encoding="utf-8")
                content = content.replace("import auction_pb2 as auction__pb2", "from . import auction_pb2 as auction__pb2")
                grpc_file.write_text(content, encoding="utf-8")
            print(f"[OK] Successfully generated protobuf in {t}")

if __name__ == "__main__":
    generate()
