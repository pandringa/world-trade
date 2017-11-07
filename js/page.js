Array.prototype.max = function() {
  var max = -999999999999999999;
  for(var i of this)
    if(i > max) max = i;
  return max;
}

var TIMELINE_WIDTH = $('#timeline').width();
var STARTYEAR = 1962.0;
var ENDYEAR = 2016.0;
var FLOW = 'm';
var LIMIT = 1;
var CURRENT_COUNTRY_DATA = null;
var CURRENT_COUNTRY = null;
var YEAR_INTERVAL = 5;
var OFFSET = 5; // Offset timeline 5px from start
var ROW_COUNT = 10;
var COUNTRY_INDEX = {};

function renderYears(start, end){
  var years = [...Array(end-start).keys()].map(n => n + start).filter(n => n % YEAR_INTERVAL == 0);

  var labels = d3.select('.timeline-years')
    .selectAll('span.year')
    .data(years, d => d+CURRENT_COUNTRY);

  labels.style('left', year => {
        return getX(year);
      })

  labels.exit().remove();

  labels.enter()
      .append('span')
      .attr('class', 'year')
      .style('left', year => {
        return getX(year);
      })
      .text(year => year);
}
function calcWidth(amount){
  return Math.floor(5 * amount / 90000000)+1;
}
function calcColor(amount, flow){
  var a = amount / 200000000 + 0.4;
  return flow == 'x' ? 'rgba(43,102,144,'+a+')' : 'rgba(43,102,144,'+a+')';
}
function renderMap(map, data, country, year, flowDir, lim){
  $('#timeline .bar').css('padding-left', getX(year));
  if(data[year]){
    var arcs = Object.keys(data[year]).map(partner => {
        var amount = data[year][partner][flowDir]
        if(amount == undefined) return false;
        return {
          origin: flowDir == 'x' ? country : partner, 
          destination: flowDir == 'x' ? partner : country,
          strokeWidth: calcWidth(amount),
          strokeColor: calcColor(amount, flowDir),
          amount: amount,
        }
      })
      .filter(d => d)
      .sort((t1, t2) => t2.amount - t1.amount)
    if(lim){
      lim = lim <= 1 ? lim * arcs.length : lim;
      arcs = arcs.slice(0, lim)
    }
    var options = { 
      idFunction: a => a.origin + a.destination
    };
    $('#current-year').text(year);
    map.arc(arcs, options);
  }else{
    console.log("No data for year", year)
  }
}
function renderTable(data, count){
  var year = getClosestYear(parseInt($('#timeline .bar').css('padding-left')));
  var rows = Object.keys(data[year]).map(code => {
    return {
      name: COUNTRY_INDEX[code],
      imports: data[year][code].m || 0,
      exports: data[year][code].x || 0
    }
  }).sort((a,b) => {
    return (b.exports+b.imports) - (a.exports+a.imports)
  })

  if(count != 'all' && parseInt(count) > 0 && parseInt(count) <= rows.length){
    rows = rows.slice(0, parseInt(count))
  }

  var table = d3.select('#country-table tbody')
    .selectAll('tr')
    .data(rows, d => CURRENT_COUNTRY+d.name+d.imports+d.exports)

  table.exit().remove()

  var row = table.enter().append('tr')
  row.append('td').text(d => d.name)
  row.append('td').text(d => Math.round(d.imports / 1000))
  row.append('td').text(d => Math.round(d.exports / 1000))

  $('#country-name').text(COUNTRY_INDEX[CURRENT_COUNTRY]);
  $('#data-year').text(year);
}
function updateCountry(map, country){
  while($('.datamaps-subunit.selected')[0]) $('.datamaps-subunit.selected').removeClass('selected');
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
    renderYears(STARTYEAR, ENDYEAR)
    var currentYear = getClosestYear(parseInt($('#timeline .bar').css('padding-left')));
    renderMap(map, data, country, currentYear, FLOW, LIMIT);
    renderTable(data, ROW_COUNT)
    $('#country-search').dropdown("set selected", country);
    $('#row-count').dropdown("set selected", ROW_COUNT)
  });
}

function getX(year) {
  return (year-STARTYEAR) / (ENDYEAR-STARTYEAR) * (TIMELINE_WIDTH-OFFSET) + OFFSET;
}
function getClosestYear(x){
  var guess = Math.round((x-OFFSET) /  (TIMELINE_WIDTH-OFFSET) * (ENDYEAR - STARTYEAR) + STARTYEAR);
  if(!CURRENT_COUNTRY_DATA || CURRENT_COUNTRY_DATA[guess]) return guess;
  var up = guess, down = guess;
  while(up <= ENDYEAR && CURRENT_COUNTRY_DATA[up] == undefined) up++;
  while(down >= STARTYEAR && CURRENT_COUNTRY_DATA[down] == undefined) down--;
  return (up - guess) < (down - guess) ? up : down;
}
function stepUpYear(year){
  year++;
  while(CURRENT_COUNTRY_DATA && year <= ENDYEAR && CURRENT_COUNTRY_DATA[year] == undefined) year++;
  return year;
}
function stepDownYear(year){
  year--;
  while(CURRENT_COUNTRY_DATA && year >= STARTYEAR && CURRENT_COUNTRY_DATA[year] == undefined) year--;
  return year;
}


