import path from "path";

// Point to local test data instead of iCloud
process.env.CLAUDE_DOCS_PATH = path.join(__dirname, "..", "test-data-root");
process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH = path.join(__dirname, "..", "bubble-307922-9a89c49a8a6a.json");
process.env.GOOGLE_SHARED_EMAILS = "italogmoura@gmail.com,italogmoura@mpf.mp.br,italogmourampf@gmail.com";
process.env.GDRIVE_PETICIONAMENTO_PATH = "";
process.env.PORT = "3000";
