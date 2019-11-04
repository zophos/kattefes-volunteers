//
// view_common.js
//
//
// Time-stamp: <2019-11-04 22:11:59 zophos>
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
    this._RELOAD_DURATION=300000; // 5min
    this._reload_timer=null;

    this.calendar=new Calendar(document.getElementById('cal-div'),
			       {'class':'cal'});

    if(typeof(this._setup)=="function")
	this._setup();

    var queries=this._split_queries();
    var y=null;
    var m=null;
    var re=/([0-9]{4})([0-1][0-9])/;
    Object.keys(queries).find((k)=>{
	var match=k.match(re);
	if(match){
	    y=match[1];
	    m=match[2];
	    return true;
	}
    },this);
    if(y&&m){
	var _date=new Date(y,m-1,1);

	this.calendar.draw(_date.getFullYear(),_date.getMonth());
    }
    else
	this.calendar.draw();
}

View.prototype.hide_dialog=function()
{
    var el=document.getElementById('overray')
    el.style.display='none';
    el.innerHTML=null;
}

View.prototype._prepair_draw_dialog=function(html)
{
    var el=document.getElementById('overray');
    el.style.paddingTop='0px';
    el.style.height='100%';
    el.innerHTML=html;
    el.style.display='block';

    dialog=el.getElementsByTagName('div')[0];
    if(!dialog)
	return;

    var rect=dialog.getClientRects()[0];
 
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
View.prototype._split_queries=function()
{
    var ret={};
    if(!window.location.search)
	return ret;

    var queries=window.location.search.slice(1);
    if(!queries)
	return ret;

    queries.split('&').forEach((query)=>{
	var q=query.split('=');
	if(q[1])
	    ret[q[0].trim()]=q[1].trim()
	else
	    ret[q[0].trim()]=q[1]
    })

    return ret;
}
