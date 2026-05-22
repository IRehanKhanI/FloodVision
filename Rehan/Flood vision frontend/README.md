<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/c2f95ee0-8cc9-4a3d-8dd2-335511714648

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
   cd floodv_ision_backend
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py seed_data
   python manage.py runserver

python manage.py run_mqtt

cd "Flood vision frontend"
npm install
npm run dev

Optional Celery worker (requires Redis):
celery -A floodv_ision_backend worker -l info
