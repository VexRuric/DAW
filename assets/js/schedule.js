/* DAW Warehouse — Schedule JS */

// Transform Supabase show data into UI format
// SHOWS_BY_YEAR is injected from PHP
function transformShowsData() {
  const PPV_SCHEDULE = {};
  const AIRED_SHOWS = {};

  if (window.SHOWS_BY_YEAR) {
    for (const [year, shows] of Object.entries(window.SHOWS_BY_YEAR)) {
      if (!shows.length) continue;

      // Initialize year
      PPV_SCHEDULE[year] = {};
      AIRED_SHOWS[year] = { aired: [] };

      for (const show of shows) {
        const date = new Date(show.show_date);
        const month = date.getMonth() + 1;
        const dateStr = show.show_date;

        // Add to aired shows list
        AIRED_SHOWS[year].aired.push(dateStr);

        // If it's a PPV, add to PPV_SCHEDULE
        if (show.show_type === 'ppv' && show.ppv_name) {
          PPV_SCHEDULE[year][month] = show.ppv_name;
        }
      }
    }
  }

  return { PPV_SCHEDULE, AIRED_SHOWS };
}

// Get transformed data
const { PPV_SCHEDULE, AIRED_SHOWS } = transformShowsData();

// UI Constants
const MONTH_CLASSES=['','ppv-jan','ppv-feb','ppv-mar','ppv-apr','ppv-may','ppv-jun','ppv-jul','ppv-aug','ppv-sep','ppv-oct','ppv-nov','ppv-dec'];
const MONTH_COLORS=['','#e040fb','#f06292','#ef5350','#ff7043','#ffca28','#66bb6a','#26c6da','#42a5f5','#7e57c2','#ff6e40','#ab47bc','#26a69a'];
const MONTH_NAMES=['','January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES=['Su','Mo','Tu','We','Th','Fr','Sa'];
const TODAY=new Date();
const TODAY_STR=`${TODAY.getFullYear()}-${String(TODAY.getMonth()+1).padStart(2,'0')}-${String(TODAY.getDate()).padStart(2,'0')}`;
const dot=document.getElementById('cursorDot');

function daysInMonth(y,m){return new Date(y,m,0).getDate();}
function firstDayOfMonth(y,m){return new Date(y,m-1,1).getDay();}
function allFridays(y,m){const f=[];const d=daysInMonth(y,m);for(let i=1;i<=d;i++)if(new Date(y,m-1,i).getDay()===5)f.push(i);return f;}
function lastFriday(y,m){const f=allFridays(y,m);return f[f.length-1];}
function ds(y,m,d){return`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}

function renderYear(year){
  const ppvs=PPV_SCHEDULE[year]||{};
  const aired=new Set(AIRED_SHOWS[year]?.aired||[]);
  const todayDate=new Date(TODAY_STR);
  const leg=document.getElementById('ppvLegend');
  const ppvMonths=Object.keys(ppvs).map(Number).sort((a,b)=>a-b);
  leg.innerHTML=ppvMonths.length?`<span class="ppv-legend-label">PPV Events</span><div class="ppv-legend-items">${ppvMonths.map(m=>`<span class="ppv-pill ${MONTH_CLASSES[m]}" style="--ppv-color:${MONTH_COLORS[m]}"><span class="pip"></span>${ppvs[m]}</span>`).join('')}</div>`:`<span class="ppv-legend-label" style="color:var(--text-dim)">No PPVs for ${year}</span>`;
  const startM=year===2022?3:1;
  const months=[];for(let m=startM;m<=12;m++)months.push(m);
  const upcoming=[];
  for(const m of months){const fri=allFridays(year,m);const ppvDay=lastFriday(year,m);for(const d of fri){const dstr=ds(year,m,d);if(new Date(year,m-1,d)>=todayDate)upcoming.push({ds:dstr,month:m,day:d,isPPV:!!ppvs[m]&&d===ppvDay,ppvName:ppvs[m]||null});}}
  upcoming.sort((a,b)=>a.ds.localeCompare(b.ds));
  const next=upcoming.slice(0,8);
  const calHtml=months.map(m=>{
    const hasPPV=ppvs[m];const ppvDay=hasPPV?lastFriday(year,m):null;
    const fridays=new Set(allFridays(year,m));const firstDow=firstDayOfMonth(year,m);
    const total=daysInMonth(year,m);const cls=MONTH_CLASSES[m];const color=MONTH_COLORS[m];
    let cells='';
    for(const d of DAY_NAMES)cells+=`<div class="cal-head">${d}</div>`;
    for(let i=0;i<firstDow;i++)cells+=`<div class="cal-cell empty"></div>`;
    for(let d=1;d<=total;d++){
      const dstr=ds(year,m,d);const isFri=fridays.has(d);const isPPV=hasPPV&&d===ppvDay;
      const isToday=dstr===TODAY_STR;const isPast=new Date(year,m-1,d)<todayDate;
      let cc='cal-cell';let style='';let label='';
      if(isPPV){cc+=` ppv-show ${cls}`;style=`style="--ppv-color:${color}"`;label=`<div class="cal-show-label">${ppvs[m].split(' ')[0].toUpperCase()}</div>`;}
      else if(isFri){cc+=' daw-show';label=`<div class="cal-show-label">DAW</div>`;}
      if(isToday)cc+=' today';
      if(isPast&&(isFri||isPPV))cc+=' past-show';
      cells+=`<div class="${cc}" ${style}><span class="cal-num">${d}</span>${label}</div>`;
    }
    return`<div class="month-block"><div class="month-header"><div class="month-name">${MONTH_NAMES[m]}</div>${hasPPV?`<div class="month-ppv-tag ${cls}" style="--ppv-color:${color}">${hasPPV}</div>`:''}</div><div class="cal">${cells}</div></div>`;
  }).join('');
  const upHtml=next.length?`<div class="upcoming-section"><div class="upcoming-label">Upcoming Shows</div><div class="upcoming-list">${next.map(s=>{const cls=MONTH_CLASSES[s.month];const color=MONTH_COLORS[s.month];const label=new Date(s.ds).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});const title=s.isPPV?s.ppvName:'DAW Weekly';const rowCls=s.isPPV?`upcoming-row ppv-row ${cls}`:'upcoming-row daw-row';return`<a href="#" class="${rowCls}" style="--ppv-color:${s.isPPV?color:'var(--purple)'}"><div class="upcoming-date">${label}</div><div class="upcoming-type ${s.isPPV?'ppv':'weekly'}">${s.isPPV?'PPV':'Weekly'}</div><div class="upcoming-title">${title}</div><span class="upcoming-arrow">→</span></a>`;}).join('')}</div></div>`:'' ;
  document.getElementById('scheduleBody').innerHTML=`<div class="months-grid">${calHtml}</div>${upHtml}`;
  if(dot)document.querySelectorAll('.upcoming-row,.ppv-pill').forEach(el=>{el.addEventListener('mouseenter',()=>dot.classList.add('hover'));el.addEventListener('mouseleave',()=>dot.classList.remove('hover'));});
}

let currentYear=2025;
document.querySelectorAll('.year-tab').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.year-tab').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');currentYear=parseInt(btn.dataset.year);renderYear(currentYear);
  });
  if(dot){btn.addEventListener('mouseenter',()=>dot.classList.add('hover'));btn.addEventListener('mouseleave',()=>dot.classList.remove('hover'));}
});
renderYear(2025);
