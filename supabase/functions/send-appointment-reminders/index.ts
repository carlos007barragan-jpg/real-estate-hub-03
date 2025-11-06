import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')!;
const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    // Get today's date at start of day
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get tomorrow at end of day
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    console.log(`Checking for appointments between ${today.toISOString()} and ${tomorrow.toISOString()}`);

    // Get all tasks (appointments) for today and tomorrow
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        due_date,
        appointment_type,
        user_id,
        lead_id,
        leads!inner(name, email, phone, assigned_to)
      `)
      .gte('due_date', today.toISOString())
      .lte('due_date', tomorrow.toISOString())
      .eq('status', 'pending');

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      throw tasksError;
    }

    console.log(`Found ${tasks?.length || 0} upcoming appointments`);

    if (!tasks || tasks.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No upcoming appointments found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get all user profiles and roles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, user_id, first_name, last_name, phone_number');

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id, role');

    if (profilesError || rolesError) {
      console.error('Error fetching profiles or roles:', profilesError || rolesError);
    }

    const userProfiles = new Map(profiles?.map(p => [p.user_id, p]) || []);
    const userRoles = new Map(roles?.map(r => [r.user_id, r.role]) || []);

    const notifications: any[] = [];
    const emailPromises: any[] = [];
    const smsPromises: any[] = [];

    for (const task of tasks) {
      const lead = task.leads as any; // Type assertion for nested join
      const appointmentDate = new Date(task.due_date);
      const formattedDate = appointmentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });

      // Create notification for assigned agent
      if (task.user_id) {
        notifications.push({
          user_id: task.user_id,
          type: 'task',
          title: `Upcoming: ${task.title}`,
          description: `${lead.name} - ${formattedDate}`,
          link: `/leads/${task.lead_id}`,
          task_id: task.id,
        });

        // Send email to agent
        const profile = userProfiles.get(task.user_id);
        if (profile) {
          const { data: authUser } = await supabase.auth.admin.getUserById(task.user_id);
          if (authUser?.user?.email) {
            emailPromises.push(
              resend.emails.send({
                from: 'CRM Reminders <onboarding@resend.dev>',
                to: [authUser.user.email],
                subject: `Reminder: ${task.title}`,
                html: `
                  <h2>Upcoming Appointment Reminder</h2>
                  <p><strong>Client:</strong> ${lead.name}</p>
                  <p><strong>Type:</strong> ${task.appointment_type || 'General'}</p>
                  <p><strong>Date & Time:</strong> ${formattedDate}</p>
                  <p><strong>Description:</strong> ${task.description || 'N/A'}</p>
                `,
              }).catch(err => console.error('Email error:', err))
            );
          }

          // Send SMS to agent
          if (profile.phone_number) {
            const smsBody = `Reminder: ${task.title} with ${lead.name} on ${formattedDate}`;
            smsPromises.push(
              fetch(
                `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  body: new URLSearchParams({
                    To: profile.phone_number,
                    From: twilioPhoneNumber,
                    Body: smsBody,
                  }),
                }
              ).catch(err => console.error('SMS error:', err))
            );
          }
        }
      }

      // Notify admins for buyer consults and showings
      if (task.appointment_type === 'buyer_consult' || task.appointment_type === 'showing') {
        const adminUsers = Array.from(userRoles.entries())
          .filter(([_, role]) => role === 'admin')
          .map(([userId]) => userId);

        for (const adminId of adminUsers) {
          notifications.push({
            user_id: adminId,
            type: 'task',
            title: `${task.appointment_type === 'buyer_consult' ? 'Buyer Consult' : 'Showing'}: ${lead.name}`,
            description: `Agent: ${lead.assigned_to || 'Unassigned'} - ${formattedDate}`,
            link: `/leads/${task.lead_id}`,
            task_id: task.id,
          });
        }
      }
    }

    // Insert all notifications
    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error('Error creating notifications:', notifError);
      } else {
        console.log(`Created ${notifications.length} notifications`);
      }
    }

    // Wait for all emails and SMS to send
    await Promise.all([...emailPromises, ...smsPromises]);

    return new Response(
      JSON.stringify({
        success: true,
        appointmentsProcessed: tasks.length,
        notificationsCreated: notifications.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in send-appointment-reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
