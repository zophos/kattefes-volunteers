//
// view_member.js
//
//
// Time-stamp: <2019-12-21 16:04:32 zophos>
//

View.prototype._setup=function()
{
    this.calendar.on_cell_click=function(event,cell){
	var c_list=cell.classList;
	if(c_list.contains('oom') ||
	   c_list.contains('closed') ||
	   c_list.contains('canceled'))
	    return;

	var date=cell.id.replace(`${this.id_prefix}-d`,'');
	var view=document.view;
	var number=1;
	if(view.loggedin){
	    var you=cell.dataset.you;
	    if(you)
		number=parseInt(you,10);
	    view.draw_submit_dialog(date,number,you,cell.dataset.note);
	}
	else
	    view.draw_submit_with_login_dialog(
		date,
		localStorage.getItem('email')||'');
    }

    this.calendar.on_draw=function(year,month){
	if(document.view && document.view._reload_timer){
	    clearTimeout(document.view._reload_timer);
	    document.view._reload_timer=null;
	}

	if((year==null)||isNaN(year))
	    year=this.today.getFullYear();
	if((month==null)||isNaN(month))
	    month=this.today.getMonth();

	var y=year;
	var m=('0'+(month+1)).slice(-2);

	var cal_id=`${y}${m}`
	fetch(`./api/${cal_id}`,
	      {credentials:'same-origin'}).then((response)=>{
	      if(response.ok)
		  return response.json();
	      else
		  return {};
	      }).then((json)=>{
		  Object.keys(json).forEach((k)=>{
		      this.set_cell_content(k,json[k]);
		  },this);
	      });

	if(typeof(this.on_cell_click)=="function"){
	    Object.keys(this.cells).forEach((c_id)=>{
		var el=this.cells[c_id];
		var c_list=el.classList;
		if(c_list.contains('oom') ||
		   c_list.contains('closed') ||
		   c_list.contains('canceled'))
		    return;

		el.addEventListener('click',
				    (event)=>{
					this.on_cell_click.call(this,event,el);
				    });
	    },this)
	}

	if(document.view){
	    document.view._reload_timer=
	    setTimeout(document.view.calendar.draw.bind(
		document.view.calendar,
		document.view.calendar.currentYear,
		document.view.calendar.currentMonth),
		       document.view._RELOAD_DURATION);
	}

	if(window.location.search ||
	   year!=this.today.getFullYear() ||
	   month!=this.today.getMonth()){
	    var q=`?${y}${m}`;
	    history.replaceState(null,null,q);
	}
    }

    var el=document.getElementById('do-login');
    el.addEventListener('click',
			(event)=>{
			    this.draw_login_dialog.call(this);
			});
    el=document.getElementById('do-signup');
    el.addEventListener('click',
			(event)=>{
			    this.draw_registorate_dialog.call(this);
			});
    var el=document.getElementById('do-edit');
    el.addEventListener('click',
			(event)=>{
			    this.draw_update_passwd_dialog.call(this);
			});
    var el=document.getElementById('do-logout');
    el.addEventListener('click',
			(event)=>{
			    fetch('./api/logout',
				  {credentials:'same-origin'});
			    this.set_loggedout();
			});

    this.loggedin=false;
    var email=localStorage.getItem('email');
    var cookie=CookieMonster();

    if(email && ('ssid' in cookie)){
	const headers = {
	    'Accept': 'application/json',
	    'Content-Type': 'application/json'
	};
	const body = JSON.stringify({'email':email});

	fetch("./api/ssid",
	      {method:'POST',
	       headers:new Headers({'Accept': 'application/json',
				    'Content-Type': 'application/json'}),
	       body:JSON.stringify({email:email})
	      }).then((response)=>{
		  if(response.ok)
		      this.set_loggedin();
		  else{
		      this.set_loggedout();
		  }
	      });
    }
    else
	this.set_loggedout();
}

View.prototype.set_loggedin=function()
{
    this.loggedin=true;
    document.getElementById('login-ctrl').setAttribute(
	'class','loggedin');
    this.calendar.draw();
}
View.prototype.set_loggedout=function()
{
    this.loggedin=false;
    document.cookie='ssid=; max-age=0';
    document.getElementById('login-ctrl').setAttribute(
	'class','loggedout');
    this.calendar.draw();
}

