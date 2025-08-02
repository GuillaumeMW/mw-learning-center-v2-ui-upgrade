import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create client with anon key for auth verification
    const supabaseAuth = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      console.error('Authentication failed:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user has admin role
    const { data: hasAdminRole, error: roleError } = await supabaseAdmin
      .rpc('has_role', { _user_id: user.id, _role: 'admin' })

    if (roleError || !hasAdminRole) {
      console.error('Admin role verification failed:', roleError)
      return new Response(
        JSON.stringify({ error: 'Access denied. Admin privileges required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { userIds, userId } = await req.json()

    let targetUserIds: string[]
    if (userId) {
      targetUserIds = [userId]
    } else if (userIds && Array.isArray(userIds)) {
      targetUserIds = userIds
    } else {
      // If no specific user IDs provided, fetch all users
      const { data: allProfiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('user_id')

      if (profilesError) {
        console.error('Error fetching all profiles:', profilesError)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch user profiles' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      targetUserIds = allProfiles?.map(p => p.user_id) || []
    }

    if (targetUserIds.length === 0) {
      return new Response(
        JSON.stringify({ data: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch user data from auth.users table
    const { data: authUsers, error: authError2 } = await supabaseAdmin.auth.admin.listUsers()

    if (authError2) {
      console.error('Error fetching auth users:', authError2)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user authentication data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Filter auth users by target IDs
    const filteredAuthUsers = authUsers.users.filter(user => targetUserIds.includes(user.id))

    // Fetch profile data
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .in('user_id', targetUserIds)

    if (profileError) {
      console.error('Error fetching profiles:', profileError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profiles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Combine auth and profile data
    const combinedUserData = filteredAuthUsers.map(authUser => {
      const profile = profiles?.find(p => p.user_id === authUser.id)
      return {
        id: authUser.id,
        email: authUser.email,
        created_at: authUser.created_at,
        email_confirmed_at: authUser.email_confirmed_at,
        last_sign_in_at: authUser.last_sign_in_at,
        ...profile
      }
    })

    console.log(`Successfully fetched ${combinedUserData.length} user records for admin`)

    return new Response(
      JSON.stringify({ data: combinedUserData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in fetch-user-data-for-admin function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})