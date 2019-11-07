# A Simple Booking Manager

NISHI, Takao <zophos@tsubuan.dev>

## What's this?

This program is useful for daily booking management tasks that record
names, email addresses, phone numbers, number of people, and notes.

All users can see the total number of people booked and whether they can book.

Users who make reservations can edit their own reservation information if it is
not closed.

Administrators can edit the number of reservations and set the daily status to
"Full" or "Not acceptable".

That's all ;-P

## Dependencies

 + SQLite3 >=3.6.19
 + sqlcipher (recommend)
 + Ruby >=2.1.5
   + sinatra
   + sinatra-contrib
   + sqlite3 (require built with --with-sqlcipher option for encrypted database)
   + sequel

## Run

### Initialize databae

~~~
 $ app/db/create_db.sh
~~~

or create encrypted database

~~~
 $ DB_KEY=hogehoge app/db/create_db.sh
~~~

### Execute

~~~
 $ app/main.rb
~~~

Default user name for administration page is 'admin'.
Password is automatic genarated and shown to STDERR.


For running with encrypted database, set database key to DB_KEY environment variables.

~~~
 $ DB_KEY=hogehoge app/main.rb
~~~

#### Options

##### Command-line options

See "Command Line" section on [Sinatra:README](http://sinatrarb.com/intro.html).

##### Environment variables

<dl>
<dt>MAIL_TO</dt>
<dd>Mail address for a nortification recipient. Default: nil (no mail is sent)</dd>

<dt>MAIL_FROM</dt>
<dd>Mail address for a nortification sender. Default: $USER@$HOST (and it's not good for mail address)</dd>

<dt>SMTP_HOST</dt>
<dd>SMTP hostname or IP address. Default: localhost</dd>

<dt>SMTP_PORT</dt>
<dd>SMTP port number. Default: 25</dd>

<dt>HTTP_AUTH_USER</dt>
<dd>ID for administration page authentication. Default: admin.</dd>

<dt>HTTP_AUTH_PASS</dt>
<dd>Password for administration page authentication. Default: automatic generated 32 random charactors. (shown to STDERR).</dd>

<dt>DB_KEY</dt>
<dd>Database decryption key. Default: nil</dd>

<dt>DB_LOG_FILE</dt>
<dd>Database log file name. Default: nil (log is NOT recorded). When '-' is given, DB log is written to STDERR.<br>
Note that DB_LOG_FILE consists every SQL these issued on this system.
This means that anyone who can read the log can read sensitive data, even if database was encrypted.</dd>
</dl>

### Access

http://localhost:4567/ for registrating.

http://localhost:4567/admin/ for administrating (will be required HTTP_ID/HTTP_KEY)

### Migration

If you met problems after git pull, drop all views and triggers from the DB and
recreate them.
These operations will not cause any data loss.

You can find all views and triggers definition at [app/db/tables.sql](./blob/master/app/db/tables.sql) .


## License

Copyright 2019. NISHI Takao and New Year KATTE FESTIVAL office
All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