View.prototype.draw_login_dialog=function()
{
    this._prepair_draw_dialog(this._login_html());

    var em=localStorage.getItem('email')
    if(em)
	document.getElementById('email').value=em;

    var el=document.getElementById('button-submit')
    el.addEventListener(
	'click',
	(event)=>{
	    var email=document.getElementById('email').value;
	    var passwd=document.getElementById('password').value;
	    fetch("./api/login",
		  {method:'POST',
		   headers:new Headers({'Accept':'application/json',
					'Content-Type':'application/json'}),
		   body:JSON.stringify({email:email,
					passwd:passwd})
		  }).then((response)=>{
		      if(response.ok){
			  localStorage.setItem('email',email);
			  this.hide_dialog();
			  this.set_loggedin();
		      }
		      else{
			  document.getElementById('login-message').innerText=
			      'ログインに失敗しました。';
			  this.set_loggedout();
		      }
		  });
	});

    el=document.getElementById('button-cancel')
    el.addEventListener('click',
			(event)=>{
			    this.hide_dialog.call(this);
			});
    el=document.getElementById('button-close')
    el.addEventListener('click',
			(event)=>{
			    this.hide_dialog.call(this);
			});

}
View.prototype.draw_registorate_dialog=function()
{
    this._prepair_draw_dialog(this._registorate_html());

    document.getElementById('email').value='';
    document.getElementById('name').value='';
    document.getElementById('phone').value='';
    document.getElementById('password').value='';
    document.getElementById('password2').value='';

    var el=document.getElementById('button-submit')
    el.addEventListener(
	'click',
	(event)=>{
	    var email=document.getElementById('email').value;
	    var name=document.getElementById('name').value;
	    var phone=document.getElementById('phone').value;
	    var passwd=document.getElementById('password').value;
	    var passwd2=document.getElementById('password2').value;
	    if(passwd!=passwd2){
		document.getElementById('login-message').innerText=
		    'パスワードが一致しません。';
		return;
	    }
	    fetch("./api/member",
		  {method:'POST',
		   headers:new Headers({'Accept':'application/json',
					'Content-Type':'application/json'}),
		   body:JSON.stringify({email:email,
					name:name,
					phone:phone,
					passwd:passwd})
		  }).then((response)=>{
		      if(response.ok){
			  localStorage.setItem('email',email);
			  this.hide_dialog();
			  this.set_loggedin();
		      }
		      else{
			  var message='登録できませんでした。';
			  switch(response.status){
			  case 400:
			      message='必要項目が記入されていません。';
			      break;
			  case 409:
			      message='既に登録されています。';
			      break;
			  }
			  document.getElementById('login-message').innerText=
			      message;
			  this.set_loggedout();
		      }
		  });
	});
	      
    el=document.getElementById('button-cancel')
    el.addEventListener('click',
			(event)=>{
			    this.hide_dialog.call(this);
			});
    el=document.getElementById('button-close')
    el.addEventListener('click',
			(event)=>{
			    this.hide_dialog.call(this);
			});
}
View.prototype.draw_submit_dialog=function(date,number,you=null,note=null)
{
    this._prepair_draw_dialog(this._submit_html(this._build_date_str(date),
						number,
						note));

    el=document.getElementById('button-submit');
    el.addEventListener(
	'click',
	(event)=>{
	    var number=document.getElementById('entry-num').value;
	    var note=document.getElementById('note').value;
	    fetch(`./api/${date}`,
		  {method:'POST',
		   headers:new Headers({'Accept':'application/json',
					'Content-Type':'application/json'}),
		   body:JSON.stringify({num:number,note:note})
		  }).then((response)=>{
		      if(response.ok){
			  this.hide_dialog();
			  this.set_loggedin();
			  
			  return response.json();
		      }
		      else{
			  document.cookie='ssid=; max-age=0';
			  document.getElementById('login-message').innerText=
			      '登録できませんでした。';
			  this.set_loggedout();

			  return {};
		      }
		  }).then((json)=>{
		      Object.keys(json).forEach((k)=>{
			  document.view.calendar.set_cell_content(k,json[k]);
		      });
		      if(number>0)
			  document.view.draw_accepted_dialog();
		      else
			  document.view.draw_deleted_dialog();
		  });
	});

    if(you){
	el=document.getElementById('button-withdraw');
	el.addEventListener(
	    'click',
	    (event)=>{
		document.getElementById('entry-num').value=0;
		document.getElementById('button-submit').dispatchEvent(
		    new Event('click'));
	    })
	el.parentElement.style.display='block';
    }

    el=document.getElementById('button-cancel');
    el.addEventListener('click',
			(event)=>{
			    this.hide_dialog.call(this);
			});
    el=document.getElementById('button-close');
    el.addEventListener('click',
			(event)=>{
			    this.hide_dialog.call(this);
			});
}

