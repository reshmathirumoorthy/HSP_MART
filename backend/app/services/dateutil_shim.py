import calendar
from datetime import datetime


def add_months(d: datetime, months: int) -> datetime:
    """JS Date#setMonth semantics: overflowing days roll into the next month."""
    from datetime import timedelta
    m = d.month - 1 + months
    y, m = d.year + m // 12, m % 12 + 1
    last = calendar.monthrange(y, m)[1]
    if d.day <= last:
        return d.replace(year=y, month=m)
    return d.replace(year=y, month=m, day=last) + timedelta(days=d.day - last)
