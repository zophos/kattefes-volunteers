//
// calendar.js
//
//
// Time-stamp: <2019-10-30 09:34:11 zophos>
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
    el.classList.remove('open');
    el.classList.remove('closed');
    el.classList.remove('canceld');
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

    if('status' in body)
	el.classList.add(body['status']);

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