View.prototype.draw_submit_with_login_dialog=function(date,email='')
{
    this._prepair_draw_dialog(
	this._submit_with_login_html(this._build_date_str(date),
				     email));

    document.getElementById('name').value=''
    document.getElementById('phone').value=''
    document.getElementById('password').value=''
    document.getElementById('password2').value=''

    if(email)
	this._set_dialog_as_login();
    else
	this._set_dialog_as_signup();

    var el=document.getElementById('dialog-tab-login');
    el.addEventListener(
	'click',
	(event)=>{
	    document.view._set_dialog_as_login();
	});
    el=document.getElementById('dialog-tab-signup');
    el.addEventListener(
	'click',
	(event)=>{
	    document.view._set_dialog_as_signup();
	});

    el=document.getElementById('button-submit');
    el.addEventListener(
	'click',
	(event)=>{
	    var req_body={
		num:document.getElementById('entry-num').value,
		note:document.getElementById('note').value,
		email:document.getElementById('email').value,
		passwd:document.getElementById('password').value};

	    if(document.view._submit_with_signup){
		if(req_body['passwd']!=document.getElementById('password2').value){
		    document.getElementById('login-message').innerText=
			'パスワードが一致しません。';
		    return;
		}
		req_body['name']=document.getElementById('name').value;
		req_body['phone']=document.getElementById('phone').value;
	    }
	    fetch(`./api/${date}`,
		  {method:'POST',
		   headers:new Headers({'Accept':'application/json',
					'Content-Type':'application/json'}),
		   body:JSON.stringify(req_body)
		  }).then((response)=>{
		      if(response.ok){
			  localStorage.setItem('email',req_body['email']);
			  this.hide_dialog();
			  this.set_loggedin();
			  
			  return response.json();
		      }
		      else{
			  var message='登録に失敗しました。';
			  switch(response.status){
			  case 400:
			      message='必要項目が記入されていません。';
			      break;
			  case 401:
			      message='ログインに失敗しました。';
			      break;
			  case 409:
			      message='既に登録されています。';
			      break;
			  }
			  document.getElementById('login-message').innerText=
			      message;
			  this.set_loggedout();

			  return {};
		      }
		  }).then((json)=>{
		      Object.keys(json).forEach((k)=>{
			  document.view.calendar.set_cell_content(k,json[k]);
		      });
		      document.view.draw_accepted_dialog();
		  });
	});

    el=document.getElementById('button-cancel');
    el.addEventListener('click',
			(event)=>{
			    this.hide_dialog.call(this);
			});
    el=document.getElementById('button-close')
    el.addEventListener('click',
			(event)=>{
			    this.hide_dialog.call(this);
			});
}
View.prototype.draw_update_passwd_dialog=function()
{
    this._prepair_draw_dialog(this._update_passwd_html());
    document.view._set_dialog_as_update_gecos();

    var alive=true;
    fetch('./api/member',
	  {credentials:'same-origin'}).then((response)=>{
	      if(response.ok)
		  return response.json();
	      else{
		  document.cookie='ssid=; max-age=0';
		  this.hide_dialog();
		  alive=null;
		  return {};
	      }
	  }).then((json)=>{
	      var keys=Object.keys(json);
	      if(keys.empty)
		  return;

	      keys.forEach((k)=>{
		  var el=document.getElementById(k);
		  if(!el || el.tagName!='INPUT')
		      return;
		  el.setAttribute('value',json[k]);
	      });
	  });

    if(!alive)
	return;
    
    var el=document.getElementById('dialog-tab-update-gecos');
    el.addEventListener(
	'click',
	(event)=>{
	    document.view._set_dialog_as_update_gecos();
	});
    el=document.getElementById('dialog-tab-update-passwd');
    el.addEventListener(
	'click',
	(event)=>{
	    document.view._set_dialog_as_update_passwd();
	});

    el=document.getElementById('button-submit');
    el.addEventListener(
	'click',
	(event)=>{
	    var passwd=document.getElementById('password').value;
	    var email=null;
	    var req_body={};
	    if(document.getElementById('update-passwd').
	       classList.contains('gecos')){
		email=document.getElementById('email').value;
		var name=document.getElementById('name').value;
		var phone=document.getElementById('phone').value;
		req_body={email:email,
			  name:name,
			  phone:phone,
			  passwd:passwd};
	    }
	    else{
		var new_passwd=document.getElementById('new-password').value;
		var new_passwd2=document.getElementById('new-password2').value;

		if(new_passwd!=new_passwd2){
		    document.getElementById('login-message').innerText=
			'パスワードが一致しません。';
		    return;
		}
		req_body={passwd:passwd,
			  new_passwd:new_passwd};
	    }
	    fetch("./api/member",
		  {method:'PATCH',
		   headers:new Headers({'Accept':'application/json',
					'Content-Type':'application/json'}),
		   body:JSON.stringify(req_body)
		  }).then((response)=>{
		      var message=null;
		      if(response.ok){
			  if(email)
			      localStorage.setItem('email',email);
			  this.hide_dialog();
			  this.draw_updated_dialog();
		      }
		      else{
		      document.getElementById('login-message').innerText=
			  '更新できませんでした。';
		      }
		  });
	    });

    el=document.getElementById('button-cancel');
    el.addEventListener('click',
			(event)=>{
			    this.hide_dialog.call(this);
			});
    el=document.getElementById('button-close')
    el.addEventListener('click',
			(event)=>{
			    this.hide_dialog.call(this);
			});
}

