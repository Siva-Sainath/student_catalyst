"""
Job scraper — fetches real internship and job listings from public sources (YC, Arbeitnow, Remotive, and WWR).
Results are cached in memory for 2 hours.
Falls back to a curated realistic list if scraping fails.
"""

from __future__ import annotations

import json
import time
import logging
import requests
from bs4 import BeautifulSoup
from typing import Any

log = logging.getLogger(__name__)

_CACHE: dict[str, Any] = {"jobs": [], "fetched_at": 0.0}
_CACHE_TTL = 7200  # 2 hours

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}

FALLBACK_JOBS = [
    {
        "company": "Google",
        "role": "Software Engineering Intern",
        "location": "Bangalore",
        "stipend": "₹80,000/mo",
        "deadline": "Jun 30, 2026",
        "skills": ["Python", "C++", "Algorithms"],
        "apply_link": "https://careers.google.com/jobs/results/?q=software+engineering+intern",
        "source": "fallback",
    },
    {
        "company": "Microsoft",
        "role": "SDE Intern",
        "location": "Hyderabad",
        "stipend": "₹75,000/mo",
        "deadline": "Jul 05, 2026",
        "skills": ["Java", "Azure", "System Design"],
        "apply_link": "https://careers.microsoft.com/us/en/search-results?keywords=intern",
        "source": "fallback",
    },
    {
        "company": "Razorpay",
        "role": "Frontend Engineer Intern",
        "location": "Bangalore",
        "stipend": "₹50,000/mo",
        "deadline": "Jun 20, 2026",
        "skills": ["React", "TypeScript", "CSS"],
        "apply_link": "https://razorpay.com/jobs/",
        "source": "fallback",
    },
    {
        "company": "CRED",
        "role": "Data Science Intern",
        "location": "Bangalore",
        "stipend": "₹60,000/mo",
        "deadline": "Jul 10, 2026",
        "skills": ["Python", "SQL", "ML"],
        "apply_link": "https://careers.cred.club/",
        "source": "fallback",
    },
    {
        "company": "Swiggy",
        "role": "Backend Engineer Intern",
        "location": "Bangalore",
        "stipend": "₹55,000/mo",
        "deadline": "Jun 25, 2026",
        "skills": ["Go", "Kafka", "PostgreSQL"],
        "apply_link": "https://careers.swiggy.com/#/",
        "source": "fallback",
    },
    {
        "company": "Stripe",
        "role": "Infrastructure Intern",
        "location": "Remote (India)",
        "stipend": "₹1,20,000/mo",
        "deadline": "Jul 15, 2026",
        "skills": ["Ruby", "Distributed Systems", "AWS"],
        "apply_link": "https://stripe.com/jobs",
        "source": "fallback",
    },
    {
        "company": "Zepto",
        "role": "Mobile Developer Intern",
        "location": "Mumbai",
        "stipend": "₹45,000/mo",
        "deadline": "Jun 28, 2026",
        "skills": ["React Native", "iOS", "Android"],
        "apply_link": "https://zepto.app/careers/",
        "source": "fallback",
    },
    {
        "company": "Zomato",
        "role": "Product Intern",
        "location": "Gurugram",
        "stipend": "₹50,000/mo",
        "deadline": "Jul 3, 2026",
        "skills": ["Product Thinking", "SQL", "Analytics"],
        "apply_link": "https://www.zomato.com/careers",
        "source": "fallback",
    },
]


def _scrape_yc_jobs() -> list[dict]:
    """Fetch live Y Combinator / Hacker News jobs via RSS feed."""
    url = "https://hnrss.org/jobs"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=8)
        resp.raise_for_status()
    except Exception as exc:
        log.warning("YC Jobs RSS fetch failed: %s", exc)
        return []

    soup = BeautifulSoup(resp.text, "xml")
    jobs = []
    for item in soup.select("item")[:10]:
        try:
            title_el = item.select_one("title")
            link_el  = item.select_one("link")
            
            title = title_el.get_text(strip=True) if title_el else "Software Engineer"
            link  = link_el.get_text(strip=True)  if link_el  else "https://news.ycombinator.com/jobs"
            
            company = "YC Startup"
            role = title
            if " is hiring " in title:
                parts = title.split(" is hiring ")
                company = parts[0]
                role = parts[1]
            elif " is looking for " in title:
                parts = title.split(" is looking for ")
                company = parts[0]
                role = parts[1]
                
            jobs.append({
                "company":    company.strip(),
                "role":       role.strip(),
                "location":   "Remote / Hybrid",
                "stipend":    "Competitive Salary",
                "deadline":   "Open",
                "skills":     ["Startup", "Scale"],
                "apply_link": link.strip(),
                "source":     "internshala",  # Map to "Live" tab in UI
            })
        except Exception:
            continue
    return jobs


