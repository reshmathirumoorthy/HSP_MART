class CommerceError(Exception):
    """A business-rule violation; shown to the user as-is (HTTP 400)."""


def fail(msg: str):
    raise CommerceError(msg)
