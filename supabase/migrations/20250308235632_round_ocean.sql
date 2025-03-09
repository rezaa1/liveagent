/*
  # Add LiveKit Token Generation Function

  1. New Functions
    - `generate_livekit_token(room_name text, participant_name text)`
      - Generates a LiveKit token for a participant to join a room
      - Returns: JSON containing the token

  2. Security
    - Function is accessible to authenticated and anonymous users
    - Uses environment variables for LiveKit API key and secret
*/

create or replace function generate_livekit_token(
  room_name text,
  participant_name text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  api_key text;
  api_secret text;
  token_url text;
  response json;
begin
  -- Get LiveKit configuration from environment variables
  api_key := current_setting('app.settings.livekit_api_key', true);
  api_secret := current_setting('app.settings.livekit_api_secret', true);
  token_url := current_setting('app.settings.livekit_url', true);

  if api_key is null or api_secret is null or token_url is null then
    raise exception 'LiveKit configuration is not set';
  end if;

  -- Make HTTP request to Edge Function for token generation
  select
    content::json into response
  from
    http((
      'POST',
      token_url || '/functions/v1/livekit-token',
      ARRAY[
        ('Content-Type', 'application/json'),
        ('Authorization', 'Bearer ' || auth.jwt())
      ],
      jsonb_build_object(
        'room', room_name,
        'participant', participant_name
      )::text,
      10
    ));

  return response;
exception
  when others then
    raise exception 'Failed to generate token: %', SQLERRM;
end;
$$;