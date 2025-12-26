# ConnectNow

Real-time chat application with instant messaging and file sharing.

🔗 **Live Demo:** [connectnow-drab.vercel.app](https://connectnow-drab.vercel.app)

## Features

- 💬 Real-time messaging with typing indicators
- 📁 File & image sharing
- � Multi-user chat rooms
- 📱 Mobile-friendly with auto-rejoin
- � Message history (persists 7 days)

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15, React 19, TypeScript |
| **Styling** | Tailwind CSS, shadcn/ui |
| **Backend** | Node.js, Express, Socket.io |
| **Database** | MongoDB Atlas |
| **File Storage** | Cloudinary |
| **Deployment** | Vercel (client), Render (server) |

## Architecture

```
┌─────────────┐     WebSocket      ┌─────────────┐
│   Client    │◄──────────────────►│   Server    │
│  (Next.js)  │                    │  (Express)  │
│   Vercel    │                    │   Render    │
└─────────────┘                    └──────┬──────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
              ┌─────▼─────┐        ┌──────▼──────┐       ┌──────▼──────┐
              │  MongoDB  │        │ Cloudinary  │       │   Socket.io │
              │   Atlas   │        │    CDN      │       │   (Rooms)   │
              └───────────┘        └─────────────┘       └─────────────┘
```

## Quick Start

```bash
# Install dependencies
npm install

# Run client (localhost:3000)
cd apps/client && npm run dev

# Run server (localhost:4000)
cd apps/server && npm run dev
```

## Environment Variables

### Server (Render)
```
MONGODB_URI=mongodb+srv://...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
ALLOWED_ORIGINS=https://your-domain.vercel.app
```

### Client (Vercel)
```
NEXT_PUBLIC_SOCKET_URL=https://your-server.onrender.com
```

## Author

**Bikund Kumar**

---

Built with ❤️ using Socket.io and Next.js
