"""
rag_engine.py — retrieval-augmented generation over knowledge_base/*.txt

Minimal, dependency-light implementation using TF-IDF style keyword overlap
for retrieval. Swap `_score` for a real embedding model (e.g. sentence-transformers,
or an API embedding call) when moving beyond the prototype stage.
"""
import os
import re
from collections import Counter
from config import Config

_STOPWORDS = {"the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "is", "are", "da", "na", "a"}

def _tokenize(text: str):
    return [w for w in re.findall(r"[a-zA-Z']+", text.lower()) if w not in _STOPWORDS]

class KnowledgeBase:
    def __init__(self, directory: str = None):
        self.directory = directory or Config.KNOWLEDGE_BASE_DIR
        self.documents = []  # list of {"source": filename, "text": str, "tokens": Counter}
        self._load()

    def _load(self):
        if not os.path.isdir(self.directory):
            return
        for fname in os.listdir(self.directory):
            if fname.endswith(".txt"):
                path = os.path.join(self.directory, fname)
                with open(path, "r", encoding="utf-8") as f:
                    text = f.read()
                self.documents.append({
                    "source": fname,
                    "text": text,
                    "tokens": Counter(_tokenize(text)),
                })

    def _score(self, query_tokens, doc_tokens):
        return sum(doc_tokens.get(t, 0) for t in query_tokens)

    def retrieve(self, query: str, top_k: int = 3):
        q_tokens = _tokenize(query)
        scored = [
            (self._score(q_tokens, doc["tokens"]), doc)
            for doc in self.documents
        ]
        scored.sort(key=lambda x: x[0], reverse=True)
        return [doc for score, doc in scored[:top_k] if score > 0]


class RAGEngine:
    def __init__(self):
        self.kb = KnowledgeBase()
        self._client = None
        if Config.ANTHROPIC_API_KEY:
            import anthropic
            self._client = anthropic.Anthropic(api_key=Config.ANTHROPIC_API_KEY)

    def answer(self, question: str):
        matches = self.kb.retrieve(question)
        if not matches:
            return {
                "answer": "Ban sami wani abu mai dacewa a cikin ilimin da nake da shi ba. "
                           "Tambayi ƙwararren HACCP/tsaro na abinci don ƙarin bayani.",
                "sources": [],
            }

        context = "\n\n".join(f"[{m['source']}]\n{m['text'][:1500]}" for m in matches)
        sources = [m["source"] for m in matches]

        if self._client is None:
            # No ANTHROPIC_API_KEY configured — fall back to the raw retrieved
            # snippet so the endpoint stays usable, but make the limitation explicit
            # instead of silently pretending this is a generated answer.
            snippet = matches[0]["text"].strip().split("\n")[0][:400]
            return {
                "answer": f"[Ba a saita ANTHROPIC_API_KEY ba — ana nuna bayani daga tushen kai tsaye]\n{snippet}",
                "sources": sources,
            }

        system_prompt = (
            "You are QualiFood AI's food safety assistant for HACCP inspectors. "
            "Answer only using the provided CONTEXT. If the context does not fully answer "
            "the question, say what is missing rather than guessing. Keep answers concise "
            "and practical for a working inspector. Respond in Hausa if the question is in Hausa."
        )
        try:
            response = self._client.messages.create(
                model=Config.AI_MODEL,
                max_tokens=500,
                system=system_prompt,
                messages=[{
                    "role": "user",
                    "content": f"CONTEXT:\n{context}\n\nQUESTION:\n{question}",
                }],
            )
            answer_text = "".join(
                block.text for block in response.content if getattr(block, "type", None) == "text"
            )
            return {"answer": answer_text, "sources": sources}
        except Exception as exc:
            return {
                "answer": f"AI ya kasa amsawa a yanzu ({exc}). Ga bayani daga tushen kai tsaye maimakon:\n"
                          f"{matches[0]['text'].strip().split(chr(10))[0][:400]}",
                "sources": sources,
            }
