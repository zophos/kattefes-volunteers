//
// logic.js
//
//
// Time-stamp: <2019-11-04 00:20:49 zophos>
//

String.prototype.escapeHTML=function()
{
  return this.replace(/[&'`"<>]/g,(m)=>{
      return {'&':'&amp;',
	      "'":'&#x27;',
	      '`':'&#x60;',
	      '"':'&quot;',
	      '<':'&lt;',
	      '>':'&gt;'}[m]
  });
}


function View()
{
    this.calendar=new Calendar(document.getElementById('cal-div'),
			       {'class':'cal'});

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

    this._RELOAD_DURATION=300000; // 5min
    this._reload_timer=null;

    this.calendar.on_draw=function(year,month){
	if(document.view && document.view._reload_timer){
	    clearTimeout(document.view._reload_timer);
	    document.view._reload_timer=null;
	}

	var y=year;
	var m=('0'+(month+1)).slice(-2);

	var cal_id=`${y}${m}`
	fetch(`./api/${cal_id}`,
	      {credentials:'same-origin'}).then((response)=>{
		  return response.json();
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

    this.calendar.draw();
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

View.prototype.hide_dialog=function()
{
    var el=document.getElementById('overray')
    el.style.display='none';
    el.innerHTML=null;
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

    el=document.getElementById('button-submit')
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
View.prototype.draw_accepted_dialog=function()
{
    this._prepair_draw_dialog(this._accepted_html());

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

View.prototype._prepair_draw_dialog=function(html)
{
    var el=document.getElementById('overray')
    el.style.paddingTop=null;
    el.style.paddingLeft=null;
    el.innerHTML=html;
    el.style.display='block';

    dialog=el.getElementsByTagName('div')[0];
    if(!dialog)
	return;

    var rect=dialog.getClientRects()[0];

    var left=(document.documentElement.clientWidth-rect.width)/2;
    if(left<0)
	left=0;
    left+=window.pageXOffset;
    el.style.paddingLeft=left+'px';
    el.style.width=
	(document.documentElement.getClientRects()[0].width-left)+'px';

    var top=(document.documentElement.clientHeight-rect.height)/2;
    if(top<0)
	top=0;
    top+=window.pageYOffset;
    el.style.paddingTop=top+'px';
    el.style.height=
	(document.documentElement.getClientRects()[0].height-top)+'px';
}


View.prototype._build_date_str=function(date)
{
    var y=date.slice(0,4);
    var m=date.slice(4,6);
    var d=date.slice(-2);
    var _date=new Date(y,m-1,d);
    var wday=this.calendar._WDAY[_date.getDay()];

    return `${y}/${m}/${d} (${wday.capitalize()}.)`;
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
<ul class='tab'>
<li class='tab on' id='dialog-tab-login'>ログイン</li>
<li class='tab' id='dialog-tab-signup'>新規代表者登録</li>
</ul>
<dl class='login' id='login-or-signup'>
<dt class='name'>氏名</dt>
<dd class='name'><input class='input' id='name'></input></dd>
<dt>メールアドレス</dt>
<dd><input class='input' id='email' value='${email}' required='required'></input></dd>
<dt class='phone'>電話番号</dt>
<dd class='phone'><input class='input' id='phone' pattern='^[0-9\-]+$'></input></dd>
<dt>パスワード</dt>
<dd><input class='input' id='password' type='password' required='required'></input></dd>
<dt class='password2'>パスワード確認</dt>
<dd class='password2'><input class='input' id='password2' type='password'></input></dd>
</dl>
<p id='login-message'></p>
<p class='buttons'>
<input class='button' id='button-submit' type='button' value='送信'></input>
<input class='button' id='button-cancel' type='button' value='キャンセル'></input>
</p>
</div>
`;
}
View.prototype._accepted_html=function(date,email='')
{
    return `
<div class='dialog'>
<p class='dialog-header'><i id='button-close' class="fas fa-times-circle"></i></p>
<h2>登録しました</h2>
<p>申し込み日の参加人数が計4名以上で決行する予定です。</p>

<p>前日に中止の連絡が無い場合は，<a href='http://officebarbecue.jp/kattefes/volunteers.html' target='_blank'>災害ボランティア情報のページ</a>を参照の上，当日10:45に相模湖地域事務所ボランティアセンターに集合ください。</p>

<p>申し込み日の参加人数が3名に満たない場合，および悪天候などの場合は中止になります。</p>
<p class='buttons'>
<input class='button' id='button-cancel' type='button' value='確認'></input>
</p>
</div>
`;
}
View.prototype._deleted_html=function(date,email='')
{
    return `
<div class='dialog'>
<p class='dialog-header'><i id='button-close' class="fas fa-times-circle"></i></p>
<h2>削除しました</h2>
<p class='buttons'>
<input class='button' id='button-cancel' type='button' value='確認'></input>
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
    el.setAttribute('class','login');

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
    el.setAttribute('class','signup');

    this._submit_with_signup=true;
}

window.onload=function(){
    document.view=new View();
};
