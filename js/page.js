Array.prototype.max = function() {
  var max = -999999999999999999;
  for(var i of this)
    if(i > max) max = i;
  return max;
}

var TIMELINE_WIDTH = $('#timeline').width();
var STARTYEAR = 1962.0;
var ENDYEAR = 2016.0;
var FLOW = 'Exports';
var CUTOFF = 1000;
var CURRENT_COUNTRY_DATA = null;
var CURRENT_COUNTRY = null;

function selectData(trade, flow){
  if(flow.toLowerCase() == 'net'){
    return trade['x'] - trade['m'];
  } else {
    if(flow.length > 1) flow = flow.toLowerCase().substring(1,2);
    return trade[flow];
  }
}
function calcWidth(amount){
  return parseInt(5 * amount / 90000000)+1;
}
function calcColor(amount, flow){
  if(flow.length > 1) flow = flow.substring(1,2);
  var a = amount / 200000000 + 0.4;
  return flow == 'x' ? 'rgba(0,200,0,'+a+')' : 'rgba(200,0,0,'+a+')';
}
function renderMap(map, data, country, year){
  var FLOW = 'Exports';
  var LIMIT = 0.25;
  $('#timeline .bar').css('padding-left', getX(year));
  if(data[year]){
    var arcs = Object.keys(data[year]).map(partner => {
        var amount = selectData(data[year][partner], FLOW);
        if(amount == undefined) return false;
        return {
          origin: country, 
          destination: partner,
          strokeWidth: calcWidth(amount),
          strokeColor: calcColor(amount, FLOW),
          amount: amount,
        }
      })
      .filter(d => d)
      .sort((t1, t2) => t2.amount - t1.amount)
    if(LIMIT != false){
      var lim = LIMIT < 1 ? LIMIT * arcs.length : LIMIT;
      arcs = arcs.slice(0, lim)
    }
    console.log(arcs);
    map.arc(arcs);
  }else{
    console.log("No data for year", year)
  }
}
function updateCountry(map, country){
  $('#country-search').dropdown("set selected", country);
  $('.datamaps-subunit.selected').removeClass('selected');
  $('.datamaps-subunit.'+country).addClass('selected');
  $.ajax({
    url: 'data/countries/'+country+'.json'
  }).fail(err => {
    console.log("no results");
  }).done(data => {
    if(data == undefined || data == null) return;
    CURRENT_COUNTRY_DATA = data;
    CURRENT_COUNTRY = country;
    ENDYEAR = 0;
    STARTYEAR = 3000;
    for(var year of Object.keys(data)){
      year = parseInt(year)
      if(year > ENDYEAR) ENDYEAR = year;
      if(year < STARTYEAR) STARTYEAR = year;
    }
    renderMap(map, data, country, year);
  });
}

function getX(year) {
  return (year-STARTYEAR) / (ENDYEAR-STARTYEAR) * TIMELINE_WIDTH;
}
function getClosestYear(x){
  var guess = Math.round(x /  TIMELINE_WIDTH * (ENDYEAR - STARTYEAR) + STARTYEAR);
  if(!CURRENT_COUNTRY_DATA || CURRENT_COUNTRY_DATA[guess]) return guess;
  var up = guess, down = guess;
  while(up <= ENDYEAR && CURRENT_COUNTRY_DATA[up] == undefined) up++;
  while(down >= STARTYEAR && CURRENT_COUNTRY_DATA[down] == undefined) down--;
  return (up - guess) < (down - guess) ? up : down;
}


$(document).ready(() => {
  var map = new Datamap({
    element: document.getElementById('datamap'),
    responsive: true,
    projection: 'mercator',
    fills: {
        defaultFill: 'rgba(33,133,208,0.4)',
    },
    geographyConfig: {
      highlightFillColor: 'rgba(33,133,208,1)',
      highlightBorderColor: 'rgba(33,133,208,1)',
    },
    done: datamap => {
      datamap.svg.selectAll('.datamaps-subunit').on('click', geo => updateCountry(datamap, geo.id))
    }
  });
  updateCountry(map, 'USA');

  $('#country-search')
  .dropdown({
    action: 'activate',
    onChange: (code) => updateCountry(map, code)
  });

  $('.ui.buttons .button').click((e) => {
    $(e.target).siblings('.active').removeClass('active');
    $(e.target).addClass('active');
  });

  window.addEventListener('resize', e => map.resize());

  var timelineClick = false,
      timelineLeft = 0,
      currentYear = getClosestYear(parseInt($('#timeline .bar').css('padding-left')));
  $('#timeline').mousedown(e => {
    timelineClick = true;
    timelineLeft = e.screenX - e.offsetX;
    currentYear = getClosestYear(e.screenX-timelineLeft);
    requestAnimationFrame(() => renderMap(map, CURRENT_COUNTRY_DATA, CURRENT_COUNTRY, currentYear));
  });
  $(document).mouseup(e => {
    timelineClick = false;
  });
  $(document).mousemove(e => {
    if(timelineClick == false) return;
    currentYear = getClosestYear(e.screenX-timelineLeft);
    requestAnimationFrame(() => renderMap(map, CURRENT_COUNTRY_DATA, CURRENT_COUNTRY, currentYear));
  });
});


// Country Select Dropdown
$.ajax({
  url: 'data/countries/index.json'
}).done(countries => {
  $dropdown = $('#country-search .menu');
  for(var code of Object.keys(countries).sort()){
    $dropdown.append("<div class='item' data-value='"+code+"'>"+countries[code]+"</div>");
  }
  $('#country-search').removeClass('loading');
});