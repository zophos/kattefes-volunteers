//
// admin.js
//
//
// Time-stamp: <2019-12-11 17:11:24 zophos>
//

View.prototype._setup=function()
{
    this.calendar.on_cell_click=function(event,cell){
	var date=cell.id.replace(`${this.id_prefix}-d`,'');
	document.view.draw_detail_dialog(date);
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
	fetch(`../api/${cal_id}`,
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

	    document.getElementById('do-logout').href='../'+q;
	}
    }

    this._record_is_changed=false;
}
View.prototype.draw_detail_dialog=function(date)
{
    this.unset_dialog_is_changed();
    this._prepair_draw_dialog(this._detail_html(this._build_date_str(date)));
    document.getElementById('admin-dialog').dataset.date=date;

    fetch(`./list/${date}`,
	  {credentials:'same-origin'}).then((response)=>{
	      return response.json();
	  }).then((json)=>{
	      if(!json)
		  json={}
	      document.getElementById('entry-num').innerText=json['num']||0;

	      var collection=document.getElementsByName('date-status');
	      for(var i=0;i<collection.length;i++)
		  collection[i].checked=false;

	      switch(json['status']||'open'){
	      case 'closed':
		  collection[1].checked=true;
		  break;
	      case 'canceled':
		  collection[2].checked=true;
		  break;
	      default:
		  collection[0].checked=true;
		  break;
	      }
	      document.getElementById('date-status-list').dataset.original=
		  json['status']||'open';

	      var members=json['members']||[];
	      var tbl=document.getElementById('members-table');
	      if(members.length==0){
		  tbl.innerHTML='';
		  return;
	      }
	      var tr_list=[]
	      tbl.innerHTML=this._detail_header_html();
	      members.forEach((m)=>{
		  var tr=document.createElement('tr');

		  var td=document.createElement('td');
		  td.innerText=m['name']||'';
		  tr.appendChild(td);

		  td=document.createElement('td');
		  td.setAttribute('class','num');
		  td.innerText=m['email']||'';
		  tr.appendChild(td);

		  td=document.createElement('td');
		  td.innerText=m['phone']||'';
		  tr.appendChild(td);

		  var input=document.createElement('input');
		  input.setAttribute('value',m['num']||0);
		  input.setAttribute('type','text');
		  input.setAttribute('size',2);
		  input.setAttribute('maxlength',2);
		  input.setAttribute('pattern','^[0-9]+$');
		  input.setAttribute('data-email',m['email']||'');
		  input.setAttribute('data-original',m['num']||0);
		  input.addEventListener('change',(e)=>{
		      document.view.set_dialog_is_changed();
		  });
		  td=document.createElement('td');
		  td.appendChild(input);
		  tr.appendChild(td);

		  td=document.createElement('td');
		  td.innerText=m['note']||'';
		  tr.appendChild(td);

		  tbl.appendChild(tr)
	      });
	  });

    var collection=document.getElementsByName('date-status');
    for(var i=0;i<collection.length;i++)
	collection[i].addEventListener('change',(el)=>{
	    document.view.set_dialog_is_changed();
	});


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
View.prototype.unset_dialog_is_changed=function()
{
    if(!this._record_is_changed)
	return;

    this._record_is_changed=false;
    var el=document.getElementById('button-submit');
    if(!el)
	return;

    el.removeEventListener('click',
			   document.view.submit_dialog_values);
    el.classList.add('disable');
}
View.prototype.set_dialog_is_changed=function()
{
    if(this._record_is_changed)
	return;

    this._record_is_changed=true;
    
    var el=document.getElementById('button-submit');
    if(!el)
	return;

    el.addEventListener('click',
			document.view.submit_dialog_values);

    el.classList.remove('disable');
}
View.prototype.submit_dialog_values=function()
{
    var ul=document.getElementById('date-status-list');
    var original_status=ul.dataset.original;
    var status='open';
    var collection=ul.getElementsByTagName('input');
    for(var i=0;i<collection.length;i++){
	if(collection[i].checked){
	    status=collection[i].value;
	    break;
	}
    }

    var num={};
    var count=0;
    var tbl=document.getElementById('members-table');
    collection=tbl.getElementsByTagName('input');
    for(var i=0;i<collection.length;i++){
	if(collection[i].value!=collection[i].dataset.original){
	    num[collection[i].dataset.email]=
		parseInt(collection[i].value);
	    count+=1;
	}
    }

    if((status==original_status) && (count==0))
	return;

    var date=document.getElementById('admin-dialog').dataset.date;
    var req_body={
	status:status,
	num:num
    }
    fetch(`./list/${date}`,
	  {method:'POST',
	   headers:new Headers({'Accept':'application/json',
				'Content-Type':'application/json'}),
	   body:JSON.stringify(req_body)
	  }).then((response)=>{
	      if(response.ok){
		  document.view.hide_dialog();
		  
		  return response.json();
	      }
	      else{
		  document.getElementById('login-message').innerText=
		      '更新に失敗しました。';
		  
		  return {};
	      }
	  }).then((json)=>{
	      Object.keys(json).forEach((k)=>{
		  document.view.calendar.set_cell_content(k,json[k]);
	      });
	  });
}

View.prototype._detail_html=function(date)
{
    return `
<div class='admin-dialog' id='admin-dialog'>
<p class='dialog-header'><i id='button-close' class="fas fa-times-circle"></i></p>
<h2>${date}</h2>
<p class='entry-num'><span class='input' id='entry-num'>0</span> 名</p>
<ul class='status' id='date-status-list'>
<li><input type='radio' name='date-status' id='date-status-open' value='open' checked='checked'> 未確定</li>
<li><input type='radio' name='date-status' id='date-status-closed' value='closed'> 締め切り</li>
<li><input type='radio' name='date-status' id='date-status-canceled' value='canceled'> 中止</li>
</ul>

<table id='members-table'>
</table>
<p id='login-message'></p>
<p class='buttons'>
<input class='button disable' id='button-submit' type='button' value='更新'></input>
<input class='button' id='button-cancel' type='button' value='キャンセル'></input>
</p>
</div>
`;
}
View.prototype._detail_header_html=function()
{
    return "<tr><th>代表者</th><th>メールアドレス</th><th>電話番号</th><th>人数</th><th>備考</th></tr>";
}


window.onload=function(){
    document.view=new View();
};