$(document).ready(() => {
  var map = new Datamap({
    element: document.getElementById('datamap'),
    responsive: true,
    projection: 'mercator',
    fills: {
        defaultFill: 'rgba(212,223,239,1)',
    },
    geographyConfig: {
      highlightFillColor: '#C0C1C2',
      highlightBorderColor: '#C0C1C2',
    },
    done: datamap => {
      datamap.svg.selectAll('.datamaps-subunit').on('click', geo => updateCountry(datamap, geo.id))
    }
  });
  updateCountry(map, 'USA');

  $('#country-search')
  .dropdown({
    action: 'activate',
    onChange: code => updateCountry(map, code)
  });

  $('#row-count').dropdown({
    action: 'activate',
    onChange: count => {
      ROW_COUNT = count;
      renderTable(CURRENT_COUNTRY_DATA, ROW_COUNT);
    }
  })

  $('.ui.buttons .button').click((e) => {
    $(e.target).siblings('.active').removeClass('active');
    $(e.target).addClass('active');
    FLOW = $(e.target).data('flow') || FLOW;
    LIMIT = $(e.target).data('limit') || LIMIT;
    renderMap(map, CURRENT_COUNTRY_DATA, CURRENT_COUNTRY, currentYear, FLOW, LIMIT);
  });

  window.addEventListener('resize', e => map.resize());

  var timelineClick = false,
      timelineLeft = 0,
      currentYear = getClosestYear(parseInt($('#timeline .bar').css('padding-left')));
  $('#timeline').mousedown(e => {
    timelineClick = true;
    timelineLeft = e.screenX - e.offsetX;
    currentYear = getClosestYear(e.screenX-timelineLeft);
    renderTable(CURRENT_COUNTRY_DATA, ROW_COUNT)
    renderMap(map, CURRENT_COUNTRY_DATA, CURRENT_COUNTRY, currentYear, FLOW, LIMIT)
  });
  $(document).mouseup(e => {
    timelineClick = false;
  });
  $(document).mousemove(e => {
    if(timelineClick == false) return;
    currentYear = getClosestYear(e.screenX-timelineLeft);
    renderTable(CURRENT_COUNTRY_DATA, ROW_COUNT)
    renderMap(map, CURRENT_COUNTRY_DATA, CURRENT_COUNTRY, currentYear, FLOW, LIMIT)
  });

  $('.timeline-buttons .stepUp').click(e => {
    currentYear = stepUpYear(currentYear);
    renderMap(map, CURRENT_COUNTRY_DATA, CURRENT_COUNTRY, currentYear, FLOW, LIMIT)
    renderTable(CURRENT_COUNTRY_DATA, ROW_COUNT)
  });
  $('.timeline-buttons .stepDown').click(e => {
    currentYear = stepDownYear(currentYear);
    renderMap(map, CURRENT_COUNTRY_DATA, CURRENT_COUNTRY, currentYear, FLOW, LIMIT)
    renderTable(CURRENT_COUNTRY_DATA, ROW_COUNT)
  });

  $('.timeline-buttons .reset').click(e => {
    currentYear = STARTYEAR;
    renderMap(map, CURRENT_COUNTRY_DATA, CURRENT_COUNTRY, currentYear, FLOW, LIMIT)
    renderTable(CURRENT_COUNTRY_DATA, ROW_COUNT)
  });

  var playTimer = false;
  $('.timeline-buttons .play-pause').click(e => {
    $('.play-pause i').toggleClass('icon-play');
    $('.play-pause i').toggleClass('icon-pause');
    
    if(!playTimer){
      if(currentYear == ENDYEAR) $('.timeline-buttons .reset').click();
      playTimer = setInterval(() => {
        currentYear = stepUpYear(currentYear);
        renderMap(map, CURRENT_COUNTRY_DATA, CURRENT_COUNTRY, currentYear, FLOW, LIMIT);
        if(currentYear == ENDYEAR) $(e.target).click();
      }, 90);
    }else{
      clearInterval(playTimer);
      playTimer = false;
      renderTable(CURRENT_COUNTRY_DATA, ROW_COUNT)
    }
  });
});


// Country Select Dropdown
$.ajax({
  url: 'data/countries/index.json'
}).done(countries => {
  COUNTRY_INDEX = countries;
  $dropdown = $('#country-search .menu');
  for(var code of Object.keys(countries).sort()){
    $dropdown.append("<div class='item' data-value='"+code+"'>"+countries[code]+"</div>");
  }
  $('#country-search').removeClass('loading');
});
