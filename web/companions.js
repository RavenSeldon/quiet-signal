/* A small field guide. Changing a companion changes presentation only. */
(function(){
  const pets=globalThis.QUIET_PETS;
  let saved;try{saved=localStorage.getItem('quiet-signal-companion');}catch(_){}
  let current=pets.find(p=>p.id===saved)||pets[0];
  const select=document.getElementById('companion-select');
  const gallery=document.getElementById('companion-gallery');
  const buttons=[];
  for(const pet of pets){
    const option=document.createElement('option');option.value=pet.id;option.textContent=pet.shortName;select.append(option);
    const button=document.createElement('button');button.type='button';button.className='companion-card';button.dataset.pet=pet.id;
    button.setAttribute('aria-label',`Choose ${pet.name} as your companion`);
    const plate=document.createElement('span');plate.className='plate-number';plate.textContent=`VOL. ${pet.volume} / ${String(pet.plate).padStart(2,'0')}`;
    const sprite=document.createElement('span');sprite.className='pet-thumbnail';sprite.style.backgroundImage=`url("${pet.sheet}")`;sprite.setAttribute('aria-hidden','true');
    const name=document.createElement('strong');name.textContent=pet.shortName;
    const check=document.createElement('span');check.className='companion-check';check.setAttribute('aria-hidden','true');
    button.append(plate,sprite,name,check);button.onclick=()=>choose(pet.id,true);gallery.append(button);buttons.push(button);
  }
  function choose(id,announce=false){
    current=pets.find(p=>p.id===id)||pets[0];select.value=current.id;
    const pet=document.getElementById('pet');pet.style.backgroundImage=`url("${current.sheet}")`;
    pet.style.backgroundPosition='0px -1248px';pet.setAttribute('aria-label',`${current.name}. ${current.description}`);
    document.getElementById('pet-name').textContent=`${current.shortName} / THE HATCHERY`;
    document.getElementById('companion-description').textContent=(current.name!==current.shortName?current.name+'. ':'')+current.description;
    document.getElementById('companion-plate').textContent=`VOLUME ${current.volume} · PLATE ${String(current.plate).padStart(2,'0')}`;
    document.getElementById('companion-record').href=current.record;
    document.getElementById('companion-home').href=current.url;
    for(const b of buttons){const active=b.dataset.pet===id;b.setAttribute('aria-pressed',String(active));b.querySelector('.companion-check').textContent=active?'WITH YOU':'INVITE';}
    if(announce)document.getElementById('companion-announcement').textContent=`${current.name} joins the observatory. The world and experimental results are unchanged.`;
    try{localStorage.setItem('quiet-signal-companion',current.id);}catch(_){}
    document.dispatchEvent(new Event('quiet:companion'));
  }
  select.onchange=()=>choose(select.value,true);
  globalThis.QuietCompanion={get current(){return current;},frames:row=>current.frames[String(row)]||1};
  choose(current.id);
})();
