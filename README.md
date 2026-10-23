# Jupyter Notebook Clone with Gemini AI & Deep Learning Practicals

A Jupyter Notebook 7 web interface featuring interactive cells, AI code generation & debugging powered by Google Gemini 2.5 Flash, and pre-bundled Deep Learning (DL) practical notebooks (`dl_code/`).

## ✨ Features
- **Authentic Jupyter UI**: Complete with menu bar, toolbar, cell shortcuts (`Shift+Enter`, `Alt+Enter`), Markdown & Code cell toggling.
- **Gemini 2.5 Flash AI Assistant**: Generate code, debug errors, explain tracebacks, and optimize algorithms directly inside notebook cells.
- **Deep Learning Dropdown**: Click the **"Trusted"** button in the top-right toolbar to load practical notebooks directly into the editor from `dl_code/`.
- **Vercel Serverless Ready**: Secure serverless backend at `/api/gemini` for handling AI prompts without exposing API keys on the frontend.

## 🚀 Deploy to Vercel

1. Push this repository to your GitHub account (already synced at `sohamshetye-git/sna`).
2. Go to [Vercel Dashboard](https://vercel.com/new).
3. Import the `sohamshetye-git/sna` repository.
4. In the **Environment Variables** section, add:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: `Your_Gemini_API_Key`
5. Click **Deploy**. Your app will be live within seconds!

## 💻 Local Running
To run locally with the Python kernel:
```bash
python server.py
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
