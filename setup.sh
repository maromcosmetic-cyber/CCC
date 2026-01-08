#!/bin/bash

echo "🚀 CCC Setup Script"
echo "==================="
echo ""

# Check Docker
if ! docker ps > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    echo "   Please start Docker Desktop and run this script again."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check if Supabase is already running
if npx supabase status > /dev/null 2>&1; then
    echo "✅ Supabase is already running"
    SUPABASE_RUNNING=true
else
    echo "📦 Starting Supabase..."
    npx supabase start
    SUPABASE_RUNNING=$?
fi

if [ $SUPABASE_RUNNING -eq 0 ]; then
    echo ""
    echo "📝 Getting Supabase credentials..."
    
    # Extract credentials from supabase status
    ANON_KEY=$(npx supabase status 2>/dev/null | grep "anon key" | awk '{print $3}' | tr -d '"')
    SERVICE_KEY=$(npx supabase status 2>/dev/null | grep "service_role key" | awk '{print $3}' | tr -d '"')
    API_URL=$(npx supabase status 2>/dev/null | grep "API URL" | awk '{print $3}')
    
    if [ -n "$ANON_KEY" ] && [ -n "$SERVICE_KEY" ]; then
        echo "✅ Found credentials"
        echo ""
        echo "Updating .env.local..."
        
        # Update .env.local with real values
        sed -i.bak "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=$API_URL|" .env.local
        sed -i.bak "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY|" .env.local
        sed -i.bak "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY|" .env.local
        sed -i.bak "s|SUPABASE_URL=.*|SUPABASE_URL=$API_URL|" .env.local
        sed -i.bak "s|SUPABASE_ANON_KEY=.*|SUPABASE_ANON_KEY=$ANON_KEY|" .env.local
        
        echo "✅ .env.local updated with Supabase credentials"
    fi
    
    echo ""
    echo "🗄️  Running database migrations..."
    npx supabase migration up
    
    echo ""
    echo "🌱 Seeding database..."
    npx supabase db seed
    
    echo ""
    echo "✅ Setup complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Run: npm run dev"
    echo "  2. Open: http://localhost:3000"
    echo ""
else
    echo "❌ Failed to start Supabase"
    exit 1
fi


