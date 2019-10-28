require 'openssl'
require 'sequel'
require 'nkf'
class DB
    SESSION_EXPIRE_SEC=86400*90
 
    def initialize(uri,key=nil)
        @db=Sequel.connect(uri,:timeout => 15000)
        @db.fetch("pragma key=?",key).all if key

        #
        # connection test
        #
        @db.run("select ssid from sessions limit 1")
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

        phone=NKF.nkf('-w -Z4',phone.to_s).gsub('-','')
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

        sql=<<_EOS_
select date,sum(number) as num from schedules
where (date>=? and date<=?) group by date order by date
_EOS_
        ret={}
        @db.fetch(sql,from,to){|row|
            ret[row[:date]]={'all'=>row[:num]}
        }

        sql=<<_EOS_
select date from fixed_schedules
where (date>=? and date<=? and fixed=1) order by date
_EOS_
        @db.fetch(sql,from,to){|row|
            begin
                ret[row[:date]]['fixed']=true
            rescue NoMethodError
            end
        }

        email=self.ssid2email(ssid)
        if(email)
            sql=<<_EOS_
select date, number as num from schedules
where (date>=? and date<=? and email=?) order by date
_EOS_
            @db.fetch(sql,from,to,email){|row|
                ret[row[:date]]['you']=row[:num]
            }
        end

        ret
    end

    def post(ssid,date,num,note=nil,ssid_as_email=false)
        email=ssid_as_email ? ssid : self.ssid2email(ssid)
        return nil unless email
        
        (y,m,d)=_validate_date(date)
        return nil unless y

        num=num.to_i
        return self.delete(email,date,true) if num<=0

        sql=<<_EOS_
insert or replace into schedules values (?,?,?,?,?)
_EOS_
        @db.fetch(sql,date,email,num,note,Time.now.localtime.to_s).all

        self.get(y*100+m,email)
    end

    def delete(ssid,date,ssid_as_email=false)
        email=ssid_as_email ? ssid : self.ssid2email(ssid)
        return nil unless email

        (y,m,d)=_validate_date(date)
        return nil unless y

        sql=<<_EOS_
delete from schedules where (date=? and email=?)
_EOS_
        @db.fetch(sql,date,email).all

        self.get(y*100+m,email)
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

    def _validate_date(date)
        date=date.to_i
        d=date%100
        m=(date/100)%100
        y=date%10000

        begin
            Time.new(y,m,d)
        rescue ArgumentError
            return nil
        end

        return [y,m,d]
    end

    def _validate_email(email)
        email=~/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
    end
end
