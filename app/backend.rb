require 'openssl'
require 'sequel'
require 'nkf'
require 'logger'

class DB
    SESSION_EXPIRE_SEC=86400*90
 
    def initialize(uri,key=nil)
        @db=Sequel.connect(uri,:timeout => 15000)
        @db.fetch("pragma key=?",key).all if key

        #
        # turn on foreign keys
        #
        @db.run("pragma foreign_keys=on;")
    end

    def test
        @db.run("select ssid from sessions limit 1")
    end

    def start_logging(logfile,progname)
        if(logfile)
            if(@db.loggers.empty?)
                @db.logger=Logger.new(logfile,'daily',progname:progname)
            else
                @db.loggers[0].progname=progname
            end
        end

        self
    end

    def stop_logging()
        @db.logger=nil
    end

    def login(email,passwd,client_ip='')
        sql=<<_EOS_
select email from members where email=? and passwd=? limit 1
_EOS_
        ret=@db.fetch(sql,email,_hash(passwd)).all
        return nil if ret.empty?
            
        self.reg_session(email,client_ip)
    end

    def logout(ssid)
        ssid=ssid.to_s
        sql=<<_EOS_
delete from sessions where ssid=?
_EOS_
        
        @db.fetch(sql,ssid).all

        true
    end
    
    def reg_member(email,name,phone,passwd,client_ip='')
        email=email.to_s
        return nil unless _validate_email(email)

        name=name.to_s.strip
        return nil if name.empty?

        phone=NKF.nkf('-w -Z',phone.to_s).gsub('-','')
        return nil unless phone=~/^\d+$/

        passwd=passwd.to_s.strip
        return nil if passwd.empty?

        ret=nil
        @db.transaction{
            sql=<<_EOS_
insert into members values (?,?,?,?)
_EOS_
            begin
                @db.fetch(sql,email,name,phone,_hash(passwd)).all
            rescue Sequel::UniqueConstraintViolation
                return nil
            end
            ret=self.login(email,passwd,client_ip)
        }
        ret
    end

    def del_member(email,passwd)
        sql=<<_EOS_
delete from members where email=? and passwd=?
_EOS_

        @db.fetch(sql,email,_hash(passwd)).all
    end

    def reg_session(email,client_ip='')
        sql=<<_EOS_
insert into sessions values (?,?,?)
_EOS_
        begin
            ssid=_hash("#{client_ip}#{Time.now.to_i}#{Random.new.bytes(8)}")
            @db.fetch(sql,ssid,email,Time.now.to_i+SESSION_EXPIRE_SEC).all
        rescue Sequel::UniqueConstraintViolation
            retry
        end

        return ssid
    end

    def validate_session(ssid,email)
        ssid=ssid.to_s
        email=email.to_s

        sql=<<_EOS_
select expire from sessions where ssid=? and email=? limit 1
_EOS_
        ret=@db.fetch(sql,ssid,email).all
        return nil if ret.empty?

        return nil if ret[0][:expire]<=Time.now.to_i
        
        ssid
    end

    def update_session(ssid)
        ssid=ssid.to_s

        sql=<<_EOS_
update sessions set expire=? where ssid=?
_EOS_
        @db.fetch(sql,Time.now.to_i+SESSION_EXPIRE_SEC,ssid).all

        sql=<<_EOS_
select ssid from sessions where ssid=? limit 1
_EOS_
        
        return ssid unless @db.fetch(sql,ssid).all.empty?
    end

    def ssid2email(ssid)
        return nil unless ssid

        sql=<<_EOS_
select email from sessions where ssid=? limit 1
_EOS_
        ret=@db.fetch(sql,ssid.to_s).all
        if(ret.empty?)
            nil
        else
            self.update_session(ssid)
            ret[0][:email]
        end
    end

    def get(month,ssid=nil)
        (y,m)=_validate_month(month)
        return nil unless y

        from=if(m==1)
                 "%04d%02d%02d"%[y-1,12,1]
             else
                 "%04d%02d%02d"%[y,m-1,1]
             end
        to=if(m==12)
                 "%04d%02d%02d"%[y+1,1,31]
           else
                 "%04d%02d%02d"%[y,m+1,31]
           end

        ret={}

        sql=<<_EOS_
select * from aggregated_schedules where (date>=? and date<=?)
_EOS_
        @db.fetch(sql,from,to){|row|
            ret[row[:date]]={
                'all'=>row[:num],
                'status'=>row[:status]}
        }

        email=self.ssid2email(ssid)
        if(email)
            sql=<<_EOS_
select date, number as num,note from schedules
where (date>=? and date<=? and email=?) order by date
_EOS_
            @db.fetch(sql,from,to,email){|row|
                begin
                    ret[row[:date]]['you']=row[:num]
                    ret[row[:date]]['note']=row[:note] if row[:note]
                rescue NoMethodError
                end
            }
        end

        ret
    end

    def post(ssid,date,num,note=nil,ssid_as_email=false,&on_succeed)
        email=ssid_as_email ? ssid : self.ssid2email(ssid)
        return nil unless email
        
        (y,m,d)=_validate_date(date)
        return nil unless y

        num=NKF.nkf('-w -Z4',num.to_s).to_i
        num=num.to_i
        return self.delete(email,date,true,&on_succeed) if num<=0

        sql=<<_EOS_
