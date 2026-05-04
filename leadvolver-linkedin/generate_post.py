import os
import json
import datetime
import requests
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

client = Anthropic()

# Step 1: Determine pillar
day = datetime.datetime.now().weekday()  # 0=Mon, 6=Sun
pillars = [
    "Problem Awareness",
    "Math / ROI",
    "Social Proof",
    "Authority / Education",
    "Problem Awareness",
    "Math / ROI",
    "Founder Story"
]
today_pillar = pillars[day]
print(f"Today's pillar: {today_pillar}")

# Step 2: Generate caption
caption_prompt = f"""You are writing a LinkedIn post for Leadvolver, an AI lead reactivation agency targeting renovation companies.

Today's pillar: {today_pillar}

Rules:
- Max 600 characters
- Founder story tone, personal, direct
- Bold black and white energy - no fluff
- 1-3 emojis max, only where they add punch
- Hook on line 1 that stops the scroll alone
- End with a clear CTA
- Short sentences, white space, no buzzwords

Write the caption only. No explanation. No label. Just the post."""

response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=400,
    messages=[{"role": "user", "content": caption_prompt}]
)
caption = response.content[0].text.strip()
caption = caption[:597] + "..." if len(caption) > 600 else caption
print(f"\nCaption ({len(caption)} chars):\n{caption}\n")

# Step 3: Post to LinkedIn as text only
ACCESS_TOKEN = os.environ.get("LINKEDIN_ACCESS_TOKEN")
PERSON_URN = os.environ.get("LINKEDIN_PERSON_URN")

if not ACCESS_TOKEN or not PERSON_URN:
    print("No LinkedIn credentials. Skipping post.")
    linkedin_status = "skipped"
else:
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0"
    }

    post_payload = {
        "author": PERSON_URN,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": caption},
                "shareMediaCategory": "NONE"
            }
        },
        "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"}
    }

    post_response = requests.post(
        "https://api.linkedin.com/v2/ugcPosts",
        headers=headers,
        json=post_payload
    )
    linkedin_status = post_response.status_code
    print(f"LinkedIn post status: {linkedin_status}")

# Step 4: Log
log_entry = {
    "date": str(datetime.date.today()),
    "pillar": today_pillar,
    "caption": caption,
    "linkedin_status": str(linkedin_status)
}

log_path = os.path.join(os.path.dirname(__file__), "posted_log.json")
log = []
if os.path.exists(log_path):
    with open(log_path, "r") as f:
        try:
            log = json.load(f)
        except json.JSONDecodeError:
            log = []

log.append(log_entry)
with open(log_path, "w") as f:
    json.dump(log, f, indent=2)

print(f"\nDone. Pillar: {today_pillar} | LinkedIn: {linkedin_status}")
