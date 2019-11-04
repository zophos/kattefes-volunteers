Calendar.prototype.set_cell_content=function(date,body)
{
    var el=this.cell(date);
    if(!el)
	return;

    el.classList.remove('open');
    el.classList.remove('closed');
    el.classList.remove('canceled');
    el.removeAttribute('data-you');
    el.removeAttribute('data-note');

    var td=el.getElementsByTagName('td')[0]
    if(!td)
	return;

    if('all' in body){
	var n=parseInt(body['all'],10)
	if(n>0){
	    td.innerText=n;
	    if(body['all']>=4)
		td.classList.add('go');
	}
    }
    else{
	td.innerText='';
	return;
    }

    if('status' in body)
	el.classList.add(body['status']);

    if('you' in body && body['you']>0){
	td.classList.add('you');
	el.setAttribute('data-you',body['you']);

	if('note' in body && body['note'])
	    el.setAttribute('data-note',body['note']);
    }

}
