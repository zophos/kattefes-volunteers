//
// calendar.js
//
//
// Time-stamp: <2019-10-28 17:49:57 zophos>
//

//
// https://stackoverflow.com/questions/1026069/how-do-i-make-the-first-letter-of-a-string-uppercase-in-javascript
//
String.prototype.capitalize=function(){
    return this.charAt(0).toUpperCase() + this.slice(1);
}

Date.prototype.next=function(){
    this.setTime(this.getTime()+86400000);
    return this;
}

function CookieMonster()
{
    var ret={}
    document.cookie.split(';').forEach((c)=>{
	var v=c.split('=');
	if(v.length==2)
	    ret[v[0].trim()]=v[1].trim();
    })

    return ret;
}

function Calendar(parentNode,
		  attrs={},
		  id_prefix='cal')
{
    this._DATES=[31,28,31,30,31,30,31,31,30,31,30,31];
    this._WDAY=['sun','mon','tue','wed','thu','fri','sat'];

    this.id_prefix=id_prefix

    //
    // set at this._build_month_header()
    //
    this.prevMonthElement=null;
    this.currentMonthElement=null;
    this.nextMonthElement=null;

    this.cells={}

    this.tbody=document.createElement('tbody');
    var el=this._build_month_header();
    this.tbody.appendChild(el);
    el=this._build_wday_header();
    this.tbody.appendChild(el);

    this.base=document.createElement('table');
    for(key in attrs)
	this.base.setAttribute(key,attrs[key]);
    this.base.appendChild(this.tbody);

    parentNode.appendChild(this.base);

    this.on_draw=null;
    this.on_cell_click=null;
}
Calendar.prototype.draw=function(year=null,month=null)
{
    this.today=new Date();
    if(!year || !month){
	year=this.today.getFullYear();
	month=this.today.getMonth();
    }

    this.currentYear=year;
    this.currentMonth=month;

    this._clear_days();

    //
    // draw calendar body
    //
    var first=new Date(year,month,1)
    var last=new Date(year,month,this._get_modays(year,month))
    for(var d=1-first.getDay();d<=last.getDate();d+=7){
	var el=this._build_week(year,month,d);
	this.tbody.append(el);
    }

    //
    // update calendar header
    //
    this.currentMonthElement.innerText=
	this.currentYear+'/'+(this.currentMonth+1);

    var str=`${this.currentYear}/${this.currentMonth}`
    if(this.currentMonth==0)
	str=`${this.currentYear-1}/12`
    this.prevMonthElement.setAttribute('title',str);
    str=`${this.currentYear}/${this.currentMonth+2}`
    if(this.currentMonth==11)
	str=`${this.currentYear+1}/1`
    this.nextMonthElement.setAttribute('title',str);

    if(typeof(this.on_draw)=="function")
	this.on_draw(year,month)
}
Calendar.prototype.draw_prev=function()
{
    if(this.currentMonth==0)
	this.draw(this.currentYear-1,11);
    else
	this.draw(this.currentYear,this.currentMonth-1);
}
Calendar.prototype.draw_next=function()
{
    if(this.currentMonth==11)
	this.draw(this.currentYear+1,0);
    else
	this.draw(this.currentYear,this.currentMonth+1);
}
Calendar.prototype.cell=function(date)
{
    var c_id=`${this.id_prefix}-d${date}`
    if(c_id in this.cells)
	return this.cells[c_id];
    else
	return null;
}
Calendar.prototype.set_cell_content=function(date,body)
{
    var el=this.cell(date);
    if(!el)
	return;
    el.classList.remove('fixed');
    el.removeAttribute('data-you');

    var td=el.getElementsByTagName('td')[0]
    if(!td)
	return;

    if('all' in body)
	td.innerText=body['all'];
    else{
	td.innerText='';
	return;
    }

    if('fixed' in body)
	el.classList.add('fixed');

    if('you' in body && body['you']>0){
	td.setAttribute('class','you');
	el.setAttribute('data-you',body['you']);
    }

}

