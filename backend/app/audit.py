import json
from sqlalchemy import Connection
from .db import run


def audit(conn: Connection, actor, action: str, entity: str, entity_id, before=None, after=None):
    """Append an audit event inside the caller's transaction."""
    run(
        conn,
        """insert into audit_events (actor_id, actor_role, action, entity, entity_id, before, after)
           values (:aid, :role, :action, :entity, :eid, cast(:before as jsonb), cast(:after as jsonb))""",
        aid=actor.id if actor else None,
        role=actor.role if actor else None,
        action=action,
        entity=entity,
        eid=str(entity_id) if entity_id is not None else None,
        before=json.dumps(before, default=str) if before is not None else None,
        after=json.dumps(after, default=str) if after is not None else None,
    )
