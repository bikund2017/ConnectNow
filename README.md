# ConnectNow 💬

A real-time chat application with instant messaging, file sharing, and webcam capture.

**Live Demo:** [connectnow-drab.vercel.app](https://connectnow-drab.vercel.app)

## Features

- 🚀 Real-time messaging with Socket.IO
- 📁 File & image sharing (up to 10MB)
- 📷 Webcam capture (desktop) & camera capture (mobile)
- 🌙 Dark/Light theme toggle
- 🔄 Auto-reconnection with message sync
- 💾 Message history persistence

## Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | Next.js 15, React, TypeScript |
| **Styling** | Tailwind CSS, shadcn/ui |
| **Backend** | Node.js, Express, Socket.IO |
| **Database** | MongoDB Atlas |
| **File Storage** | Cloudinary |
| **Deployment** | Vercel (client), Render (server) |

## Project Structure

```
real-time-chat/
├── apps/
│   ├── client/          # Next.js frontend
│   └── server/          # Express + Socket.IO backend
├── packages/            # Shared packages
└── turbo.json           # Turborepo config
```

## Quick Start

```bash
# Install dependencies
npm install

# Run development servers
npm run dev
```

## Environment Variables

**Client** (`.env.local`):
```
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

**Server** (`.env`):
```
PORT=4000
MONGODB_URI=your_mongodb_connection_string
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## License

MIT