Calendar.prototype._build_month_header=function()
{
    var th=document.createElement('th');
    th.setAttribute('colspan','7');

    var prev=document.createElement('span');
    prev.setAttribute('class',`${this.id_prefix}-month-button`);
    prev.setAttribute('id',`${this.id_prefix}-month-prev`);
    var i=document.createElement('i');
    i.setAttribute('class','fas fa-caret-left');
    prev.appendChild(i);
    th.appendChild(prev);

    var current=document.createElement('span');
    current.setAttribute('class',`${this.id_prefix}-month-button`);
    current.setAttribute('id',`${this.id_prefix}-month-current`);
    //current.appendChild(document.createTextNode(year+'/'+(month+1)));
    th.appendChild(current);

    var next=document.createElement('span');
    next.setAttribute('class',`${this.id_prefix}-month-button`);
    next.setAttribute('id',`${this.id_prefix}-month-next`);
    i=document.createElement('i');
    i.setAttribute('class','fas fa-caret-right');
    next.appendChild(i);
    th.appendChild(next);

    this.prevMonthElement=prev;
    this.currentMonthElement=current;
    this.nextMonthElement=next;

    var tr=document.createElement('tr');
    tr.setAttribute('class','month');
    tr.appendChild(th);

    this.prevMonthElement.addEventListener('click',
					   (event)=>{
					       this.draw_prev.call(this);
					   });
    this.nextMonthElement.addEventListener('click',
					   (event)=>{
					       this.draw_next.call(this);
					   });

    return tr;
}
Calendar.prototype._build_wday_header=function()
{
    var tr=document.createElement('tr');
    tr.setAttribute('class','wday');
    this._WDAY.forEach((n)=>{
	var th=document.createElement('th');
	th.setAttribute('class',n);
	th.appendChild(document.createTextNode(n.capitalize()+'.'));
	tr.appendChild(th);
    });
    
    return tr;
}
Calendar.prototype._clear_days=function()
{
    Object.keys(this.cells).forEach((k)=>{
	delete this.cells[k];
    },this);

    var collection=this.tbody.getElementsByTagName('tr');
    var buf=[];
    for(var i=0;i<collection.length;i++){
	if(collection[i].classList.contains('day'))
	    buf.push(collection[i]);
    }

    buf.forEach((el)=>{
	this.tbody.removeChild(el);
    },this);
	
}

Calendar.prototype._get_modays=function(year,month)
{
    var dates;
    if(month==1 && 
       ((year%400)==0 ||
	((year%4)==0 && (year%100)!=0)))
	dates=29;
    else
	dates=this._DATES[month];

    return dates;
}

Calendar.prototype._build_week=function(year,month,start_date)
{
    var tr=document.createElement('tr');
    tr.setAttribute('class','day');
    
    var date=new Date(year,month,start_date);
    this._WDAY.forEach((wday)=>{
	var y=date.getFullYear();
	var m=date.getMonth();
	var d=date.getDate();

	var m_str=('0'+(m+1)).slice(-2);
	var d_str=('0'+d).slice(-2);

	var tbl=document.createElement('table');

	var c_id=`${this.id_prefix}-d${y}${m_str}${d_str}`
	tbl.setAttribute('id',c_id);
	this.cells[c_id]=tbl;

	//if(date<this.today || m!=this.currentMonth)
	if(date<this.today)
	    tbl.setAttribute('class','day oom');
	else
	    tbl.setAttribute('class','day');

	var ttr=document.createElement('tr');
	var th=document.createElement('th');
	th.innerText=''
	if(m!=this.currentMonth)
	    th.innerText=(m+1)+'/';
	th.innerText+=d
	ttr.appendChild(th);
	tbl.appendChild(ttr);

	ttr=document.createElement('tr');
	var td=document.createElement('td');
	td.innerHTML='';
	ttr.appendChild(td);
	tbl.appendChild(ttr);

	td=document.createElement('td');
	td.setAttribute('class',wday);
	td.appendChild(tbl);
	tr.appendChild(td);
	
	date.next();
    },this);
    return tr;
}

