# Contest Hub - React + Netlify + Supabase

A modern serverless contest management platform built with React, Netlify Functions, and Supabase.

## Features

- 🎨 **Modern React Frontend** - Built with TypeScript and React Router
- 🔐 **Supabase Authentication** - Secure user authentication with email/password
- 👥 **Admin Dashboard** - Manage contests and users with role-based access
- 📦 **File Uploads** - Submit entries with Supabase Storage
- 🗳️ **Voting System** - Rate-limited voting (24-hour window per submission)
- 🏆 **Winners Management** - Admin can assign 1st, 2nd, and 3rd place
- ⚖️ **Jury Mode** - Optional admin scoring system (1-10 scale)
- 🚀 **Serverless Architecture** - Netlify Functions for API endpoints

## Tech Stack

- **Frontend**: React 18, TypeScript, React Router
- **Backend**: Netlify Functions (TypeScript)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth
- **Deployment**: Netlify

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase account
- A Netlify account

### Setup

1. **Clone the repository**

```bash
cd contest-hub
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up Supabase**

   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Run the SQL schema from `supabase/schema.sql` in the Supabase SQL Editor
   - Create a storage bucket called "submissions" in Supabase Storage
   - Get your project URL and keys from Project Settings → API

4. **Configure environment variables**

Create a `.env` file in the root directory:

```env
REACT_APP_SUPABASE_URL=your-project-url.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key

# For Netlify Functions (add these in Netlify dashboard)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

5. **Run locally**

```bash
npm run dev
```

This will start:
- React dev server on http://localhost:3000
- Netlify Functions on http://localhost:9999

### Deployment

1. **Connect to Netlify**

```bash
npm install -g netlify-cli
netlify login
netlify init
```

2. **Configure environment variables in Netlify**

Go to Site settings → Environment variables and add:
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

3. **Deploy**

```bash
npm run deploy
```

Or connect your GitHub repo to Netlify for automatic deployments.

### Create First Admin User

After deploying, you'll need to create your first admin user:

1. Sign up through the app
2. Go to Supabase Dashboard → Table Editor → profiles
3. Find your user and set `is_admin` to `true`
4. Refresh the app - you now have admin access!

## Project Structure

```
contest-hub/
├── netlify/
│   └── functions/          # Netlify serverless functions
│       ├── contests.ts     # List/create contests
│       ├── contest-detail.ts  # Get/update contest
│       ├── submit.ts       # Submit entries
│       ├── vote.ts         # Vote for submissions
│       ├── admin-score.ts  # Admin scoring
│       └── set-winner.ts   # Set winners
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   └── Header.tsx      # Navigation header
│   ├── lib/
│   │   ├── supabase.ts     # Supabase client & types
│   │   └── AuthContext.tsx # Authentication context
│   ├── pages/
│   │   ├── HomePage.tsx    # Contest listing
│   │   ├── ContestPage.tsx # Contest details & submissions
│   │   ├── LoginPage.tsx   # Login/signup
│   │   └── AdminDashboard.tsx  # Admin panel
│   ├── App.tsx
│   ├── App.css
│   └── index.tsx
├── supabase/
│   └── schema.sql          # Database schema
├── netlify.toml            # Netlify configuration
├── package.json
└── tsconfig.json
```

## API Endpoints

All endpoints are available at `/api/*`:

- `GET /api/contests` - List all contests
- `POST /api/contests` - Create contest (admin only)
- `GET /api/contests/:id` - Get contest with submissions
- `PUT /api/contests/:id` - Update contest (admin only)
- `POST /api/contests/:id/submit` - Submit entry
- `POST /api/vote` - Vote for submission
- `POST /api/admin-score` - Score submission (admin only)
- `POST /api/set-winner` - Set winner (admin only)

## Features Overview

### User Features
- Browse contests (active, upcoming, completed)
- View contest details and submissions
- Submit entries (ZIP files)
- Vote for submissions (rate-limited)
- Download submissions

### Admin Features
- Create and edit contests
- Set contest status (upcoming/active/completed)
- Enable/disable jury mode
- Score submissions (1-10 scale)
- Assign winners (1st, 2nd, 3rd place)
- Manage user roles (make/remove admins)

## Database Schema

The app uses these main tables:

- **profiles** - User profiles (extends Supabase auth.users)
- **contests** - Contest information
- **submissions** - Submitted entries
- **votes** - Vote tracking (prevent duplicates)

See [supabase/schema.sql](supabase/schema.sql) for the complete schema.

## Security

- Row Level Security (RLS) enabled on all tables
- Authentication required for admin operations
- Service role key used only in Netlify Functions
- File upload validation (ZIP only)
- Vote rate limiting (24-hour window)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