View.prototype.draw_accepted_dialog=function()
{
    this._prepair_draw_dialog(this._accepted_html());
    document.getElementById('dialog-body').innerHTML=
	document.getElementById('important-notice').innerHTML;

    var el=document.getElementById('button-cancel')
    el.addEventListener('click',
			(event)=>{
			    this.hide_dialog.call(this);
			});
    el=document.getElementById('button-close')
    el.addEventListener('click',
			(event)=>{
			    this.hide_dialog.call(this);
			});
}
View.prototype.draw_deleted_dialog=function()
{
    this._prepair_draw_dialog(this._deleted_html());

    var el=document.getElementById('button-cancel')
    el.addEventListener('click',
			(event)=>{
			    this.hide_dialog.call(this);
			});
    el=document.getElementById('button-close')
    el.addEventListener('click',
			(event)=>{
			    this.hide_dialog.call(this);
			});
}
View.prototype.draw_updated_dialog=function()
{
    this._prepair_draw_dialog(this._updated_html());

    var el=document.getElementById('button-cancel')
    el.addEventListener('click',
			(event)=>{
			    this.hide_dialog.call(this);
			});
    el=document.getElementById('button-close')
    el.addEventListener('click',
			(event)=>{
			    this.hide_dialog.call(this);
			});
}

View.prototype._login_html=function()
{
    return `
<div class='dialog'>
<p class='dialog-header'><i id='button-close' class="fas fa-times-circle"></i></p>
<h2>ログイン</h2>
<dl>
<dt>メールアドレス</dt>
<dd><input class='input' id='email'></input></dd>
<dt>パスワード</dt>
<dd><input class='input' id='password' type='password'></input></dd>
</dl>
<p id='login-message'></p>
<p class='buttons'>
<input class='button' id='button-submit' type='button' value='ログイン'></input>
<input class='button' id='button-cancel' type='button' value='キャンセル'></input>
</p>
</div>
`;
}

View.prototype._registorate_html=function()
{
    return `
<div class='dialog'>
<p class='dialog-header'><i id='button-close' class="fas fa-times-circle"></i></p>
<h2>新規登録</h2>
<dl>
<dt class='name'>氏名</dt>
<dd class='name'><input class='input' id='name' required='required'></input></dd>
<dt>メールアドレス</dt>
<dd><input class='input' id='email' required='required'></input></dd>
<dt class='phone'>電話番号</dt>
<dd class='phone'><input class='input' id='phone' required='required' pattern='^[0-9\-]+$'></input></dd>
<dt>パスワード</dt>
<dd><input class='input' id='password' type='password' required='required'></input></dd>
<dt>パスワード確認</dt>
<dd><input class='input' id='password2' type='password' required='required'></input></dd>
</dl>
<p id='login-message'></p>
<p class='buttons'>
<input class='button' id='button-submit' type='button' value='登録'></input>
<input class='button' id='button-cancel' type='button' value='キャンセル'></input>
</p>
</div>
`;
}

