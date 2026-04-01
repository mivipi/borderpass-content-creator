#!/usr/bin/env python3
"""
BorderPass Content Creator — Feed Scraper
==========================================
Scrapes IRCC, Reddit, Google News, and competitor RSS feeds.
Outputs feed_data.json which the web app loads on startup.

Run manually:  python3 borderpass_scraper.py
Scheduled:     GitHub Actions (.github/workflows/scrape.yml) runs this daily.

Requirements:  pip install feedparser requests
"""

import json
import re
import hashlib
import requests
import feedparser
from datetime import datetime, timezone


# ─── SCRAPERS ─────────────────────────────────────────────────────────────────

def scrape_ircc():
    """IRCC news and press releases via Canada.ca feeds."""
    items = []
    sources = [
        "https://www.canada.ca/en/immigration-refugees-citizenship/news.atom",
        "https://api.io.canada.ca/io-server/gc/news/en/v2?dept=departmentofcitizenshipandimmigration&type=newsreleases&atomType=atom",
    ]
    for feed_url in sources:
        try:
            feed = feedparser.parse(feed_url)
            if not feed.entries:
                continue
            for entry in feed.entries[:5]:
                title   = entry.get("title", "").strip()
                summary = strip_html(entry.get("summary", entry.get("description", "")))[:400]
                link    = entry.get("link", "")
                pub     = entry.get("published", entry.get("updated", ""))
                if not title or len(title) < 15:
                    continue

                high_kw = ["express entry","draw","cap","pgwp","permit","policy","announcement","change","update"]
                urgency = "high" if any(k in title.lower() for k in high_kw) else "medium"

                tag_map = {
                    "express entry": "Express Entry", "study permit": "Study Permit",
                    "work permit": "Work Permit",     "pgwp": "PGWP",
                    "permanent resid": "PR Pathway",  "refugee": "Refugee",
                    "citizenship": "Citizenship",      "student": "International Students",
                    "employer": "Employers",           "rural": "RNIP",
                }
                tags = ["IRCC"]
                combined = (title + " " + summary).lower()
                for kw, tag in tag_map.items():
                    if kw in combined and tag not in tags:
                        tags.append(tag)

                items.append({
                    "id": f"ircc-{hashlib.md5(link.encode()).hexdigest()[:8]}",
                    "cat": "ircc", "src": "IRCC.gc.ca",
                    "date": format_date(pub), "title": title,
                    "summary": summary or "IRCC news release.",
                    "tags": tags[:4], "urgency": urgency, "url": link,
                })
            if items:
                break  # Got data, no need to try backup
        except Exception as e:
            print(f"  IRCC feed error ({feed_url[:50]}...): {e}")

    print(f"  IRCC: {len(items)} items")
    return items


def scrape_reddit():
    """Top posts from Canadian immigration subreddits via Reddit JSON API (no auth needed)."""
    items = []
    subreddits = ["ImmigrationCanada", "studyAbroad", "canada"]
    headers    = {"User-Agent": "BorderPass-ContentBot/1.0 (content research; non-commercial)"}
    imm_kw     = ["immigr","permit","visa","pgwp","study","work permit","pr ","citizen","ircc",
                  "express entry","refugee","newcomer","international student","canada"]

    for sub in subreddits:
        try:
            url = f"https://www.reddit.com/r/{sub}/top.json?t=week&limit=5"
            r   = requests.get(url, headers=headers, timeout=12)
            if r.status_code != 200:
                print(f"  Reddit r/{sub}: HTTP {r.status_code}")
                continue

            posts = r.json().get("data", {}).get("children", [])
            count = 0
            for post in posts:
                d = post.get("data", {})
                title    = d.get("title", "")
                score    = d.get("score", 0)
                comments = d.get("num_comments", 0)
                selftext = (d.get("selftext", "") or "").strip()
                if selftext in ("[removed]", "[deleted]"):
                    selftext = ""

                if not any(k in title.lower() for k in imm_kw):
                    continue  # Not immigration-relevant

                created  = d.get("created_utc", 0)
                date_str = datetime.fromtimestamp(created, tz=timezone.utc).strftime("%b %d, %Y")
                summary  = selftext[:280] if selftext else (
                    f"Top post in r/{sub} this week. {score:,} upvotes, {comments:,} comments."
                )
                urgency  = "high" if score > 400 else "medium"
                disp     = f'"{title}" — {score:,} upvotes, {comments:,} comments'

                items.append({
                    "id": f"reddit-{d.get('id','')}",
                    "cat": "ugc", "src": f"r/{sub}",
                    "date": date_str, "title": disp,
                    "summary": summary, "tags": ["Reddit","UGC",sub[:20]],
                    "urgency": urgency,
                    "url": f"https://reddit.com{d.get('permalink','/')}",
                })
                count += 1
                if count >= 2:
                    break

        except Exception as e:
            print(f"  Reddit r/{sub} error: {e}")

    print(f"  Reddit: {len(items)} items")
    return items


