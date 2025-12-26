# ConnectNow

Real-time chat with temporary rooms, typing indicators, and file sharing.

## Features

- 💬 **Instant Messaging** — Real-time delivery with Socket.io
- 🔄 **Typing Indicators** — See when others are typing
- 📎 **File Sharing** — Images and documents (up to 10MB)
- 👥 **User Profiles** — Avatars and online status
- 🏠 **Temporary Rooms** — Create/join with shareable codes
- 🌙 **Dark/Light Mode** — System-aware theming

## Quick Start

```bash
npm install
npm run dev
```

- **Client**: http://localhost:3000
- **Server**: http://localhost:4000

---

## Production Deployment

### Deploy Server to Render

1. Push code to GitHub
2. On [Render](https://render.com), create **New Web Service**
3. Connect your repo
4. Set **Root Directory**: `apps/server`
5. **Build Command**: `npm install && npm run build`
6. **Start Command**: `npm start`
7. Add environment variable:
   ```
   ALLOWED_ORIGINS=https://your-client-domain.vercel.app
   ```
8. Deploy

### Deploy Client to Vercel

1. On [Vercel](https://vercel.com), import project from GitHub
2. Set **Root Directory**: `apps/client`
3. Add environment variable:
   ```
   NEXT_PUBLIC_SOCKET_URL=https://your-server.onrender.com
   ```
4. Deploy

---

## Project Structure

```
apps/
├── client/     # Next.js frontend
└── server/     # Express + Socket.io backend
packages/
└── ui/         # Shared components
```

## Tech Stack

| Frontend | Backend |
|----------|---------|
| Next.js 15 | Express |
| React 19 | Socket.io |
| Tailwind CSS | Multer |
| shadcn/ui | TypeScript |

## License

MIT © BK
