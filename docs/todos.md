# Todos

- add the development history to the dashboard page as a changelog using the development-history.md

- would it be bad practice to modify the auth user table in supabase? can we even do that? i was thinking we might just add our additional fields to the auth users and just use one unified table. 

- my concern is that we pushed the 002 migration, then we modified the file, then when i went to push again it didn't appear to do anything. i think rather than modify the sql file that has already run, we need to create a new one so that supabase picks it up as something new that it needs to run. am i misunderstanding how supabase migrations work?

- create index pages for assessments, benchmarks, and feedback library. these will be placeholders for now until we get the models and relations built.

