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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
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
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      throw new Error('Only admins can create employees');
    }

    const { email, password, full_name, role, phone, is_active, created_by } = await req.json();

    if (!email || !password || !full_name || !role) {
      throw new Error('Missing required fields: email, password, full_name, role');
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role,
      },
    });

    if (authError) throw authError;

    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: authData.user.id,
        email,
        full_name,
        role,
      }]);

    if (profileError) throw profileError;

    const { error: employeeError } = await supabase
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