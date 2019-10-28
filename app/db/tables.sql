create table sessions (
    ssid text primary key,
    email text not null,
    expire integer not null
);
create trigger sessions_ins_cleanup_trigger insert on sessions
begin
    delete from sessions where expire<=strftime('%s','now');
end;
create trigger sessions_upd_cleanup_trigger update on sessions
begin
    delete from sessions where expire<=strftime('%s','now');
end;
	
create table members (
    email text primary key,
    name text not null,
    phone text not null,
    passwd text not null
);
create index members_email_passwd_index on members(email,passwd);
create trigger members_del_cleanup_trugger delete on members
begin
    delete from sessions where email=old.email;
    delete from schedules where email=old.email;
end;

create table schedules (
    date integer not null check (date>20100000 and date<21000000),
    email text not null,
    number integer check (number>0),
    note text,
    lastupdate text not null,
    primary key(date,email)
);
create index schedules_date_index on schedules(date);
create index schedules_email_index on schedules(email);

create table fixed_schedules (
    date integer primary key check (date>20100000 and date<21000000),
    fixed boolean default false
);

insert into schedules values (20191010,'zophos@Dadd9.com',1,null);
insert into schedules values (20191010,'test@hoge.jp',9,null);
insert into schedules values (20191001,'test@hoge.jp',6,null);