insert or replace into schedules values (?,?,?,?,?)
_EOS_
        row=nil
        begin
            row=@db.fetch(sql,date,email,num,note,Time.now.localtime.to_s).all
        rescue Sequel::DatabaseError
        end
        
        yield(date,email,num,note) if(row && on_succeed)

        _get_adate(date,email)
    end

    def delete(ssid,date,ssid_as_email=false,&on_succeed)
        email=ssid_as_email ? ssid : self.ssid2email(ssid)
        return nil unless email

        (y,m,d)=_validate_date(date)
        return nil unless y

        row=nil
        begin
            @db.run('begin')
            sql=<<_EOS_
select date,email,number as num,note from schedules where (date=? and email=?)
_EOS_
            row=@db.fetch(sql,date,email).all[0]
            if(row)
                sql=<<_EOS_
delete from schedules where (date=? and email=?)
_EOS_
                @db.fetch(sql,date,email).all
                @db.run('commit')
            end
        rescue Sequel::DatabaseError
            row=nil
            @db.run('rollback')
        end

        yield(date,email,row[:num],row[:note]) if(row && on_succeed)

        _get_adate(date,email)
    end

    def combined_list(date)
        (y,m,d)=_validate_date(date)
        return nil unless y

        ret=nil
        sql=<<_EOS_
select * from combined_schedules where date=?
_EOS_
        @db.fetch(sql,date){|row|
            ret||={
                'status'=>row[:status],
                'num'=>0,
                'members'=>[]
            }
            if(row[:num].to_i>0)
                  ret['num']+=row[:num].to_i
                  ret['members'].push(
                      {'email'=>row[:email],
                       'name'=>row[:name],
                       'num'=>row[:num],
                       'phone'=>row[:phone],
                       'note'=>row[:note]})
            end
        }

        return ret||{}
    end

    def admin_update(date,status,num,&on_succeed)
        (y,m,d)=_validate_date(date)
        return nil unless y

        sql=<<_EOS_
select status_code from date_status_codes where description=? limit 1
_EOS_

        status_code=@db.fetch(sql,status).all
        if(status_code.empty?)
            status_code=0
        else
            status_code=status_code[0][:status_code]
        end

        rows=[]
        @db.run('begin')
        @db.fetch("update date_statuses set status_code=0 where date=?",
                  date).all
        num.each{|email,n|
            sql=<<_EOS_
select date,email,number as num,note from schedules where (date=? and email=?)
_EOS_
            row=@db.fetch(sql,date,email).all[0].dup
            row[:old_num]=row[:num]
            row[:new_num]=n
            rows.push(row)

            if(n>0)
                sql=<<_EOS_
update schedules set number=? where date=? and email=?
_EOS_
                @db.fetch(sql,n,date,email).all
            else
                @db.fetch("delete from schedules where (date=? and email=?)",
                          date,email).all
            end
        }

        @db.fetch("insert or replace into date_statuses values(?,?)",
                  date,status_code).all
        @db.run('commit')

        yield(rows) if((!rows.empty?) && on_succeed)

        _get_adate(date)
    end

    def admin_csv
        ret=''
        prev_date=nil
        @db.fetch('select * from combined_schedules'){|row|
            ret+="\r\n" if(prev_date && row[:date]!=prev_date)
            prev_date=row[:date]

            (y,m,d)=_validate_date(row[:date],true)
            date='"%04d%02d%02d"'%[y,m,d]

            buf=[date,
                 "\"#{row[:name]}\"",
                 "\"#{row[:email]}\"",
                 "\"#{row[:phone]}\"",
                 row[:num],
                 "\"#{row[:note]}\""]
            
            ret+=buf.join(", ")+"\r\n"
        }

        ret
    end

    def email2memberinfo(email)
        sql=<<_EOS_
select email,name,phone from members where email=? limit 1
_EOS_
        @db.fetch(sql,email).all[0]
    end


    private
    def _hash(str)
        OpenSSL::Digest::SHA256.hexdigest(str)
    end

    def _validate_month(month)
        month=month.to_i
        m=month%100
        y=month/100

        begin
            Time.new(y,m,1)
        rescue ArgumentError
            return nil
        end

        [y,m]
    end

    def _validate_date(date,parse_only=nil)
        date=date.to_i
        d=date%100
        m=(date/100)%100
        y=date%10000

        if(!parse_only)
            begin
                Time.new(y,m,d)
            rescue ArgumentError
                return nil
            end
        end

        return [y,m,d]
    end

    def _validate_email(email)
        email=~/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
    end

    def _get_adate(date,email=nil)
        ret={'status'=>'open'}

        sql=<<_EOS_
select * from aggregated_schedules where date=?
_EOS_
        @db.fetch(sql,date){|row|
            ret[row[:date]]={'all'=>row[:num],
                             'status'=>row[:status]}
        }
        
        if(email)
            sql=<<_EOS_
select date, number as num,note from schedules
where (date=? and email=?) order by date
_EOS_
            @db.fetch(sql,date,email){|row|
                ret[row[:date]]['you']=row[:num]
                ret[row[:date]]['note']=row[:note]
            }
        end

        return ret
    end
end
