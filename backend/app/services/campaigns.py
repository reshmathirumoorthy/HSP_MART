from sqlalchemy import Connection
from ..audit import audit
from ..db import all_
from ..notify import notify


def send_campaign(conn: Connection, actor, template: str):
    """Marketing broadcast. The outbox blocks anyone without recorded consent."""
    sent = blocked = 0
    for c in all_(conn, "select name, email, marketing_consent from customers where email is not null"):
        r = notify(conn, channel="email", recipient=c["email"], template=template, category="marketing",
                   payload={"name": c["name"]}, consent=c["marketing_consent"])
        if r["status"] == "blocked":
            blocked += 1
        else:
            sent += 1
    audit(conn, actor, "campaign.send", "campaign", template, None, {"sent": sent, "blocked": blocked})
    return {"sent": sent, "blocked": blocked}
