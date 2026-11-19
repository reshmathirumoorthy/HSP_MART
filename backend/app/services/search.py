"""Product knowledge retrieval for the AI engines (Blueprint §5: "PostgreSQL with vector search initially").

Always on: Postgres full-text rank over name/description/tags + trigram similarity on the name (typo tolerant).
When VOYAGE_API_KEY is set and the embedding job has run, cosine similarity on pgvector embeddings is blended in,
so "something for a tea lover" finds infusers and mugs even without shared words. Only verified catalogue text is
embedded — never customer data.
"""
import json
import httpx
from sqlalchemy import Connection
from ..config import settings
from ..db import all_, one, run

DOC = """concat_ws(' ', name, division::text, category_slug, subcategory, content->>'shortDescription',
                    content->>'description', content->>'tags')"""
VOYAGE_URL = "https://api.voyageai.com/v1/embeddings"
BATCH = 64


def semantic_enabled() -> bool:
    return bool(settings().voyage_api_key)


def _embed(texts: list[str], input_type: str) -> list[list[float]] | None:
    st = settings()
    if not st.voyage_api_key or not texts:
        return None
    try:
        r = httpx.post(VOYAGE_URL, headers={"Authorization": f"Bearer {st.voyage_api_key}"},
                       json={"input": texts, "model": st.embedding_model, "input_type": input_type, "output_dimension": 1024},
                       timeout=20)
        r.raise_for_status()
        return [d["embedding"] for d in sorted(r.json()["data"], key=lambda d: d["index"])]
    except (httpx.HTTPError, KeyError, ValueError):
        return None


def refresh_embeddings(conn: Connection, limit: int = 512) -> int:
    """Embed active products that have none (new or edited). Returns how many were embedded."""
    if not semantic_enabled():
        return 0
    rows = all_(conn, f"select id, {DOC} as doc from products where active and embedding is null order by id limit :l", l=limit)
    done = 0
    for i in range(0, len(rows), BATCH):
        chunk = rows[i:i + BATCH]
        vecs = _embed([r["doc"][:4000] for r in chunk], "document")
        if not vecs:
            break
        for r, v in zip(chunk, vecs):
            run(conn, "update products set embedding = cast(:v as vector) where id = :id", v=json.dumps(v), id=r["id"])
        done += len(chunk)
    return done


def relevance(conn: Connection, query: str, ids: list[str]) -> dict[str, float]:
    """Score 0..1 per candidate product id for a free-text query."""
    q = (query or "").strip()
    if not q or not ids:
        return {}
    rows = all_(conn, f"""select id,
                                 ts_rank(to_tsvector('simple', {DOC}), websearch_to_tsquery('simple', :q)) as fts,
                                 word_similarity(lower(:q), lower(name)) as trgm
                          from products where id = any(:ids)""", q=q, ids=ids)
    scores = {r["id"]: min(1.0, float(r["fts"]) * 5) * 0.6 + float(r["trgm"]) * 0.4 for r in rows}
    vec = _embed([q], "query") if semantic_enabled() else None
    if vec:
        sem = all_(conn, """select id, 1 - (embedding <=> cast(:v as vector)) as sim from products
                            where id = any(:ids) and embedding is not null""", v=json.dumps(vec[0]), ids=ids)
        for r in sem:
            scores[r["id"]] = scores.get(r["id"], 0) * 0.4 + max(0.0, float(r["sim"])) * 0.6
    return scores


def status(conn: Connection) -> dict:
    r = one(conn, "select count(*) filter (where active)::int as active, count(embedding)::int as embedded from products")
    return {"semantic": semantic_enabled(), "active": r["active"], "embedded": r["embedded"]}