View.prototype._submit_html=function(date,number,note)
{
    if(!note)
	note='';
	
    return `
<div class='dialog'>
<p class='dialog-header'><i id='button-close' class="fas fa-times-circle"></i></p>
<h2>日程および人数の登録</h2>
<dl>
<dt class='entry-date'>日付</dt>
<dd class='entry-date'><span class='input' id='entry-date'>${date}</span></dd>
<dt class='entry-num'>人数</dt>
<dd class='entry-num'><input class='input' id='entry-num' value='${number}' required='required' pattern="^[0-9]+$"></input></dd>
<dt class='note'>備考</dt>
<dd class='note'><input class='input' id='note' value='${note.escapeHTML()}'></input></dd>
<dd class='withdraw'><input class='button' id='button-withdraw' type='button' value='参加取り消し'></input>
</dl>
<p id='entry-notice'>※ 事務処理の都合上，高速道路を経由してお越しになる場合には備考欄にその旨ご記入願います。</p>
<p id='login-message'></p>
<p class='buttons'>
<input class='button' id='button-submit' type='button' value='送信'></input>
<input class='button' id='button-cancel' type='button' value='キャンセル'></input>
</p>
</div>
`;
}
View.prototype._submit_with_login_html=function(date,email='')
{
    email=email.escapeHTML();

    return `
<div class='dialog'>
<p class='dialog-header'><i id='button-close' class="fas fa-times-circle"></i></p>
<h2>日程および人数の登録</h2>
<dl>
<dt class='entry-date'>日付</dt>
<dd class='entry-date'><span class='input' id='entry-date'>${date}</span></dd>
<dt class='entry-num'>人数</dt>
<dd class='entry-num'><input class='input' id='entry-num' value='1' required='required' pattern="^[0-9]+$"></input></dd>
<dt class='note'>備考</dt>
<dd class='note'><input class='input' id='note'></input></dd>
</dl>
<p id='entry-notice'>※ 事務処理の都合上，高速道路を経由してお越しになる場合には備考欄にその旨ご記入願います。</p>
<ul class='tab'>
<li class='tab on' id='dialog-tab-login'>ログイン</li>
<li class='tab' id='dialog-tab-signup'>新規代表者登録</li>
</ul>
<dl class='tab' id='login-or-signup'>
<dt class='name signup'>氏名</dt>
<dd class='name signup'><input class='input signup' id='name'></input></dd>
<dt>メールアドレス</dt>
<dd><input class='input' id='email' value='${email}' required='required'></input></dd>
<dt class='phone signup'>電話番号</dt>
<dd class='phone signup'><input class='input signup' id='phone' pattern='^[0-9\-]+$'></input></dd>
<dt>パスワード</dt>
<dd><input class='input' id='password' type='password' required='required'></input></dd>
<dt class='password2 signup'>パスワード確認</dt>
<dd class='password2 signup'><input class='input signup' id='password2' type='password'></input></dd>
</dl>
<p id='login-message'></p>
<p class='buttons'>
<input class='button' id='button-submit' type='button' value='送信'></input>
<input class='button' id='button-cancel' type='button' value='キャンセル'></input>
</p>
</div>
`;
}
View.prototype._update_passwd_html=function()
{
    return `
<div class='dialog' id='update-passwd-dialog'>
<p class='dialog-header'><i id='button-close' class="fas fa-times-circle"></i></p>
<h2>登録変更</h2>
<ul class='tab'>
<li class='tab on' id='dialog-tab-update-gecos'>代表者情報の変更</li>
<li class='tab' id='dialog-tab-update-passwd'>パスワード変更</li>
</ul>
<dl class='tab gecos' id='update-passwd'>
<dt class='gecos'>氏名</dt>
<dd class='gecos'><input class='input gecos' id='name'></input></dd>
<dt class='gecos'>メールアドレス</dt>
<dd class='gecos'><input class='input gecos' id='email'></input></dd>
<dt class='gecos'>電話番号</dt>
<dd class='gecos'><input class='input gecos' id='phone' pattern='^[0-9\-]+$'></input></dd>
<dt>現在のパスワード</dt>
<dd><input class='input' id='password' type='password' required='required'></input></dd>
<dt class='passwd'>新規パスワード</dt>
<dd class='passwd'><input class='input passwd' id='new-password' type='password'></input></dd>
<dt class='passwd'>新規パスワード確認</dt>
<dd class='passwd'><input class='input passwd' id='new-password2' type='password'></input></dd>
</dl>
<p id='login-message'></p>
<p class='buttons'>
<input class='button' id='button-submit' type='button' value='送信'></input>
<input class='button' id='button-cancel' type='button' value='キャンセル'></input>
</p>
</div>
`;
}
View.prototype._accepted_html=function()
{
    return `
<div class='dialog'>
<p class='dialog-header'><i id='button-close' class="fas fa-times-circle"></i></p>
<h2>登録しました</h2>
<div id='dialog-body'>
</div>
<p class='buttons'>
<input class='button' id='button-cancel' type='button' value='確認'></input>
</p>
</div>
`;
}
View.prototype._deleted_html=function()
{
    return `
<div class='dialog'>
<p class='dialog-header'><i id='button-close' class="fas fa-times-circle"></i></p>
<h2>削除しました</h2>
<p class='buttons'>
<input class='button' id='button-cancel' type='button' value='閉じる'></input>
</p>
</div>
`;
}
View.prototype._updated_html=function()
{
    return `
<div class='dialog'>
<p class='dialog-header'><i id='button-close' class="fas fa-times-circle"></i></p>
<h2>更新しました</h2>
<p class='buttons'>
<input class='button' id='button-cancel' type='button' value='閉じる'></input>
</p>
</div>
`;
}

