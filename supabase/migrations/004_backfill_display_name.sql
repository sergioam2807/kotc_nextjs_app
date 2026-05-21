update profiles p
set display_name = u.raw_user_meta_data->>'full_name'
from auth.users u
where p.id = u.id
  and p.display_name is null
  and u.raw_user_meta_data->>'full_name' is not null;
