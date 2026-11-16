import os
from pathlib import Path
from dotenv import load_dotenv
from huggingface_hub import HfApi

# Load environment
base_dir = Path(__file__).resolve().parent
load_dotenv(base_dir / ".env")
load_dotenv(base_dir.parent / ".env.local")
load_dotenv(base_dir.parent / ".env")

token = os.getenv("HF_TOKEN")
if not token:
    raise ValueError("HF_TOKEN not found in environment!")

api = HfApi(token=token)
user = api.whoami()

print("==========================================")
print("Hugging Face connected successfully!")
print("Username:", user.get("name"))
print("User Type:", user.get("type"))
print("Token Permissions:", user.get("auth", {}).get("type"))
print("==========================================")
