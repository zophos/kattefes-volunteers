pragma encoding="utf-8";
pragma foreign_keys=true;

create table members (
    email text primary key,
    name text not null,
    phone text not null,
    passwd text not null
);
create index members_email_passwd_index on members(email,passwd);

create table sessions (
    ssid text primary key,
    email text not null,
    expire integer not null,
    foreign key(email) references members(email)
     on update cascade on delete cascade
);

create table schedules (
    date integer not null check (date>20100000 and date<21000000),
    email text not null,
    number integer check (number>0),
    note text,
    lastupdate text not null,
    primary key(date,email),
    foreign key(email) references members(email)
     on update cascade on delete cascade
);
create index schedules_date_index on schedules(date);
create index schedules_email_index on schedules(email);

create table date_status_codes (
    status_code integer primary key,
    description text
);
create index date_status_codes_description_index
 on date_status_codes(description);

insert into date_status_codes values (0,'open');
insert into date_status_codes values (1,'closed');
insert into date_status_codes values (2,'canceled');

create table date_statuses (
    date integer primary key check (date>20100000 and date<21000000),
    status_code integer default 0,
    foreign key(status_code) references date_status_codes(status_code)
);

------------------------------------------------------------------------
--
-- Views
--
create view aggregated_schedules as
 select date_statuses.date as date,
  ifnull(sum(number),0) as num,
  description as status from date_statuses
 left outer join schedules on date_statuses.date=schedules.date
 left outer join date_status_codes
  on date_statuses.status_code=date_status_codes.status_code
 group by date_statuses.date order by date;

create view schedules_with_memberinfo as
  select schedules.date as date, schedules.email as email,
   name, number as num, phone, note from schedules
  left outer join members on schedules.email=members.email
  order by date;

create view combined_schedules as
 select aggregated_schedules.date as date, email, name,
  schedules_with_memberinfo.num as num, phone, note, status
  from aggregated_schedules
 left outer join schedules_with_memberinfo
  on aggregated_schedules.date=schedules_with_memberinfo.date
 order by date;

------------------------------------------------------------------------
--
-- Triggers
--

--
-- for sessions
--

-- auto cleanup
create trigger sessions_ins_after insert on sessions
begin
    delete from sessions where expire<=strftime('%s','now');
end;
create trigger sessions_upd_after update on sessions
begin
    delete from sessions where expire<=strftime('%s','now');
end;

--
-- for schedules
--

-- auto insert date_statuses entry
create trigger schedules_ins_after insert on schedules
begin
    insert into date_statuses(date) select new.date
    where not exists (select 1 from date_statuses where date=new.date);
end;

-- reject closed schedule operation
create trigger schedules_ins_before before insert on schedules
begin
    select case status_code
      when 0 then 0
      else raise (fail,'Already closed.')
    end from date_statuses where date=new.date;
end;
create trigger schedules_update_before before update on schedules
begin
    select case status_code
      when 0 then 0
      else raise (fail,'Already closed.')
    end from date_statuses where date=old.date;
end;
create trigger schedules_delete_before before delete on schedules
begin
    select case status_code
      when 0 then 0
      else raise (fail,'Already closed.')
    end from date_statuses where date=old.date;
end;
