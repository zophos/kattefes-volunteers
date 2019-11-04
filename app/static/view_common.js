//
// view_common.js
//
//
// Time-stamp: <2019-11-04 09:48:06 zophos>
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
