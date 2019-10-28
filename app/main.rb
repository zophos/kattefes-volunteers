#!/usr/bin/ruby
# coding: cp932
#
#

#
# store DB access key and hide it from process title
#
Process.setproctitle('sinatra-app')

require 'sinatra'
require 'sinatra/cookies'
require 'sinatra/reloader'
require './backend'
require 'json'

configure do
    set :db, DB.new('sqlite://./db/main.db',ENV['DB_KEY'])
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
        username = ENV['BASIC_AUTH_USERNAME']
        password = ENV['BASIC_AUTH_PASSWORD']
        @auth.provided? &&
            @auth.basic? &&
            @auth.credentials &&
            @auth.credentials == [username, password]
    end
end

set :public_folder, File.dirname(__FILE__) + '/static'

post '/api/login' do
    params=JSON.parse(request.body.read)
    ssid=settings.db.login(params['email'],params['passwd'],request.ip)
    if(ssid)
        response.set_cookie :ssid,{:value => ssid,
                                   :max_age => "#{DB::SESSION_EXPIRE_SEC}",
                                   :path=>'/'}
        return 200
    else
        return 401
    end
end

get '/api/logout' do
    settings.db.logout(cookies[:ssid])
    if(cookies[:ssid])
        response.set_cookie :ssid,{:value=>"",
                                   :max_age=>"0",
                                   :path=>'/'}
    end

    return 200
end

post '/api/ssid' do
    params=JSON.parse(request.body.read)
    ssid=settings.db.validate_session(cookies[:ssid],params['email'])
    if(ssid)
        response.set_cookie :ssid,{:value => ssid,
                                   :max_age => "#{DB::SESSION_EXPIRE_SEC}",
                                   :path=>'/'}
        return 200
    else
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

post '/api/member' do
    params=JSON.parse(request.body.read)

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
                                   :path=>'/'}
        return 200
    else
        return 409
    end
end

get '/api/:cal_id' do
    return 400 if params['cal_id']!~/^\d{6}$/

    data=settings.db.get(params['cal_id'],cookies[:ssid])
    return 400 unless data

    if(cookies[:ssid] && settings.db.ssid2email(cookies[:ssid]))
        response.set_cookie :ssid,{:value=>cookies[:ssid],
                                   :max_age=>"#{DB::SESSION_EXPIRE_SEC}",
                                   :path=>'/'}
    end

    content_type :json
    JSON.dump(data)+"\n"
end

post '/api/:cal_id' do
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
                return 400 unless keys.include?(k)
            }
            ssid=settings.db.reg_member(params['email'],
                                        params['name'],
                                        params['phone'],
                                        params['passwd'],
                                        request.ip)
            return 409 unless ssid
        end
    end

    data=settings.db.post(ssid,
                  cal_id,
                  params['num'],
                  params['note'])
    return 400 unless data

    response.set_cookie :ssid,{:value=>ssid,
                               :max_age=>"#{DB::SESSION_EXPIRE_SEC}",
                               :path=>'/'}

    content_type :json
    JSON.dump(data)
end

delete '/api/:cal_id' do
    return 400 if params['cal_id']!~/^\d{8}$/
    return 401 unless cookie.kas_key?(:ssid)

    data=settings.db.delete(cookie[:ssid],params['cal_id'])
    return 400 unless date

    response.set_cookie :ssid,{:value=>ssid,
                               :max_age=>"#{DB::SESSION_EXPIRE_SEC}",
                               :path=>'/'}
    content_type :json
    JSON.dump(data)
end

get '/adim/:cal_id' do
    protect!
    
    
end

get '/' do
    send_file File.join(settings.public_folder, 'index.html')
end
