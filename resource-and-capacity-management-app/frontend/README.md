Frontend Setup (Next.js + Axios)
📁 Navigate into the frontend folder
cd frontend



📦 Install frontend dependencies
These are required for your Next.js App Router project:
npm install next react react-dom axios


If you are using TailwindCSS (your project does), install:
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p


This generates:
- tailwind.config.js
- postcss.config.js
And enables Tailwind inside globals.css.

🔐 Frontend .env.local File
Create a .env.local file inside /frontend:
NEXT_PUBLIC_API_URL=http://localhost:3001/api


🚀 Start the Frontend
Run the development server:
npm run dev


Frontend runs at:
http://localhost:3000

make sure to have a gitignore file in here