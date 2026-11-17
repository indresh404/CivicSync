import os
import json
import time
import uuid
import requests
from typing import Dict, Any, List, Optional
from datetime import datetime

from backend.config import MANUS_API_KEY, MANUS_API_BASE_URL, MANUS_WEBHOOK_SECRET

class ManusService:
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        self.api_key = api_key or MANUS_API_KEY or os.getenv("MANUS_API_KEY", "")
        self.base_url = (base_url or MANUS_API_BASE_URL or os.getenv("MANUS_API_BASE_URL", "https://api.manus.ai")).rstrip("/")

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and len(self.api_key.strip()) > 10)

    def _headers(self) -> Dict[str, str]:
        return {
            "x-manus-api-key": self.api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def build_municipal_context(self, db) -> str:
        """
        Controlled CivicSync context provider: gathers verified municipal projects,
        conflict clashes, active moratoriums, and business rules to provide to Manus.
        """
        try:
            from backend.models import Project, Conflict
            projects = db.query(Project).all()
            conflicts = db.query(Conflict).all()

            lines = [
                "=== CIVICSYNC MUNICIPAL PLATFORM VERIFIED CONTEXT ===",
                "Jurisdiction: Mira Road (Mira-Bhayandar Municipal Corporation - MBMC), Maharashtra, India.",
                "Mandatory Core Rules:",
                "1. Sequencing Hierarchy: Underground utilities (Water DI-600, Sewerage NP3, Gas, Electric) MUST ALWAYS precede surface road resurfacing/asphalt laying.",
                "2. 24-Month Re-Digging Moratorium: Once a road is resurfaced, no open trench excavation is permitted for 24 months (penalty avoided per prevented re-dig: ₹3,50,000 INR).",
                "3. Proximity Collision Threshold: 50.0 meters. Any concurrent projects within 50m trigger a spatial-temporal conflict clash.",
                "",
                f"Active Registered Projects Count: {len(projects)}",
            ]

            for p in projects[:10]:
                lines.append(f"- [{p.department}] {p.name} on '{p.road_name}' ({p.status}) | Dates: {p.start_date} to {p.end_date}")

            lines.append(f"\nActive Detected Conflicts Count: {len(conflicts)}")
            for c in conflicts[:8]:
                p_a = next((p for p in projects if p.id == c.project_a_id), None)
                p_b = next((p for p in projects if p.id == c.project_b_id), None)
                name_a = p_a.name if p_a else c.project_a_id
                name_b = p_b.name if p_b else c.project_b_id
                lines.append(
                    f"- Clash ID {c.id}: {name_a} vs {name_b} | Severity: {c.severity_level} (Score: {c.severity_score:.1f}) | Distance: {c.calculated_distance:.1f}m | Overlap: {c.overlapping_days} days | Recommended: {c.suggested_sequence}"
                )

            lines.append("=== END OF VERIFIED CONTEXT ===\n")
            return "\n".join(lines)
        except Exception as e:
            return f"Municipal Context: Active Mira Road infrastructure coordination dataset (Error loading DB details: {e})\n"

    def create_task(self, prompt: str, context: Optional[str] = None) -> Dict[str, Any]:
        """
        Creates a new Manus task via POST /v2/task.create.
        """
        if not self.is_configured:
            return {
                "ok": False,
                "error": "Manus API key is not configured. Add MANUS_API_KEY in .env or server environment.",
            }

        url = f"{self.base_url}/v2/task.create"
        
        full_content = prompt
        if context:
            full_content = f"{context}\n\nUser Question:\n{prompt}"

        payload = {
            "message": {
                "content": full_content
            }
        }

        try:
            resp = requests.post(url, headers=self._headers(), json=payload, timeout=20)
            if resp.status_code in (200, 201):
                return resp.json()
            return {
                "ok": False,
                "status_code": resp.status_code,
                "error": resp.text,
            }
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def send_message(self, task_id: str, content: str) -> Dict[str, Any]:
        """
        Sends a follow-up message to an existing task via POST /v2/task.sendMessage.
        """
        if not self.is_configured:
            return {"ok": False, "error": "Manus API key is not configured."}

        url = f"{self.base_url}/v2/task.sendMessage"
        payload = {
            "task_id": task_id,
            "message": {
                "content": content
            }
        }

        try:
            resp = requests.post(url, headers=self._headers(), json=payload, timeout=20)
            if resp.status_code in (200, 201):
                return resp.json()
            return {
                "ok": False,
                "status_code": resp.status_code,
                "error": resp.text,
            }
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def get_task_detail(self, task_id: str) -> Dict[str, Any]:
        """
        Retrieves task status via GET /v2/task.detail?task_id={task_id}.
        """
        if not self.is_configured:
            return {"ok": False, "error": "Manus API key is not configured."}

        url = f"{self.base_url}/v2/task.detail?task_id={task_id}"
        try:
            resp = requests.get(url, headers=self._headers(), timeout=15)
            if resp.status_code == 200:
                return resp.json()
            return {"ok": False, "status_code": resp.status_code, "error": resp.text}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def list_messages(self, task_id: str) -> Dict[str, Any]:
        """
        Lists task messages via GET /v2/task.listMessages?task_id={task_id}.
        """
        if not self.is_configured:
            return {"ok": False, "error": "Manus API key is not configured."}

        url = f"{self.base_url}/v2/task.listMessages?task_id={task_id}"
        try:
            resp = requests.get(url, headers=self._headers(), timeout=15)
            if resp.status_code == 200:
                return resp.json()
            return {"ok": False, "status_code": resp.status_code, "error": resp.text}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def wait_for_response(self, task_id: str, max_wait_seconds: int = 15, poll_interval: float = 1.5) -> Optional[str]:
        """
        Polls Manus task for the latest assistant message with timeout and backoff.
        """
        start = time.time()
        while time.time() - start < max_wait_seconds:
            msg_data = self.list_messages(task_id)
            if msg_data.get("ok"):
                messages = msg_data.get("messages", [])
                # Look for assistant messages from newest to oldest
                for m in reversed(messages):
                    if "assistant_message" in m and m["assistant_message"].get("content"):
                        return m["assistant_message"]["content"]
            
            # Check if task is stopped
            detail = self.get_task_detail(task_id)
            if detail.get("ok"):
                status = detail.get("task", {}).get("status")
                if status in ("failed", "cancelled"):
                    break
            
            time.sleep(poll_interval)
        
        # Return whatever partial assistant response exists, if any
        msg_data = self.list_messages(task_id)
        if msg_data.get("ok"):
            for m in reversed(msg_data.get("messages", [])):
                if "assistant_message" in m and m["assistant_message"].get("content"):
                    return m["assistant_message"]["content"]
        return None

# Singleton instance
manus_service = ManusService()
