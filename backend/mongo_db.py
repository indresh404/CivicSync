import logging
import datetime
from typing import Optional, Dict, Any, List
import pymongo
from pymongo.collection import Collection
from pymongo.database import Database
from backend.config import MONGO_URI, MONGO_DB_NAME

logger = logging.getLogger("civicsync.mongo")

def serialize_for_mongo(data: Dict[str, Any]) -> Dict[str, Any]:
    """Serializes date/datetime objects to ISO string format safe for MongoDB BSON."""
    cleaned = {}
    for k, v in data.items():
        if isinstance(v, (datetime.date, datetime.datetime)):
            cleaned[k] = v.isoformat()
        elif isinstance(v, dict):
            cleaned[k] = serialize_for_mongo(v)
        elif isinstance(v, list):
            cleaned[k] = [
                serialize_for_mongo(item) if isinstance(item, dict)
                else item.isoformat() if isinstance(item, (datetime.date, datetime.datetime))
                else item
                for item in v
            ]
        else:
            cleaned[k] = v
    return cleaned

class MongoManager:
    client: Optional[pymongo.MongoClient] = None
    db: Optional[Database] = None
    is_connected: bool = False

    def __init__(self):
        self.connect()

    def connect(self) -> bool:
        if not MONGO_URI:
            logger.info("MONGO_URI not provided; running on local relational store.")
            self.is_connected = False
            return False

        try:
            # Set short server selection timeout so startup never hangs if remote cluster is unreachable
            self.client = pymongo.MongoClient(
                MONGO_URI,
                serverSelectionTimeoutMS=2500,
                connectTimeoutMS=2500,
                socketTimeoutMS=2500,
            )
            # Ping to verify active connection
            self.client.admin.command("ping")
            self.db = self.client[MONGO_DB_NAME]
            self.is_connected = True
            logger.info(f"Successfully connected to MongoDB Atlas database: {MONGO_DB_NAME}")
            self._ensure_indexes()
            return True
        except Exception as e:
            self.is_connected = False
            self.client = None
            self.db = None
            logger.warning(
                f"MongoDB connection notice: Could not connect to remote MongoDB ({e}). "
                "CivicSync will operate seamlessly with local persistence."
            )
            return False

    def _ensure_indexes(self):
        if not self.is_connected or self.db is None:
            return
        try:
            self.db.projects.create_index("id", unique=True)
            self.db.projects.create_index("department_id")
            self.db.projects.create_index("status")
            self.db.conflicts.create_index("id", unique=True)
            self.db.conflicts.create_index("project_a_id")
            self.db.conflicts.create_index("project_b_id")
            self.db.audit_logs.create_index("id", unique=True)
            self.db.audit_logs.create_index("project_id")
            self.db.users.create_index("email", unique=True)
            self.db.acknowledgments.create_index("id", unique=True)
        except Exception as ex:
            logger.warning(f"Index creation notice: {ex}")

    def save_project(self, project_doc: Dict[str, Any]) -> None:
        if not self.is_connected or self.db is None:
            return
        try:
            doc = serialize_for_mongo(project_doc)
            self.db.projects.update_one(
                {"id": doc["id"]},
                {"$set": doc},
                upsert=True
            )
        except Exception as ex:
            logger.error(f"MongoDB save_project failed: {ex}")

    def save_conflict(self, conflict_doc: Dict[str, Any]) -> None:
        if not self.is_connected or self.db is None:
            return
        try:
            doc = serialize_for_mongo(conflict_doc)
            self.db.conflicts.update_one(
                {"id": doc["id"]},
                {"$set": doc},
                upsert=True
            )
        except Exception as ex:
            logger.error(f"MongoDB save_conflict failed: {ex}")

    def save_audit(self, audit_doc: Dict[str, Any]) -> None:
        if not self.is_connected or self.db is None:
            return
        try:
            doc = serialize_for_mongo(audit_doc)
            self.db.audit_logs.insert_one(doc)
        except Exception as ex:
            logger.error(f"MongoDB save_audit failed: {ex}")

    def save_user(self, user_doc: Dict[str, Any]) -> None:
        if not self.is_connected or self.db is None:
            return
        try:
            doc = serialize_for_mongo(user_doc)
            self.db.users.update_one(
                {"id": doc["id"]},
                {"$set": doc},
                upsert=True
            )
        except Exception as ex:
            logger.error(f"MongoDB save_user failed: {ex}")

    def save_acknowledgment(self, ack_doc: Dict[str, Any]) -> None:
        if not self.is_connected or self.db is None:
            return
        try:
            doc = serialize_for_mongo(ack_doc)
            self.db.acknowledgments.update_one(
                {"id": doc["id"]},
                {"$set": doc},
                upsert=True
            )
        except Exception as ex:
            logger.error(f"MongoDB save_acknowledgment failed: {ex}")

    def get_projects(self, filter_query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        if not self.is_connected or self.db is None:
            return []
        try:
            return list(self.db.projects.find(filter_query or {}, {"_id": 0}))
        except Exception as ex:
            logger.error(f"MongoDB get_projects failed: {ex}")
            return []

    def get_conflicts(self, filter_query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        if not self.is_connected or self.db is None:
            return []
        try:
            return list(self.db.conflicts.find(filter_query or {}, {"_id": 0}))
        except Exception as ex:
            logger.error(f"MongoDB get_conflicts failed: {ex}")
            return []

    def get_audit_logs(self, filter_query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        if not self.is_connected or self.db is None:
            return []
        try:
            return list(self.db.audit_logs.find(filter_query or {}, {"_id": 0}).sort("created_at", -1))
        except Exception as ex:
            logger.error(f"MongoDB get_audit_logs failed: {ex}")
            return []

mongo_manager = MongoManager()
