import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: userRole, error: roleError } = await supabaseAdmin.rpc('get_user_role', { user_id: user.id });

    if (roleError) {
      console.error('Role lookup error:', roleError);
      throw new Error(`Failed to check user role: ${roleError.message}`);
    }

    if (!userRole) {
      throw new Error('Profile not found for user');
    }

    if (userRole !== 'admin') {
      throw new Error(`Only admins can create employees. Your role: ${userRole}`);
    }

    const { email, password, full_name, role, phone, is_active, created_by } = await req.json();

    if (!email || !password || !full_name || !role) {
      throw new Error('Missing required fields: email, password, full_name, role');
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
      },
    });

    if (authError) throw authError;

    const { error: profileError2 } = await supabaseAdmin
      .from('profiles')
      .insert([{
        id: authData.user.id,
        email,
        full_name,
        role,
      }]);

    if (profileError2) throw profileError2;

    const { error: employeeError } = await supabaseAdmin
      .from('employees')
      .insert([{
        id: authData.user.id,
        email,
        full_name,
        role,
        phone: phone || null,
        is_active: is_active !== undefined ? is_active : true,
        created_by,
      }]);

    if (employeeError) throw employeeError;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Employee created successfully',
        employee_id: authData.user.id,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});