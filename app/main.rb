#!/usr/bin/ruby
#
#

#
# hide passwords from process title
#
Process.setproctitle('sinatra-app')

require 'sinatra'
require 'sinatra/cookies'
#require 'sinatra/reloader'
require 'json'
require './backend'

configure do
    set :db, DB.new('sqlite://'+File.dirname(__FILE__)+'/db/main.db',
                    ENV['DB_KEY'])
    set :public_folder, File.dirname(__FILE__) + '/static'
    set :mount_point,''
    set :is_secure,true
end

helpers do
    def protect!
        unless authorized?
            response['WWW-Authenticate'] = %(Basic realm="Restricted Area")
            throw(:halt, [401, "Not authorized\n"])
        end
    end

    def authorized?
        @auth ||=  Rack::Auth::Basic::Request.new(request.env)
        username = ENV['HTTP_ID']
        password = ENV['HTTP_KEY']
        @auth.provided? &&
            @auth.basic? &&
            @auth.credentials &&
            @auth.credentials == [username, password]
    end
end


post "#{settings.mount_point}/api/login" do
    params=JSON.parse(request.body.read)
    ssid=settings.db.login(params['email'],params['passwd'],request.ip)
    if(ssid)
        response.set_cookie :ssid,{:value=>ssid,
                                   :max_age=>"#{DB::SESSION_EXPIRE_SEC}",
                                   :path=>"#{settings.mount_point}/",
                                   :secure=>settings.is_secure}
        return 200
    else
        sleep(3)
        return 401
    end
end

get "#{settings.mount_point}/api/logout" do
    settings.db.logout(cookies[:ssid])
    if(cookies[:ssid])
        response.set_cookie :ssid,{:value=>"",
                                   :max_age=>"0",
                                   :path=>"#{settings.mount_point}/",
                                   :secure=>settings.is_secure}
    end

    return 200
end

post "#{settings.mount_point}/api/ssid" do
    params=JSON.parse(request.body.read)
    ssid=settings.db.validate_session(cookies[:ssid],params['email'])
    if(ssid)
        response.set_cookie :ssid,{:value=>ssid,
                                   :max_age=>"#{DB::SESSION_EXPIRE_SEC}",
                                   :path=>"#{settings.mount_point}/",
                                   :secure=>settings.is_secure}
        return 200
    else
        sleep(3)
        return 401
    end

end

=begin
get '/api/reset' do
    if(params['confirm'])

    else

    end
end
=end

post "#{settings.mount_point}/api/member" do
    params=JSON.parse(request.body.read)

    keys=params.keys
    ['email','name','phone','passwd'].each{|k|
            return 400 unless keys.include?(k)
    }

    ssid=settings.db.reg_member(params['email'],
                                params['name'],
                                params['phone'],
                                params['passwd'],
                                request.ip)
    if(ssid)
        response.set_cookie :ssid,{:value => ssid,
                                   :max_age => "#{DB::SESSION_EXPIRE_SEC}",
                                   :path=>"#{settings.mount_point}/",
                                   :secure=>settings.is_secure}
        return 200
    else
        sleep(3)
        return 409
    end
end

get "#{settings.mount_point}/api/:cal_id" do
    return 400 if params['cal_id']!~/^\d{6}$/

    data=settings.db.get(params['cal_id'],cookies[:ssid])
    return 400 unless data

    if(cookies[:ssid] && settings.db.ssid2email(cookies[:ssid]))
        response.set_cookie :ssid,{:value=>cookies[:ssid],
                                   :max_age=>"#{DB::SESSION_EXPIRE_SEC}",
                                   :path=>"#{settings.mount_point}/",
                                   :secure=>settings.is_secure}
    end

    content_type :json
    JSON.dump(data)+"\n"
end

post "#{settings.mount_point}/api/:cal_id" do
    cal_id=params['cal_id']
    return 400 unless cal_id=~/^\d{8}$/

    params=JSON.parse(request.body.read)

    keys=params.keys
    return 400 unless keys.include?('num')

    ssid=cookies[:ssid]
    unless(ssid)
        ['email','passwd'].each{|k|
            return 401 unless keys.include?(k)
        }
        ssid=settings.db.login(params['email'],
                               params['passwd'],
                               request.ip)
        
        unless(ssid)
            ['name','phone'].each{|k|
                unless keys.include?(k)
                    sleep(3)
                    return 401
                end
            }
            ssid=settings.db.reg_member(params['email'],
                                        params['name'],
                                        params['phone'],
                                        params['passwd'],
                                        request.ip)
            unless ssid
                sleep(3)
                return 409 
            end
        end
    end

    data=settings.db.post(ssid,
                  cal_id,
                  params['num'],
                  params['note'])
    return 400 unless data

    response.set_cookie :ssid,{:value=>ssid,
                               :max_age=>"#{DB::SESSION_EXPIRE_SEC}",
                               :path=>"#{settings.mount_point}/",
                               :secure=>settings.is_secure}

    content_type :json
    JSON.dump(data)
end

delete "#{settings.mount_point}api/:cal_id" do
    return 400 if params['cal_id']!~/^\d{8}$/
    return 401 unless cookie.kas_key?(:ssid)

    data=settings.db.delete(cookie[:ssid],params['cal_id'])
    unless data
        sleep(3)
        return 400
    end

    response.set_cookie :ssid,{:value=>ssid,
                               :max_age=>"#{DB::SESSION_EXPIRE_SEC}",
                               :path=>"#{settings.mount_point}/",
                               :secure=>settings.is_secure}
    content_type :json
    JSON.dump(data)
end

get "#{settings.mount_point}/admin/csv" do
    protect!
    
    data=settings.db.admin_csv
    return 400 unless data

    content_type 'text/csv'
    attachment "kattefes-volunteers-#{Time.now.strftime('%Y%m%d_%H%M%S')}.csv"

    if(request.user_agent=~/Mac OS X/)
        NKF.nkf('-W -s -Z',data)
    else
        data
    end
end


get "#{settings.mount_point}/admin/list/:cal_id" do
    protect!
    
    return 400 if params['cal_id']!~/^\d{8}$/
    data=settings.db.combined_list(params['cal_id'])

    content_type :json
    JSON.dump(data)
end

post "#{settings.mount_point}/admin/list/:cal_id" do
    protect!
    
    return 400 if params['cal_id']!~/^\d{8}$/
    date=params['cal_id']
    params=JSON.parse(request.body.read)

    data=settings.db.admin_update(date,
                                  params['status'],
                                  params['num'])

    return 400 unless data


    content_type :json
    JSON.dump(data)
end

get "#{settings.mount_point}/admin/" do
    protect!
    
    send_file File.join(settings.public_folder, 
                        'admin',
                        'index.html')
end

get "#{settings.mount_point}/" do
    send_file File.join(settings.public_folder, 'index.html')
end


not_found do
    content_type :txt
    'Not found.'
end