def scrape_google_news():
    """Canada immigration news via Google News RSS (no API key needed)."""
    items = []
    queries = [
        ("IRCC Canada immigration announcement",     "ircc"),
        ("Canada study permit international students","industry"),
        ("Canada immigration employer work permit",   "industry"),
        ("Canada permanent residence express entry",  "ircc"),
    ]

    for query, cat in queries:
        try:
            encoded = requests.utils.quote(query)
            url     = f"https://news.google.com/rss/search?q={encoded}&hl=en-CA&gl=CA&ceid=CA:en"
            feed    = feedparser.parse(url)

            for entry in feed.entries[:2]:
                raw_title = entry.get("title", "")
                # Google News format: "Headline - Source Name"
                if " - " in raw_title:
                    parts   = raw_title.rsplit(" - ", 1)
                    title   = parts[0].strip()
                    source  = parts[1].strip()
                else:
                    title   = raw_title
                    source  = "News"

                summary = strip_html(entry.get("summary", ""))[:300]
                pub     = entry.get("published", "")
                link    = entry.get("link", "#")

                if len(title) < 20:
                    continue

                items.append({
                    "id": f"news-{hashlib.md5(link.encode()).hexdigest()[:8]}",
                    "cat": cat, "src": source,
                    "date": format_date(pub), "title": title,
                    "summary": summary or f"Coverage of: {query}",
                    "tags": ["News","Canada","Immigration"],
                    "urgency": "medium", "url": link,
                })
        except Exception as e:
            print(f"  Google News ('{query[:30]}'): {e}")

    print(f"  Google News: {len(items)} items")
    return items


def scrape_competitor_rss():
    """Competitor RSS feeds — Moving2Canada, CanadaVisa, Arrive."""
    items = []
    feeds = [
        ("https://moving2canada.com/feed/",                          "Moving2Canada", "competitor"),
        ("https://www.canadavisa.com/canada-immigration-news.rss",   "CanadaVisa",    "competitor"),
        ("https://www.cic.gc.ca/english/helpcentre/rss/answers.asp", "CIC HelpCentre","ircc"),
    ]

    for url, name, cat in feeds:
        try:
            feed = feedparser.parse(url)
            for entry in feed.entries[:2]:
                title   = entry.get("title", "").strip()
                summary = strip_html(entry.get("summary", entry.get("description", "")))[:300]
                pub     = entry.get("published", entry.get("updated", ""))
                link    = entry.get("link", "#")

                if not title or len(title) < 10:
                    continue

                items.append({
                    "id": f"comp-{hashlib.md5(link.encode()).hexdigest()[:8]}",
                    "cat": cat, "src": name,
                    "date": format_date(pub), "title": title,
                    "summary": summary or f"New content from {name}.",
                    "tags": [name, "Competitor" if cat=="competitor" else "IRCC"],
                    "urgency": "low" if cat=="competitor" else "medium",
                    "url": link,
                })
        except Exception as e:
            print(f"  {name} RSS error: {e}")

    print(f"  Competitors/CIC: {len(items)} items")
    return items


# ─── HELPERS ──────────────────────────────────────────────────────────────────

def strip_html(text):
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def format_date(date_str):
    if not date_str:
        return datetime.now(timezone.utc).strftime("%b %d, %Y")
    fmts = [
        "%a, %d %b %Y %H:%M:%S %z",
        "%a, %d %b %Y %H:%M:%S %Z",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d",
    ]
    for fmt in fmts:
        try:
            truncated = date_str[:len(fmt)+4]
            dt = datetime.strptime(truncated, fmt[:len(truncated)])
            return dt.strftime("%b %d, %Y")
        except Exception:
            pass
    return datetime.now(timezone.utc).strftime("%b %d, %Y")


def deduplicate(items):
    seen, out = set(), []
    for item in items:
        url = item.get("url", "")
        key = url if (url and url != "#") else item.get("id", "")
        if key not in seen:
            seen.add(key)
            out.append(item)
    return out


# ─── MAIN ─────────────────────────────────────────────────────────────────────

def main():
    now = datetime.now(timezone.utc)
    print("BorderPass Content Creator — Feed Scraper")
    print(f"Run time: {now.strftime('%Y-%m-%d %H:%M UTC')}")
    print("=" * 50)

    all_items = []
    all_items.extend(scrape_ircc())
    all_items.extend(scrape_reddit())
    all_items.extend(scrape_google_news())
    all_items.extend(scrape_competitor_rss())

    unique = deduplicate(all_items)

    output = {
        "updated": now.strftime("%b %d, %Y %H:%M UTC"),
        "count":   len(unique),
        "items":   unique,
    }

    with open("feed_data.json", "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Wrote {len(unique)} items to feed_data.json")
    print(f"  IRCC:        {sum(1 for i in unique if i['cat']=='ircc')}")
    print(f"  Competitors: {sum(1 for i in unique if i['cat']=='competitor')}")
    print(f"  UGC:         {sum(1 for i in unique if i['cat']=='ugc')}")
    print(f"  Industry:    {sum(1 for i in unique if i['cat']=='industry')}")


if __name__ == "__main__":
    main()