def _fetch_arbeitnow_jobs() -> list[dict]:
    """Fetch jobs from Arbeitnow job board JSON API."""
    url = "https://www.arbeitnow.com/api/job-board-api"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        log.warning("Arbeitnow API fetch failed: %s", exc)
        return []

    jobs = []
    for item in data.get("data", [])[:12]:
        try:
            jobs.append({
                "company":    item.get("company_name", "Company"),
                "role":       item.get("title", "Software Developer"),
                "location":   item.get("location", "Europe / Remote"),
                "stipend":    "Competitive Salary",
                "deadline":   "Open",
                "skills":     item.get("tags", ["Tech"]),
                "apply_link": item.get("url", "https://www.arbeitnow.com/"),
                "source":     "internshala",  # Map to "Live" tab in UI
            })
        except Exception:
            continue
    return jobs


def _fetch_remotive_jobs() -> list[dict]:
    """Fetch remote software engineering jobs from Remotive API."""
    url = "https://remotive.com/api/remote-jobs?category=software-development&limit=15"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        log.warning("Remotive API fetch failed: %s", exc)
        return []
    
    jobs = []
    for item in data.get("jobs", [])[:15]:
        try:
            jobs.append({
                "company":    item.get("company_name", "Company"),
                "role":       item.get("title", "Software Developer"),
                "location":   item.get("candidate_required_location", "Remote"),
                "stipend":    item.get("salary", "Competitive Salary"),
                "deadline":   "Open",
                "skills":     item.get("tags", ["Remote", "Developer"]),
                "apply_link": item.get("url", "https://remotive.com/"),
                "source":     "internshala",  # Map to "Live" tab in UI
            })
        except Exception:
            continue
    return jobs


def _scrape_wwr_jobs() -> list[dict]:
    """Fetch programming jobs from We Work Remotely RSS feed."""
    url = "https://weworkremotely.com/categories/remote-programming-jobs.rss"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=8)
        resp.raise_for_status()
    except Exception as exc:
        log.warning("WWR RSS fetch failed: %s", exc)
        return []

    soup = BeautifulSoup(resp.text, "xml")
    jobs = []
    for item in soup.select("item")[:10]:
        try:
            title_el = item.select_one("title")
            link_el  = item.select_one("link")
            
            title = title_el.get_text(strip=True) if title_el else "Software Developer"
            link  = link_el.get_text(strip=True)  if link_el  else "https://weworkremotely.com/"
            
            company = "WWR Startup"
            role = title
            if ":" in title:
                parts = title.split(":", 1)
                company = parts[0].strip()
                role = parts[1].strip()
                
            jobs.append({
                "company":    company,
                "role":       role,
                "location":   "Remote",
                "stipend":    "Competitive Salary",
                "deadline":   "Open",
                "skills":     ["Remote", "WWR"],
                "apply_link": link.strip(),
                "source":     "internshala",  # Map to "Live" tab in UI
            })
        except Exception:
            continue
    return jobs


def is_internship(job: dict) -> bool:
    role = job.get("role", "").lower()
    stipend = job.get("stipend", "").lower()
    return "intern" in role or "stipend" in stipend or "internship" in role


def get_jobs(user_skills: list[str] | None = None) -> list[dict]:
    """
    Return scraped listings from YC, Arbeitnow, Remotive, and WWR,
    plus FALLBACK_JOBS. Cached for 2 hours.
    Sorted with all Internships appearing first, then regular Jobs.
    """
    now = time.time()
    if _CACHE["jobs"] and (now - _CACHE["fetched_at"]) < _CACHE_TTL:
        return _CACHE["jobs"]

    log.info("Fetching fresh job listings from YC, Arbeitnow, Remotive, and WWR...")
    scraped_yc = _scrape_yc_jobs()
    scraped_arbeitnow = _fetch_arbeitnow_jobs()
    scraped_remotive = _fetch_remotive_jobs()
    scraped_wwr = _scrape_wwr_jobs()
    
    # Combine all sources
    jobs = scraped_yc + scraped_arbeitnow + scraped_remotive + scraped_wwr + FALLBACK_JOBS

    # Sort so that all Internships appear first, then regular Jobs
    jobs.sort(key=lambda j: 0 if is_internship(j) else 1)

    _CACHE["jobs"] = jobs
    _CACHE["fetched_at"] = now
    return jobs