function View()
{
    this.calendar=new Calendar(document.getElementById('cal-div'),
			       {'class':'cal'});

    this.calendar.on_cell_click=function(event,cell){
	var date=cell.id.replace(`${this.id_prefix}-d`,'');
	var view=document.view;
	var number=1;
	if(view.loggedin){
	    var you=cell.getAttribute('data-you')
	    if(you)
		number=parseInt(you,10);
	    view.draw_submit_dialog(date,number);
	}
	else
	    view.draw_submit_with_login_dialog(date,localStorage.getItem('email')||'');
    }
    this.calendar.on_draw=function(year,month){
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
		if(c_list.contains('oom') || c_list.contains('fixed'))
		    return;

		el.addEventListener('click',
				    (event)=>{
					this.on_cell_click.call(this,event,el);
				    });
	    },this)
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
			})
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
}
View.prototype.draw_submit_dialog=function(date,number)
{
    this._prepair_draw_dialog(this._submit_html(this._build_date_str(date),
						number));

    el=document.getElementById('button-submit')
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
		  });
	});

    el=document.getElementById('button-cancel')
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
		  });
	});

    el=document.getElementById('button-cancel')
    el.addEventListener('click',
			(event)=>{
			    this.hide_dialog.call(this);
			});
}

View.prototype._prepair_draw_dialog=function(html)
{
    var el=document.getElementById('overray')
    el.innerHTML=html;
    el.style.display='flex';
}


View.prototype._build_date_str=function(date)
{
    var y=date.slice(0,4);
    var m=date.slice(4,6);
    var d=date.slice(-2);
    var _date=new Date(y,m,d);
    var wday=this.calendar._WDAY[_date.getDay()];

    return `${y}/${m}/${d} (${wday.capitalize()}.)`;
}

View.prototype._login_html=function()
{
    return `
<div class='dialog'>
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
<h2>新規登録</h2>
<dl>
<dt>メールアドレス</dt>
<dd><input class='input' id='email'></input></dd>
<dt class='name'>氏名</dt>
<dd class='name'><input class='input' id='name'></input></dd>
<dt class='phone'>電話番号</dt>
<dd class='phone'><input class='input' id='phone'></input></dd>
<dt>パスワード</dt>
<dd><input class='input' id='password' type='password'></input></dd>
<dt>パスワード確認</dt>
<dd><input class='input' id='password2' type='password'></input></dd>
</dl>
<p id='login-message'></p>
<p class='buttons'>
<input class='button' id='button-submit' type='button' value='登録'></input>
<input class='button' id='button-cancel' type='button' value='キャンセル'></input>
</p>
</div>
`;
}

View.prototype._submit_html=function(date,number)
{
    return `
<div class='dialog'>
<h2>日程および人数の登録</h2>
<dl>
<dt class='entry-date'>日付</dt>
<dd class='entry-date'><span class='input' id='entry-date'>${date}</span></dd>
<dt class='entry-num'>人数</dt>
<dd class='entry-num'><input class='input' id='entry-num' value='${number}'></input></dd>
<dt class='note'>備考</dt>
<dd class='note'><input class='input' id='note'></input></dd>
</dl>
<p id='login-message'></p>
<p class='buttons'>
<input class='button' id='button-submit' type='button' value='登録'></input>
<input class='button' id='button-cancel' type='button' value='キャンセル'></input>
</p>
</div>
`;
}
View.prototype._submit_with_login_html=function(date,email='')
{
    return `
<div class='dialog'>
<h2>日程と人数の登録</h2>
<dl>
<dt class='entry-date'>日付</dt>
<dd class='entry-date'><span class='input' id='entry-date'>${date}</span></dd>
<dt class='entry-num'>人数</dt>
<dd class='entry-num'><input class='input' id='entry-num' value='1'></input></dd>
<dt class='note'>備考</dt>
<dd class='note'><input class='input' id='note'></input></dd>
</dl>
<ul class='tab'>
<li class='tab on' id='dialog-tab-login'>ログイン</li>
<li class='tab' id='dialog-tab-signup'>新規登録</li>
</ul>
<dl class='login' id='login-or-signup'>
<dt class='name'>氏名</dt>
<dd class='name'><input class='input' id='name'></input></dd>
<dt>メールアドレス</dt>
<dd><input class='input' id='email' value='${email}'></input></dd>
<dt class='phone'>電話番号</dt>
<dd class='phone'><input class='input' id='phone'></input></dd>
<dt>パスワード</dt>
<dd><input class='input' id='password' type='password'></input></dd>
<dt class='password2'>パスワード確認</dt>
<dd class='password2'><input class='input' id='password2' type='password'></input></dd>
</dl>
<p id='login-message'></p>
<p class='buttons'>
<input class='button' id='button-submit' type='button' value='登録'></input>
<input class='button' id='button-cancel' type='button' value='キャンセル'></input>
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
