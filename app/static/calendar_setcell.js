Calendar.prototype.set_cell_content=function(date,body)
{
    var el=this.cell(date);
    if(!el)
	return;
    el.classList.remove('open');
    el.classList.remove('closed');
    el.classList.remove('canceld');
    el.removeAttribute('data-you');
    el.removeAttribute('data-note');

    var td=el.getElementsByTagName('td')[0]
    if(!td)
	return;

    if('all' in body){
	td.innerText=parseInt(body['all'],10);
	if(body['all']>=4)
	    td.classList.add('go');
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
