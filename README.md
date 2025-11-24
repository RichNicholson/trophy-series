# Trophy Series - Running Club Race Management

A beautiful, modern web application for managing running club race series, tracking results, and championship standings.

## Features

- 🏃 **Runner Management**: Add and manage club members with gender tracking
- 🏁 **Race Management**: Create races with dates and distances  
- 📊 **Results Tracking**: Enter finish times with automatic position and points calculation
- 🏆 **Championship Standings**: Real-time point accumulation across all races
- 👥 **Gender Separation**: Separate standings and scoring for men and women
- 🔒 **Admin Access**: Password-protected admin dashboard
- 🎨 **Modern UI**: Glassmorphism design with dark mode

## Tech Stack

- **Frontend**: Vite + React + TypeScript
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel (free tier)
- **Styling**: Custom CSS with glassmorphism effects

## Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click "New Project"
3. Fill in project details and create the project
4. Wait for the project to be provisioned (~2 minutes)

### 2. Set Up Database

1. In your Supabase project dashboard, go to the SQL Editor
2. Open the file `database/001_initial_schema.sql` from this project
3. Copy all the SQL and paste it into the SQL Editor
4. Click "Run" to execute the migration
5. Verify the tables were created by going to "Table Editor"

You should see three tables: `runners`, `races`, and `results`.

### 3. Get Supabase Credentials

1. In Supabase, go to Project Settings → API
2. Copy the "Project URL" and "anon / public" key
3. Keep these handy for the next step

### 4. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and fill in your values:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_ADMIN_PASSWORD=your_chosen_password
   ```

### 5. Install Dependencies

```bash
npm install
```

### 6. Run Locally

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Deployment to Vercel

### 1. Push to GitHub

1. Create a new GitHub repository
2. Initialize git and push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin your_github_repo_url
   git push -u origin main
   ```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:
   - Framework Preset: **Vite**
   - Root Directory: `./` (or leave default)
   - Build Command: `npm run build` (default)
   - Output Directory: `dist` (default)
   
5. Add Environment Variables:
   - Click "Environment Variables"
   - Add each variable from your `.env` file:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `VITE_ADMIN_PASSWORD`

6. Click "Deploy"

Your app will be live at `https://your-project.vercel.app` in ~2 minutes!

## Usage

### Admin Access

1. Click "Admin Login" in the top right
2. Enter the password you set in `VITE_ADMIN_PASSWORD`
3. You'll be redirected to the Admin Dashboard

### Managing Runners

1. In Admin Dashboard, go to "Manage Runners"
2. Enter runner name and select gender
3. Click "Add Runner"
4. Edit or delete using the action buttons

### Managing Races

1. In Admin Dashboard, go to "Manage Races"
2. Enter race name, date (use date picker), and distance
3. Click "Add Race"

### Adding Results

1. In Admin Dashboard, go to "Manage Results"
2. Select a race from the dropdown
3. Select a runner and enter their finish time
4. Format: `HH:MM:SS` (e.g., `1:23:45`) or `MM:SS` (e.g., `23:45`)  
5. Click "Add Result"

**Automatic Calculations:**
- Positions are calculated by gender automatically
- Points: 25 for 1st, 24 for 2nd, down to 0
- Ties: Runners with same time get same points, next runner skips positions

### Viewing Results

Public users can:
- View race results by clicking "Race Results"
- See championship standings at "Championship"
- All views separate men and women automatically

## Scoring System

- **Points**: 25, 24, 23, 22... down to 1, 0  
- **Ties**: If two runners tie for 1st (25 pts each), the next runner gets 3rd place (23 pts)
- **Gender Separate**: Men and women compete for separate championships
- **Accumulation**: Total points across all races determine championship winners

## Database Schema

### `runners`
- `id` (UUID)
- `name` (Text)
- `gender` ('M' or 'F')
- `created_at` (Timestamp)

### `races`
- `id` (UUID)
- `name` (Text)
- `race_date` (Date)
- `distance` (Text)
- `created_at` (Timestamp)

### `results`
- `id` (UUID)
- `race_id` (UUID, foreign key)
- `runner_id` (UUID, foreign key)
- `finish_time` (Interval)
- `position` (Integer, auto-calculated)
- `points` (Integer, auto-calculated)
- `created_at` (Timestamp)

## Troubleshooting

**Issue**: Results not updating after adding  
**Solution**: Make sure the database trigger is properly installed. Re-run the SQL migration.

**Issue**: Can't log in  
**Solution**: Check that `VITE_ADMIN_PASSWORD` is set in your environment variables on Vercel.

**Issue**: Database connection error  
**Solution**: Verify your Supabase URL and anon key are correct in environment variables.

## Future Enhancements

- Multiple seasons/years support
- Email notifications for new results
- CSV export for results
 - Runner profile pages with statistics
- Race photos and descriptions
- Mobile app version

## License

MIT License - feel free to use for your running club!

---

Built with ❤️ for running clubs everywhere 🏃‍♂️🏃‍♀️