View.prototype._set_dialog_as_login=function()
{
    var el=document.getElementById('dialog-tab-login');
    if(!el)
	return;
    el.classList.add('on');
    el=document.getElementById('dialog-tab-signup');
    el.classList.remove('on');
    el=document.getElementById('login-or-signup');
    el.classList.remove('signup');
    el.classList.add('login');

    var collection=document.getElementById('login-or-signup').
	getElementsByTagName('input');
    for(var i=0;i<collection.length;i++){
	if(collection[i].classList.contains('signup'))
	    collection[i].removeAttribute('required')
    }

    this._submit_with_signup=false;
}
View.prototype._set_dialog_as_signup=function()
{
    var el=document.getElementById('dialog-tab-login');
    if(!el)
	return;
    el.classList.remove('on');
    el=document.getElementById('dialog-tab-signup');
    el.classList.add('on');
    el=document.getElementById('login-or-signup');
    el.classList.remove('login');
    el.classList.add('signup');

    var collection=document.getElementById('login-or-signup').
	getElementsByTagName('input');
    for(var i=0;i<collection.length;i++){
	if(collection[i].classList.contains('signup'))
	    collection[i].setAttribute('required','required')
    }

    this._submit_with_signup=true;
}

View.prototype._set_dialog_as_update_gecos=function()
{
    document.getElementById('password').value='';
    document.getElementById('new-password').value='';
    document.getElementById('new-password2').value='';

    var el=document.getElementById('dialog-tab-update-gecos');
    if(!el)
	return;
    el.classList.add('on');
    el=document.getElementById('dialog-tab-update-passwd');
    el.classList.remove('on');
    el=document.getElementById('update-passwd');
    el.classList.add('gecos');
    el.classList.remove('passwd');

    var collection=el.getElementsByTagName('input');
    for(var i=0;i<collection.length;i++){
	var clist=collection[i].classList;
	if(clist.contains('gecos'))
	    collection[i].setAttribute('required','required');
	else if(clist.contains('passwd'))
	    collection[i].removeAttribute('required');
    }
}
View.prototype._set_dialog_as_update_passwd=function()
{
    document.getElementById('password').value='';
    document.getElementById('new-password').value='';
    document.getElementById('new-password2').value='';

    var el=document.getElementById('dialog-tab-update-passwd');
    if(!el)
	return;
    el.classList.add('on');
    el=document.getElementById('dialog-tab-update-gecos');
    el.classList.remove('on');
    el=document.getElementById('update-passwd');
    el.classList.remove('gecos');
    el.classList.add('passwd');

    var collection=el.getElementsByTagName('input');
    for(var i=0;i<collection.length;i++){
	var clist=collection[i].classList;
	if(clist.contains('passwd'))
	    collection[i].setAttribute('required','required');
	else if(clist.contains('gecos'))
	    collection[i].removeAttribute('required');
    }
}

window.onload=function(){
    document.view=new View();
};
